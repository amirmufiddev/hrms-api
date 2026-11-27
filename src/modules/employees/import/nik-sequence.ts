const PREFIX = /^[1-9]\d$/;

export function assertNikPrefix(prefix: string): string {
  const value = prefix.trim();
  if (!PREFIX.test(value)) {
    throw new Error('Prefix NIK harus 2 digit dari 10 sampai 99');
  }
  return value;
}

export function nextEmployeeCode(prefix: string, existingCodes: string[]): string {
  const normalized = assertNikPrefix(prefix);
  let maxSerial = 0;
  for (const code of existingCodes) {
    if (!code.startsWith(normalized) || !/^\d{6}$/.test(code)) continue;
    maxSerial = Math.max(maxSerial, Number(code.slice(2)));
  }
  const next = maxSerial + 1;
  if (next > 9999) {
    throw new Error('Nomor urut NIK untuk prefix ini sudah habis');
  }
  return `${normalized}${String(next).padStart(4, '0')}`;
}
