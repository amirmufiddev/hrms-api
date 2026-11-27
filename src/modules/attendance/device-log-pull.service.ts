import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PunchIngestService } from './punch-ingest.service';
import { DevicePaceError } from './device/device-directory.client';
import { DeviceLogClient } from './device/device-log-client';
import { normalizeDeviceLog } from './device/device-log-record';
import { DevicePace } from './device/device-pace';

const BATCH = 500;

type PullDevice = {
  id: string;
  tenantId: string;
  code: string;
  serialNumber: string;
  host: string;
  webPort: number;
  webPassword: string | null;
};

@Injectable()
export class DeviceLogPullService {
  private chain: Promise<void> = Promise.resolve();

  constructor(
    private readonly prisma: PrismaService,
    private readonly logs: DeviceLogClient,
    private readonly ingest: PunchIngestService,
    private readonly pace: DevicePace = new DevicePace(),
  ) {}

  pullOnce(): Promise<void> {
    const run = this.chain.then(() => this.pullAll());
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  list(tenantId: string) {
    return this.prisma.attendanceDevice
      .findMany({
        where: { tenantId, active: true, deletedAt: null },
        select: { id: true, code: true, lastPulledAt: true, lastPullError: true },
        orderBy: { code: 'asc' },
      })
      .then((devices) => ({ devices }));
  }

  private async pullAll() {
    const devices = (await this.prisma.attendanceDevice.findMany({
      where: { active: true, deletedAt: null },
    })) as PullDevice[];
    for (const device of devices) {
      await this.pullDevice(device);
    }
  }

  private async pullDevice(device: PullDevice) {
    if (!device.host.trim() || device.webPort < 1 || !device.webPassword?.trim()) {
      await this.markError(device.id, 'DEVICE_NOT_CONFIGURED');
      return;
    }
    const endpoint = { host: device.host, webPort: device.webPort, password: device.webPassword };
    const from = this.pace.logFrom(device.id);
    let pulled;
    try {
      pulled = await this.logs.getLogs(endpoint, { deviceId: device.id, from, maxPages: 10 });
    } catch (error) {
      if (error instanceof DevicePaceError && error.reason === 'QUIET') return;
      await this.markError(device.id, pullError(error));
      return;
    }
    this.pace.setLogFrom(device.id, pulled.done ? 0 : pulled.nextFrom);
    const punches = pulled.rows.flatMap((row) => {
      const punch = normalizeDeviceLog(row);
      return punch ? [punch] : [];
    });
    try {
      for (let index = 0; index < punches.length; index += BATCH) {
        await this.ingest.ingest(device.tenantId, {
          deviceCode: device.code,
          serialNumber: device.serialNumber,
          punches: punches.slice(index, index + BATCH),
        });
      }
    } catch (error) {
      await this.markError(device.id, error instanceof Error ? error.message : 'INGEST_FAILED');
      return;
    }
    if (!pulled.done) return;
    await this.prisma.attendanceDevice.update({
      where: { id: device.id },
      data: { lastPulledAt: new Date(), lastPullError: null },
    });
  }

  private markError(id: string, lastPullError: string) {
    return this.prisma.attendanceDevice.update({ where: { id }, data: { lastPullError } });
  }
}

function pullError(error: unknown): string {
  const message = error instanceof Error ? error.message : 'DEVICE_OFFLINE';
  return message === 'DEVICE_REJECTED' ? 'DEVICE_REJECTED' : 'DEVICE_OFFLINE';
}
