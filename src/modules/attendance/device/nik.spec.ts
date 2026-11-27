import { isNumericToken } from './nik';
import { identityCardCanonical } from './card-canonical';

describe('isNumericToken', () => {
  it('menerima NIK dengan nol di depan', () => {
    expect(isNumericToken('012345')).toBe(true);
    expect(isNumericToken('909212')).toBe(true);
  });

  it('menolak huruf, tanda, dan spasi', () => {
    expect(isNumericToken('EMP001')).toBe(false);
    expect(isNumericToken('012-345')).toBe(false);
    expect(isNumericToken('012345 ')).toBe(false);
    expect(isNumericToken('')).toBe(false);
  });

  it('tidak menyamakan 012345 dengan 12345', () => {
    const withZero = '012345';
    const withoutZero = '12345';
    expect(isNumericToken(withZero)).toBe(true);
    expect(isNumericToken(withoutZero)).toBe(true);
    expect(withZero).not.toBe(withoutZero);
  });
});

describe('identityCardCanonical', () => {
  it('membalik byte UID pembaca USB agar sama dengan nomor di mesin', () => {
    expect(identityCardCanonical('0011223344')).toBe('809609984');
    expect(identityCardCanonical('4037168326')).toBe('3326911216');
  });
});
