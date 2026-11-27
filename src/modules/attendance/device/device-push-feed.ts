import { Injectable } from '@nestjs/common';

export type PushFeedKind = 'reg' | 'sendlog' | 'senduser';

export type PushFeedEvent = {
  id: string;
  at: string;
  kind: PushFeedKind;
  deviceCode: string;
  nik: string;
  detail: string;
  ok: boolean;
  message: string;
};

type PushFeedInput = {
  tenantId: string | null;
  kind: PushFeedKind;
  deviceCode: string;
  nik: string;
  detail: string;
  ok: boolean;
  message: string;
};

const LIMIT = 80;

export function pushSlotLabel(backupnum: number): string {
  if (backupnum >= 0 && backupnum <= 9) return `Sidik slot ${backupnum}`;
  if (backupnum === 10) return 'Sandi';
  if (backupnum === 11) return 'Kartu';
  if (backupnum === 50) return 'Foto';
  if (backupnum === 51 || (backupnum >= 20 && backupnum <= 27)) return 'Wajah';
  return `Slot ${backupnum}`;
}

@Injectable()
export class DevicePushFeed {
  private seq = 0;
  private rows: Array<PushFeedEvent & { tenantId: string | null }> = [];

  add(input: PushFeedInput): void {
    this.seq += 1;
    this.rows.unshift({
      id: String(this.seq),
      at: new Date().toISOString(),
      kind: input.kind,
      deviceCode: input.deviceCode,
      nik: input.nik,
      detail: input.detail,
      ok: input.ok,
      message: input.message,
      tenantId: input.tenantId,
    });
    if (this.rows.length > LIMIT) this.rows.length = LIMIT;
  }

  list(tenantId: string): PushFeedEvent[] {
    return this.rows
      .filter((row) => row.tenantId === tenantId || row.tenantId === null)
      .map(({ tenantId: _tenantId, ...event }) => event);
  }
}
