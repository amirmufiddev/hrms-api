import { Injectable, Logger, ServiceUnavailableException } from '@nestjs/common';
import { DeviceCommandGate } from './device-command-gate';
import { DevicePace, PaceKind } from './device-pace';
import { DevicePushSession } from './device-push.session';

export type DeviceEndpoint = { host: string; webPort: number; password: string };

export type DeviceUserRow = { enrollId: string; name: string; card: string; face?: number; fingerprint?: number; verifymode?: number };

export class DevicePaceError extends Error {
  constructor(
    readonly reason: 'QUIET' | 'BUDGET' | 'MANUAL_USED',
    readonly quietUntil: Date | null,
  ) {
    super(reason);
    this.name = 'DevicePaceError';
  }
}

type DeviceReply = {
  result?: boolean;
  msg?: string;
  count?: number;
  to?: number;
  record?: unknown;
  enrollid?: string | number;
  name?: string;
  card?: string | number;
  face?: string | number;
  faceflag?: string | number;
  fingerprint?: string | number;
  verifymode?: string | number;
};

type WriteRoute = { kind: 'socket'; body: Record<string, unknown> } | { kind: 'http' } | { kind: 'skip' };

function routeWrite(body: Record<string, unknown>): WriteRoute {
  if (body.cmd !== 'setuserinfo') return { kind: 'http' };
  const backupnum = body.backupnum;
  if (typeof backupnum === 'number' && backupnum >= 0 && backupnum <= 9) return { kind: 'skip' };
  if (backupnum === 50) return { kind: 'socket', body };
  if (backupnum === undefined && Object.prototype.hasOwnProperty.call(body, 'card')) {
    const enrollid = Number(body.enrollid);
    const name = typeof body.name === 'string' ? body.name : '';
    const socketBody: Record<string, unknown> = {
      cmd: 'setuserinfo',
      enrollid: Number.isSafeInteger(enrollid) && enrollid > 0 ? enrollid : body.enrollid,
      backupnum: 11,
      admin: 0,
      record: body.card,
    };
    if (name) socketBody.name = name;
    return { kind: 'socket', body: socketBody };
  }
  return { kind: 'http' };
}

function commandLabel(endpoint: DeviceEndpoint, body: Record<string, unknown>): string {
  const record = typeof body.record === 'string' ? body.record : '';
  const name = typeof body.name === 'string' ? body.name : '';
  return [
    `cmd=${String(body.cmd)}`,
    `host=${endpoint.host}`,
    `enrollid=${typeof body.enrollid}:${String(body.enrollid ?? '')}`,
    `backupnum=${String(body.backupnum ?? '-')}`,
    `nameBytes=${Buffer.byteLength(name)}`,
    `recordBytes=${Buffer.byteLength(record)}`,
    `keys=${Object.keys(body).join(',')}`,
  ].join(' ');
}

function isCardWrite(body: Record<string, unknown>): boolean {
  return body.cmd === 'setuserinfo' && body.backupnum === undefined && Object.prototype.hasOwnProperty.call(body, 'card');
}

function isDeviceOffline(error: unknown): boolean {
  return error instanceof ServiceUnavailableException && error.message.includes('DEVICE_OFFLINE');
}

function countOf(value: string | number | undefined): number {
  const count = Number(value ?? 0);
  if (!Number.isFinite(count) || count < 0) return 0;
  return Math.floor(count);
}

function countIfPresent(value: unknown): number | undefined {
  if (value === undefined || value === null || value === '') return undefined;
  const count = Number(value);
  if (!Number.isFinite(count) || count < 0) return undefined;
  return Math.floor(count);
}

@Injectable()
export class DeviceDirectoryClient {
  private readonly logger = new Logger(DeviceDirectoryClient.name);

  constructor(
    private readonly gate: DeviceCommandGate,
    private readonly pace: DevicePace,
    private readonly sockets: DevicePushSession,
  ) {}

  async listUsers(deviceId: string, kind: PaceKind, endpoint: DeviceEndpoint): Promise<DeviceUserRow[]> {
    const rows: DeviceUserRow[] = [];
    let stn = 1;
    for (let page = 0; page < 50; page += 1) {
      const body = await this.command(deviceId, kind, endpoint, { cmd: 'getuserlist', stn }, 20000);
      if (body.result === false) break;
      const records = Array.isArray(body.record) ? body.record : [];
      for (const row of records) {
        const item = row as {
          id?: string | number;
          card?: string | number;
          name?: string;
          face?: string | number;
          fingerprint?: string | number;
        };
        if (item.id === undefined || item.id === null || item.id === '') continue;
        rows.push({
          enrollId: String(item.id),
          name: String(item.name ?? ''),
          card: String(item.card ?? ''),
          face: countOf(item.face),
          fingerprint: countOf(item.fingerprint),
        });
      }
      const count = Number(body.count ?? records.length);
      const to = Number(body.to ?? count);
      if (records.length === 0 || to >= count) break;
      stn = 0;
    }
    return rows;
  }

  async getUser(deviceId: string, kind: PaceKind, endpoint: DeviceEndpoint, enrollId: string): Promise<DeviceUserRow> {
    const body = await this.command(deviceId, kind, endpoint, { cmd: 'getuserinfo', enrollid: enrollId }, 8000);
    if (body.result !== true) {
      throw new ServiceUnavailableException(body.msg || 'DEVICE_REJECTED');
    }
    return {
      enrollId: String(body.enrollid ?? enrollId),
      name: String(body.name ?? ''),
      card: String(body.card ?? ''),
      face: body.faceflag === 1 ? 1 : (countIfPresent(body.face) ?? 0),
      fingerprint: countIfPresent(body.fingerprint),
      verifymode: verifyMode(body.verifymode),
    };
  }

