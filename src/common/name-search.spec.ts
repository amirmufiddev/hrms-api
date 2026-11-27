import { matchesNameNik, normalizeSearch } from './name-search';

const budi = { code: '1001', firstName: 'Budi', lastName: 'Santoso' };

describe('name search', () => {
  it('mengabaikan cari yang kosong', () => {
    expect(normalizeSearch('   ')).toBeUndefined();
    expect(matchesNameNik(budi, '  ')).toBe(true);
  });

  it('mencocokkan nama depan, nama belakang, nama gabungan, dan NIK', () => {
    expect(matchesNameNik(budi, 'budi')).toBe(true);
    expect(matchesNameNik(budi, 'SANTO')).toBe(true);
    expect(matchesNameNik(budi, 'Budi Santoso')).toBe(true);
    expect(matchesNameNik(budi, '1001')).toBe(true);
  });

  it('tidak memakai nomor kartu, dan menerima nama tambahan', () => {
    expect(matchesNameNik({ ...budi, names: ['999'] }, '999')).toBe(true);
    expect(matchesNameNik(budi, '999')).toBe(false);
    expect(matchesNameNik({ code: '2002', names: ['Mesin Saja'] }, 'mesin saja')).toBe(true);
  });
});
