import { assertImportHeaders, parseEmployeeSheet } from './employee-import-parser';
import { IMPORT_HEADERS } from './employee-import.types';

const departments = [{ id: 'dept-1', name: 'Engineering', code: 'ENG' }];
const designations = [{ id: 'desig-1', name: 'Staff', code: 'STF' }];
const header = [...IMPORT_HEADERS];

function dataRow(values: {
  firstName?: string;
  lastName?: string;
  ktp?: unknown;
  phone?: unknown;
  gender?: unknown;
  account?: unknown;
  bank?: unknown;
  department?: string;
  designation?: string;
  employmentType?: string;
  email?: string;
  joinDate?: unknown;
} = {}): unknown[] {
  return [
    values.firstName ?? '',
    values.lastName ?? '',
    values.ktp ?? '',
    values.phone ?? '',
    values.gender ?? '',
    values.account ?? '',
    values.bank ?? '',
    values.department ?? '',
    values.designation ?? '',
    values.employmentType ?? '',
    values.email ?? '',
    values.joinDate ?? '',
  ];
}

const valid = {
  firstName: 'Amir',
  lastName: 'Mufid',
  ktp: '3201010101010001',
  phone: '0812',
  gender: 'Laki-laki',
  account: '1234567890',
  bank: 'BCA',
  department: 'ENG',
  designation: 'STF',
  employmentType: 'PERMANENT',
};