  async setUser(
    deviceId: string,
    kind: PaceKind,
    endpoint: DeviceEndpoint,
    user: { enrollid: string; name: string; card: number | string; verifymode?: number },
  ): Promise<void> {
    const body = await this.command(
      deviceId,
      kind,
      endpoint,
      {
        cmd: 'setuserinfo',
        enrollid: user.enrollid,
        name: user.name,
        department: '',
        shiftid: 0,
        admin: 0,
        pwd: 0,
        card: user.card,
        zoneid: 0,
        groupid: 0,
        access_times: 0,
        verifymode: user.verifymode ?? 0,
      },
      8000,
    );
    if (body.result === false) {
      throw new ServiceUnavailableException(body.msg || 'DEVICE_REJECTED');
    }
  }

  async getBackup(
    deviceId: string,
    kind: PaceKind,
    endpoint: DeviceEndpoint,
    enrollId: string,
    backupnum: number,
  ): Promise<string | null> {
    const body = await this.command(deviceId, kind, endpoint, { cmd: 'getuserinfo', enrollid: enrollId, backupnum }, 8000);
    if (body.result !== true) return null;
    const record = typeof body.record === 'string' ? body.record.trim() : '';
    return record || null;
  }

  async setBackup(
    deviceId: string,
    kind: PaceKind,
    endpoint: DeviceEndpoint,
    user: { enrollid: string; name: string; backupnum: number; record: string },
  ): Promise<boolean> {
    const enrollid = Number(user.enrollid);
    const name = user.name.trim();
    const body: Record<string, unknown> = {
      cmd: 'setuserinfo',
      enrollid: Number.isSafeInteger(enrollid) && enrollid > 0 ? enrollid : user.enrollid,
      admin: 0,
      backupnum: user.backupnum,
      record: user.record,
    };
    if (Buffer.byteLength(name) <= 15) body.name = name;
    const timeoutMs = user.backupnum === 50 && user.record.length > 4000 ? 25000 : user.record.length > 4000 ? 15000 : 4000;
    const reply = await this.command(deviceId, kind, endpoint, body, timeoutMs);
    return reply.result === true;
  }

  async deleteUsers(deviceId: string, kind: PaceKind, endpoint: DeviceEndpoint, enrollIds: string[]): Promise<boolean> {
    const body = await this.command(deviceId, kind, endpoint, { cmd: 'deleteusers', list: enrollIds }, 20000);
    return body.result === true;
  }

  private async command(
    deviceId: string,
    kind: PaceKind,
    endpoint: DeviceEndpoint,
    body: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<DeviceReply> {
    const route = routeWrite(body);
    if (route.kind === 'skip') return { result: false };
    const decision = await this.pace.allow(deviceId, kind);
    if (!decision.ok) throw new DevicePaceError(decision.reason, decision.quietUntil);
    const started = this.pace.now();
    try {
      const reply = await this.gate.run(async () => {
        if (route.kind !== 'socket') return this.dispatch(endpoint, body, timeoutMs);
        try {
          return await this.dispatchSocket(endpoint, route.body, timeoutMs);
        } catch (error) {
          if (!isCardWrite(body) || !isDeviceOffline(error)) throw error;
          return this.dispatch(endpoint, body, timeoutMs);
        }
      });
      this.pace.markIfSlow(deviceId, started);
      return reply;
    } catch (error) {
      if (error instanceof ServiceUnavailableException && error.message.includes('DEVICE_OFFLINE')) {
        this.pace.markOffline(deviceId);
      }
      throw error;
    }
  }

  private async dispatchSocket(
    endpoint: DeviceEndpoint,
    body: Record<string, unknown>,
    timeoutMs: number,
  ): Promise<DeviceReply> {
    const label = commandLabel(endpoint, body);
    const started = Date.now();
    this.logger.log(`kirim-soket ${label}`);
    try {
      const reply = (await this.sockets.send(endpoint.host, body, timeoutMs)) as DeviceReply;
      this.logger.log(`jawab-soket ${label} ms=${Date.now() - started} result=${String(reply.result)}`);
      return reply;
    } catch (error) {
      this.logger.warn(`gagal-soket ${label} ms=${Date.now() - started} err=${error instanceof Error ? error.name : 'unknown'}`);
      if (error instanceof ServiceUnavailableException) throw error;
      throw new ServiceUnavailableException('DEVICE_OFFLINE');
    }
  }

  private async dispatch(endpoint: DeviceEndpoint, body: Record<string, unknown>, timeoutMs: number): Promise<DeviceReply> {
    const label = commandLabel(endpoint, body);
    const started = Date.now();
    this.logger.log(`kirim ${label}`);
    let response: Response;
    try {
      response = await fetch(`http://${endpoint.host}:${endpoint.webPort}/api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({ ...body, password: endpoint.password }),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch (error) {
      this.logger.warn(`gagal ${label} ms=${Date.now() - started} err=${error instanceof Error ? error.name : 'unknown'}`);
      throw new ServiceUnavailableException('DEVICE_OFFLINE');
    }
    try {
      const reply = JSON.parse(await response.text()) as DeviceReply;
      this.logger.log(`jawab ${label} ms=${Date.now() - started} http=${response.status} result=${String(reply.result)}`);
      return reply;
    } catch {
      this.logger.warn(`jawab-bukan-json ${label} ms=${Date.now() - started} http=${response.status}`);
      throw new ServiceUnavailableException('DEVICE_OFFLINE');
    }
  }
}

function verifyMode(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^[0-9]+$/.test(value)) return Number(value);
  return undefined;
}
