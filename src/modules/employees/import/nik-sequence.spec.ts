import { assertNikPrefix, nextEmployeeCode } from './nik-sequence';

describe('nik sequence', () => {
  it('rejects a prefix outside 10-99', () => {
    expect(() => assertNikPrefix('09')).toThrow('Prefix NIK harus 2 digit dari 10 sampai 99');
    expect(() => assertNikPrefix('100')).toThrow('Prefix NIK harus 2 digit dari 10 sampai 99');
  });

  it('starts at 0001 when the prefix has no codes', () => {
    expect(nextEmployeeCode('90', ['123456', '9012345'])).toBe('900001');
  });

  it('continues from the highest 6-digit code with that prefix', () => {
    expect(nextEmployeeCode('90', ['900042', '910001', 'TEMP-1'])).toBe('900043');
  });

  it('fails when the serial would pass 9999', () => {
    expect(() => nextEmployeeCode('90', ['909999'])).toThrow(
      'Nomor urut NIK untuk prefix ini sudah habis',
    );
  });
});