describe('parseEmployeeSheet', () => {
  it('rejects a header that does not match the template', () => {
    expect(() => assertImportHeaders(['Nama'])).toThrow('Header sheet Data tidak sesuai template');
    expect(() =>
      assertImportHeaders([
        'Nama depan',
        'Nama belakang',
        'Departemen',
        'Jabatan',
        'Tipe kerja',
        'Email',
        'Telepon',
        'Tanggal bergabung',
      ]),
    ).toThrow('Header sheet Data tidak sesuai template');
  });

  it('parses a valid row and skips a blank row', () => {
    const result = parseEmployeeSheet(
      [
        header,
        dataRow(valid),
        dataRow(),
        dataRow({
          ...valid,
          ktp: '3201010101010002',
          firstName: 'Budi',
          lastName: 'Santoso',
          account: '9876543210',
          bank: 'Mandiri',
          department: 'Tidak Ada',
          designation: 'Tidak Ada',
          employmentType: 'MAGIC',
          email: 'budi@example.com',
          phone: '',
          gender: '',
          joinDate: '2026-01-15',
        }),
      ],
      departments,
      designations,
    );

    expect(result.rows).toEqual([
      expect.objectContaining({
        row: 2,
        firstName: 'Amir',
        lastName: 'Mufid',
        ktpNumber: '3201010101010001',
        gender: 'male',
        departmentId: 'dept-1',
        designationId: 'desig-1',
        employmentType: 'PERMANENT',
        email: null,
        phone: '0812',
        accountNumber: '1234567890',
        bankName: 'BCA',
        bankNameKey: 'bca',
        joinDate: null,
      }),
    ]);
    expect(result.errors.map((error) => error.row)).toEqual([4]);
    expect(result.errors[0].message).toBe('Tipe kerja tidak valid');
    expect(result.errors[0].cells).toHaveLength(12);
  });

  it('keeps an empty last name, empty phone, and empty gender', () => {
    const result = parseEmployeeSheet(
      [header, dataRow({ ...valid, lastName: '', phone: '', gender: '' })],
      departments,
      designations,
    );
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({ lastName: '', phone: null, gender: null }),
    );
  });

  it('maps gender tokens', () => {
    const tokens: [string, 'male' | 'female'][] = [
      ['L', 'male'],
      ['P', 'female'],
      ['Perempuan', 'female'],
      ['Wanita', 'female'],
      ['Pria', 'male'],
      ['laki laki', 'male'],
      ['LAKI-LAKI', 'male'],
    ];
    for (const [gender, stored] of tokens) {
      const result = parseEmployeeSheet(
        [header, dataRow({ ...valid, gender })],
        departments,
        designations,
      );
      expect(result.errors).toEqual([]);
      expect(result.rows[0].gender).toBe(stored);
    }
  });

  it('rejects an unknown gender', () => {
    const result = parseEmployeeSheet(
      [header, dataRow({ ...valid, gender: 'X' })],
      departments,
      designations,
    );
    expect(result.rows).toEqual([]);
    expect(result.errors[0].message).toBe('Jenis kelamin tidak valid');
  });

  it('normalizes KTP and rejects the wrong length', () => {
    const spaced = parseEmployeeSheet(
      [header, dataRow({ ...valid, ktp: '3201.0101 0101-0001' })],
      departments,
      designations,
    );
    expect(spaced.errors).toEqual([]);
    expect(spaced.rows[0].ktpNumber).toBe('3201010101010001');

    const missing = parseEmployeeSheet(
      [header, dataRow({ ...valid, ktp: '' })],
      departments,
      designations,
    );
    expect(missing.errors[0].message).toBe('NIK KTP wajib diisi');

    const short = parseEmployeeSheet(
      [header, dataRow({ ...valid, ktp: '320101010101000' })],
      departments,
      designations,
    );
    expect(short.errors[0].message).toBe('NIK KTP harus 16 digit');

    const long = parseEmployeeSheet(
      [header, dataRow({ ...valid, ktp: '32010101010100011' })],
      departments,
      designations,
    );
    expect(long.errors[0].message).toBe('NIK KTP harus 16 digit');
  });

  it('rejects an unsafe Excel number for KTP and account without adding a leading zero', () => {
    const unsafe = Number.MAX_SAFE_INTEGER + 2;
    const ktp = parseEmployeeSheet(
      [header, dataRow({ ...valid, ktp: unsafe })],
      departments,
      designations,
    );
    expect(ktp.errors[0].message).toBe('NIK KTP harus diisi sebagai teks');

    const account = parseEmployeeSheet(
      [header, dataRow({ ...valid, account: unsafe })],
      departments,
      designations,
    );
    expect(account.errors[0].message).toBe('Nomor rekening harus diisi sebagai teks');

    const safeAccount = parseEmployeeSheet(
      [header, dataRow({ ...valid, account: 8123456789 })],
      departments,
      designations,
    );
    expect(safeAccount.errors).toEqual([]);
    expect(safeAccount.rows[0].accountNumber).toBe('8123456789');
  });

  it('requires account number and bank name, and collapses bank whitespace', () => {
    const missing = parseEmployeeSheet(
      [header, dataRow({ ...valid, account: '   ', bank: '' })],
      departments,
      designations,
    );
    expect(missing.errors[0].message).toBe('Nomor rekening wajib diisi; Nama bank wajib diisi');

    const named = parseEmployeeSheet(
      [header, dataRow({ ...valid, account: '12 34 56', bank: '  Bank   BCA  ' })],
      departments,
      designations,
    );
    expect(named.errors).toEqual([]);
    expect(named.rows[0]).toEqual(
      expect.objectContaining({
        accountNumber: '123456',
        bankName: 'Bank BCA',
        bankNameKey: 'bank bca',
      }),
    );
  });

  it('rejects the second in-file KTP and the second bank pair', () => {
    const result = parseEmployeeSheet(
      [
        header,
        dataRow(valid),
        dataRow({ ...valid, firstName: 'Sari', ktp: '3201010101010001', account: '999', bank: 'Mandiri' }),
        dataRow({ ...valid, firstName: 'Budi', ktp: '3201010101010003', account: '1234567890', bank: 'bca' }),
      ],
      departments,
      designations,
    );
    expect(result.rows.map((row) => row.firstName)).toEqual(['Amir']);
    expect(result.errors.map((error) => error.message)).toEqual([
      'NIK KTP sudah dipakai',
      'Nomor rekening sudah dipakai',
    ]);
  });

  it('does not reserve a KTP that belonged to an invalid row', () => {
    const result = parseEmployeeSheet(
      [
        header,
        dataRow({ ...valid, employmentType: 'MAGIC' }),
        dataRow({ ...valid, firstName: 'Sari' }),
      ],
      departments,
      designations,
    );
    expect(result.rows.map((row) => row.firstName)).toEqual(['Sari']);
    expect(result.errors).toHaveLength(1);
  });

  it('imports a row when the department and designation are unknown', () => {
    const result = parseEmployeeSheet(
      [header, dataRow({ ...valid, department: 'Tidak Ada', designation: 'Daily Worker Public Area', employmentType: 'DAILY_WORKER' })],
      departments,
      designations,
    );
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        departmentId: null,
        designationId: null,
        departmentLabel: 'Tidak Ada',
        designationLabel: 'Daily Worker Public Area',
      }),
    );
  });

  it('reads an Excel date and a numeric phone that lost its leading zero', () => {
    const result = parseEmployeeSheet(
      [header, dataRow({ ...valid, phone: 8123456789, joinDate: new Date(Date.UTC(2026, 0, 15)) })],
      departments,
      designations,
    );
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({ phone: '08123456789', joinDate: '2026-01-15' }),
    );
  });

  it('allows a row with an empty department and designation', () => {
    const result = parseEmployeeSheet(
      [header, dataRow({ ...valid, department: '', designation: '', employmentType: 'DAILY_WORKER', joinDate: '2026-01-15' })],
      departments,
      designations,
    );
    expect(result.errors).toEqual([]);
    expect(result.rows[0]).toEqual(
      expect.objectContaining({
        departmentId: null,
        designationId: null,
        departmentLabel: '',
        designationLabel: '',
      }),
    );
  });

  it('rejects a duplicate email inside the same file on the second row', () => {
    const result = parseEmployeeSheet(
      [
        header,
        dataRow({ ...valid, department: 'engineering', designation: 'staff', employmentType: 'CONTRACT', email: 'amir@example.com', joinDate: '2026-02-01' }),
        dataRow({ ...valid, firstName: 'Sari', lastName: 'Putri', ktp: '3201010101010002', account: '222', bank: 'BNI', employmentType: 'INTERN', email: 'amir@example.com' }),
      ],
      departments,
      designations,
    );
    expect(result.rows).toHaveLength(1);
    expect(result.errors[0]).toEqual(
      expect.objectContaining({
        row: 3,
        message: 'Email sudah dipakai',
        cells: expect.any(Array),
      }),
    );
  });
});
