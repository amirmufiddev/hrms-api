import { Injectable, Logger } from '@nestjs/common';
import { CardPushStatus } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { PunchIngestService } from '../punch-ingest.service';
import { DeviceLogRow, normalizeDeviceLog } from './device-log-record';
import { DeviceDirectorySyncService, enrollIdFromNik } from './device-directory-sync.service';
import { faceSlot } from './directory-bio-status';
import { DevicePushFeed, pushSlotLabel } from './device-push-feed';
import { PushedEnrollment } from './device-push-protocol';

const BATCH = 500;

type PushDevice = {
  id: string;
  tenantId: string;
  code: string;
  serialNumber: string;
  host: string;
};

@Injectable()
export class DevicePushIngestService {
  private readonly logger = new Logger(DevicePushIngestService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly ingest: PunchIngestService,
    private readonly feed: DevicePushFeed,
    private readonly faces: DeviceDirectorySyncService,
  ) {}

  async noteConnection(remoteAddress: string | undefined, serial: unknown): Promise<void> {
    const device = await this.findDevice(remoteAddress, serial);
    this.feed.add({
      tenantId: device?.tenantId ?? null,
      kind: 'reg',
      deviceCode: device?.code ?? '',
      nik: '',
      detail: 'Mesin terhubung',
      ok: Boolean(device),
      message: device ? 'Siap menerima' : 'Mesin tidak dikenal',
    });
  }

  async noteRejected(remoteAddress: string | undefined, serial: unknown): Promise<void> {
    const device = await this.findDevice(remoteAddress, serial);
    this.feed.add({
      tenantId: device?.tenantId ?? null,
      kind: 'senduser',
      deviceCode: device?.code ?? '',
      nik: '',
      detail: 'Pendaftaran',
      ok: false,
      message: 'Data tidak lengkap',
    });
  }

  async accept(remoteAddress: string | undefined, rows: DeviceLogRow[], serial: unknown): Promise<boolean> {
    const device = await this.findDevice(remoteAddress, serial);
    const punches = rows.flatMap((row) => {
      const punch = normalizeDeviceLog(row);
      return punch ? [punch] : [];
    });
    if (!device) {
      this.logger.warn(`Push log tanpa mesin yang cocok dari ${remoteAddress ?? '-'}`);
      this.feed.add({
        tenantId: null,
        kind: 'sendlog',
        deviceCode: '',
        nik: punches[0]?.nik ?? '',
        detail: punches.length > 0 ? `${punches.length} tap` : 'Log kosong',
        ok: false,
        message: 'Mesin tidak dikenal',
      });
      return false;
    }
    try {
      for (let index = 0; index < punches.length; index += BATCH) {
        await this.ingest.ingest(device.tenantId, {
          deviceCode: device.code,
          serialNumber: device.serialNumber,
          punches: punches.slice(index, index + BATCH),
        });
      }
    } catch (error) {
      this.logger.warn(error instanceof Error ? error.message : 'PUSH_INGEST_FAILED');
      this.feed.add({
        tenantId: device.tenantId,
        kind: 'sendlog',
        deviceCode: device.code,
        nik: punches[0]?.nik ?? '',
        detail: punches.length > 0 ? `${punches.length} tap` : 'Log kosong',
        ok: false,
        message: 'Gagal disimpan',
      });
      return false;
    }
    if (punches.length === 0) {
      this.feed.add({
        tenantId: device.tenantId,
        kind: 'sendlog',
        deviceCode: device.code,
        nik: '',
        detail: 'Log kosong',
        ok: false,
        message: 'Data tidak lengkap',
      });
      return true;
    }
    for (const punch of punches) {
      const clock = punch.punchedAt.slice(0, 19).replace('T', ' ');
      this.feed.add({
        tenantId: device.tenantId,
        kind: 'sendlog',
        deviceCode: device.code,
        nik: punch.nik,
        detail: `${punch.verifyMode} ${clock}`,
        ok: true,
        message: 'Tersimpan',
      });
    }
    return true;
  }

