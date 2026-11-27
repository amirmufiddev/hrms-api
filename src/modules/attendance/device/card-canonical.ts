export function identityCardCanonical(usbReading: string): string {
  const digits = usbReading.trim();
  if (!/^[0-9]+$/.test(digits)) return digits;
  const reversed = reverseUidBytes(BigInt(digits));
  return reversed.toString();
}

function reverseUidBytes(value: bigint): bigint {
  const minHex = value <= 0xffffffffn ? 8 : 14;
  const hex = value.toString(16).padStart(minHex, '0');
  const pairs = hex.match(/.{2}/g);
  if (!pairs) return value;
  return BigInt(`0x${pairs.reverse().join('')}`);
}
