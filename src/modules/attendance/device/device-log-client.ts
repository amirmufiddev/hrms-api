import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { DeviceCommandGate } from './device-command-gate';
import { DeviceLogRow } from './device-log-record';
import { DevicePace } from './device-pace';

export type DeviceEndpoint = { host: string; webPort: number; password: string };

type DeviceReply = { result?: boolean; to?: number; count?: number; record?: unknown };

@Injectable()
export class DeviceLogClient {
  constructor(
    private readonly gate: DeviceCommandGate,
    private readonly pace: DevicePace,
  ) {}

  async getLogs(
    endpoint: DeviceEndpoint,
    options: { deviceId: string; from: number; maxPages: number },
  ): Promise<{ rows: DeviceLogRow[]; nextFrom: number; done: boolean }> {
    const { deviceId, maxPages } = options;
    const rows: DeviceLogRow[] = [];
    let from = options.from;
    for (let page = 0; page < maxPages; page += 1) {
      const decision = await this.pace.allow(deviceId, 'auto');
      if (!decision.ok) {
        return { rows, nextFrom: from, done: false };
      }
      let body: DeviceReply;
      const started = this.pace.now();
      try {
        body = await this.command(endpoint, { cmd: 'getlog', from, to: from + 500, password: endpoint.password }, 20000);
        this.pace.markIfSlow(deviceId, started);
      } catch (error) {
        if (error instanceof ServiceUnavailableException && error.message.includes('DEVICE_OFFLINE')) {
          this.pace.markOffline(deviceId);
        }
        throw error;
      }
      if (body.result === false) throw new ServiceUnavailableException('DEVICE_REJECTED');
      const records = Array.isArray(body.record) ? (body.record as DeviceLogRow[]) : [];
      if (records.length === 0) {
        return { rows, nextFrom: from, done: true };
      }
      rows.push(...records);
      const next = Number(body.to ?? from + records.length);
      const count = Number(body.count ?? next);
      if (next <= from || next >= count) {
        return { rows, nextFrom: next, done: true };
      }
      from = next;
    }
    return { rows, nextFrom: from, done: false };
  }

  private command(endpoint: DeviceEndpoint, body: Record<string, unknown>, timeoutMs: number): Promise<DeviceReply> {
    return this.gate.run(() => this.dispatch(endpoint, body, timeoutMs));
  }

  private async dispatch(endpoint: DeviceEndpoint, body: Record<string, unknown>, timeoutMs: number): Promise<DeviceReply> {
    let response: Response;
    try {
      response = await fetch(`http://${endpoint.host}:${endpoint.webPort}/api`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(timeoutMs),
      });
    } catch {
      throw new ServiceUnavailableException('DEVICE_OFFLINE');
    }
    try {
      return JSON.parse(await response.text()) as DeviceReply;
    } catch {
      throw new ServiceUnavailableException('DEVICE_OFFLINE');
    }
  }
}