  async acceptEnrollment(remoteAddress: string | undefined, enrollment: PushedEnrollment, serial: unknown): Promise<boolean> {
    const device = await this.findDevice(remoteAddress, serial);
    const card = enrollment.record.trim();
    const detail = enrollment.backupnum === 11 && /^[0-9]+$/.test(card) && card !== '0' ? `Kartu ${card}` : pushSlotLabel(enrollment.backupnum);
    if (!device) {
      this.logger.warn(`Push user tanpa mesin yang cocok dari ${remoteAddress ?? '-'}`);
      this.feed.add({
        tenantId: null,
        kind: 'senduser',
        deviceCode: '',
        nik: enrollment.enrollId,
        detail,
        ok: false,
        message: 'Mesin tidak dikenal',
      });
      return false;
    }
    try {
      if (enrollment.backupnum === 10 || (enrollment.backupnum >= 0 && enrollment.backupnum <= 9)) {
        this.noteEnrollment(device, enrollment.enrollId, detail, true, 'Tidak disimpan');
        return true;
      }
      if (enrollment.backupnum === 11) {
        const message = await this.savePushedCard(device, enrollment);
        this.noteEnrollment(device, enrollment.enrollId, detail, true, message);
        return true;
      }
      if (!faceSlot(enrollment.backupnum)) {
        this.noteEnrollment(device, enrollment.enrollId, detail, true, 'Tidak disimpan');
        return true;
      }
      if (!enrollment.record) {
        this.noteEnrollment(device, enrollment.enrollId, detail, false, 'Data tidak lengkap');
        return true;
      }
      await this.prisma.attendanceBiometricTemplate.upsert({
        where: { tenantId_nik_slot: { tenantId: device.tenantId, nik: enrollment.enrollId, slot: enrollment.backupnum } },
        create: {
          tenantId: device.tenantId,
          nik: enrollment.enrollId,
          slot: enrollment.backupnum,
          record: enrollment.record,
          sourceDeviceId: device.id,
        },
        update: { record: enrollment.record, sourceDeviceId: device.id },
      });
      await this.rememberPush(device, enrollment, enrollment.record);
      void this.faces.shareNewFace(device.tenantId, enrollment.enrollId, device.id).catch((error: unknown) => {
        this.logger.warn(error instanceof Error ? error.message : 'FACE_SHARE_FAILED');
      });
      this.noteEnrollment(device, enrollment.enrollId, detail, true, 'Tersimpan');
      return true;
    } catch (error) {
      this.logger.warn(error instanceof Error ? error.message : 'PUSH_USER_FAILED');
      this.noteEnrollment(device, enrollment.enrollId, detail, false, 'Gagal disimpan');
      return false;
    }
  }

  private noteEnrollment(device: PushDevice, nik: string, detail: string, ok: boolean, message: string) {
    this.feed.add({
      tenantId: device.tenantId,
      kind: 'senduser',
      deviceCode: device.code,
      nik,
      detail,
      ok,
      message,
    });
  }

  private async savePushedCard(device: PushDevice, enrollment: PushedEnrollment): Promise<string> {
    const card = enrollment.record.trim();
    await this.rememberPush(device, enrollment, /^[0-9]+$/.test(card) && card !== '0' ? card : '');
    if (!/^[0-9]+$/.test(card) || card === '0') return 'Kartu tidak valid';
    const employees = await this.prisma.employee.findMany({
      where: { tenantId: device.tenantId },
      select: { id: true, employeeCode: true, cardNumber: true },
    });
    const owner = employees.find((employee) => enrollIdFromNik(employee.employeeCode) === enrollment.enrollId);
    if (!owner) return 'NIK belum ada di HRMS';
    const current = owner.cardNumber?.trim() ?? '';
    if (current && current !== '0') return 'Kartu HRMS sudah terisi';
    const taken = employees.some((employee) => employee.id !== owner.id && employee.cardNumber?.trim() === card);
    if (taken) return 'Kartu sudah dipakai NIK lain';
    const deviceUid = Number(enrollment.enrollId);
    await this.prisma.employee.update({
      where: { id: owner.id },
      data: {
        cardNumber: card,
        cardAssignedAt: new Date(),
        cardPushStatus: CardPushStatus.PUSHED,
        deviceUid: Number.isSafeInteger(deviceUid) && deviceUid > 0 ? deviceUid : null,
      },
    });
    return 'Kartu HRMS diisi';
  }

  private async rememberPush(device: PushDevice, enrollment: PushedEnrollment, card: string) {
    const existing = await this.prisma.attendanceDeviceDirectory.findUnique({
      where: { deviceId_nik: { deviceId: device.id, nik: enrollment.enrollId } },
      select: { name: true, card: true, face: true },
    });
    const face = faceSlot(enrollment.backupnum);
    const data = {
      name: enrollment.name || existing?.name || '',
      card: enrollment.backupnum === 11 && card ? card : (existing?.card ?? ''),
      face: face ? 1 : (existing?.face ?? 0),
      fingerprint: 0,
      seenAt: new Date(),
    };
    await this.prisma.attendanceDeviceDirectory.upsert({
      where: { deviceId_nik: { deviceId: device.id, nik: enrollment.enrollId } },
      create: { tenantId: device.tenantId, deviceId: device.id, nik: enrollment.enrollId, ...data },
      update: data,
    });
  }

  private async findDevice(remoteAddress: string | undefined, serial: unknown): Promise<PushDevice | null> {
    const devices = (await this.prisma.attendanceDevice.findMany({
      where: { active: true, deletedAt: null },
      select: { id: true, tenantId: true, code: true, serialNumber: true, host: true },
    })) as PushDevice[];
    const host = (remoteAddress ?? '').replace(/^::ffff:/, '');
    const byHost = host ? devices.find((device) => device.host === host) : undefined;
    if (byHost) return byHost;
    const serialNumber = typeof serial === 'string' ? serial.trim() : '';
    const bySerial = serialNumber ? devices.find((device) => device.serialNumber === serialNumber) : undefined;
    if (bySerial) return bySerial;
    return devices.length === 1 ? devices[0] : null;
  }
}
