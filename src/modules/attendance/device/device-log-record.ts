import { PunchVerifyMode } from '@prisma/client';

export type DeviceLogRow = {
  enrollid?: string | number;
  time?: string;
  mode?: number;
  inout?: number;
};

export type NormalizedDevicePunch = {
  nik: string;
  punchedAt: string;
  verifyMode: PunchVerifyMode;
  deviceState: number;
};

const VERIFY_MODE: Record<number, PunchVerifyMode> = {
  0: PunchVerifyMode.ANY,
  1: PunchVerifyMode.FINGER,
  2: PunchVerifyMode.PASSWORD,
  3: PunchVerifyMode.CARD,
  4: PunchVerifyMode.FINGER_PIN,
  5: PunchVerifyMode.FINGER_CARD,
  8: PunchVerifyMode.FACE,
  9: PunchVerifyMode.FACE_PIN,
  10: PunchVerifyMode.CARD_FACE,
  11: PunchVerifyMode.CARD_PIN,
  12: PunchVerifyMode.FINGER_FACE,
  14: PunchVerifyMode.FACE_CARD_OR_PIN,
};

export function normalizeDeviceLog(row: DeviceLogRow): NormalizedDevicePunch | null {
  const nik = String(row.enrollid ?? '').trim();
  if (!/^[0-9]+$/.test(nik)) return null;
  const match = /^(\d{4}-\d{2}-\d{2})[ T](\d{2}:\d{2}:\d{2})$/.exec(String(row.time ?? '').trim());
  if (!match) return null;
  const code = Number(row.mode);
  return {
    nik,
    punchedAt: `${match[1]}T${match[2]}+07:00`,
    verifyMode: VERIFY_MODE[code] ?? PunchVerifyMode.UNKNOWN,
    deviceState: Number.isInteger(row.inout) ? Number(row.inout) : 0,
  };
}
