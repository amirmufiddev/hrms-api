# Impor identitas dan rekening karyawan — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Impor Excel karyawan menyimpan NIK KTP, jenis kelamin, telepon, dan satu rekening utama.

**Architecture:** Header dan validasi baris tinggal di parser murni. Template Excel memakai header yang sama. Worker tetap membuat karyawan lewat `EmployeeImportService`, sekarang di dalam satu transaksi Prisma bersama baris `employee_bank_accounts`. Dialog hanya menampilkan 12 header yang sama.

**Tech Stack:** NestJS, Prisma, PostgreSQL, ExcelJS, Jest, React Testing Library.

## Global Constraints

- Nama tetap dua kolom: `Nama depan` wajib, `Nama belakang` boleh kosong.
- Header persis, termasuk huruf besar. Header lama yang masih memakai `Telepon` ditolak dengan `Header sheet Data tidak sesuai template`.
- Urutan header: `Nama depan`, `Nama belakang`, `NIK KTP`, `NO TELPON`, `JENIS KELAMIN`, `NO REKENING`, `NAMA BANK`, `Departemen`, `Jabatan`, `Tipe kerja`, `Email`, `Tanggal bergabung`.
- `NIK KTP`, `NO REKENING`, dan `NAMA BANK` wajib. `NO TELPON` dan `JENIS KELAMIN` boleh kosong.
- NIK: buang karakter non-angka, harus 16 digit, unik di perusahaan dan di dalam file.
- Jenis kelamin, tanpa membedakan huruf besar: `laki-laki`, `laki laki`, `l`, `pria` → `male`; `perempuan`, `p`, `wanita` → `female`; kosong → `null`. Nilai lain: `Jenis kelamin tidak valid`.
- Nomor rekening disimpan tanpa spasi. Nama bank di-trim, spasi beruntun dijadikan satu, kapital asli disimpan di `bankName`, huruf kecil di `bankNameKey`.
- Unik pada `(tenantId, bankNameKey, accountNumber)`. Paling satu `isPrimary = true` per karyawan. Impor membuat tepat satu rekening `isPrimary = true`.
- Rekening terhapus saat karyawan terhapus.
- Karyawan dan rekening satu transaksi. Nomor pegawai di memori maju hanya setelah transaksi berhasil.
- Angka Excel yang bukan bilangan bulat aman pada NIK atau nomor rekening menghasilkan `NIK KTP harus diisi sebagai teks` atau `Nomor rekening harus diisi sebagai teks`. Pemulihan awalan `0` untuk telepon tidak berlaku pada dua kolom itu.
- Beberapa alasan satu baris digabung dengan `; `.
- Pelanggaran unik database memakai `NIK KTP sudah dipakai` atau `Nomor rekening sudah dipakai`.
- Aturan departemen, jabatan, tipe kerja, email, dan tanggal bergabung tidak berubah.
- Antrean, prefix NIK pegawai, dan larangan membuat akun SSO tidak berubah.
- Layar tambah dan ubah karyawan tidak berubah.
- Jangan ubah `backend/scripts/build-dw-daily-worker-import.ts`.

## File structure

- `backend/src/modules/employees/import/employee-import.types.ts` — header, tipe baris, sel file gagal.
- `backend/src/modules/employees/import/employee-import-parser.ts` — validasi dan normalisasi. Tidak menyentuh database.
- `backend/src/modules/employees/import/employee-import-template.ts` — workbook template.
- `backend/src/modules/employees/import/employee-import-failed-export.ts` — sudah mengikuti `IMPORT_HEADERS`. Tidak perlu logika baru.
- `backend/src/modules/employees/import/employee-import.service.ts` — cek duplikat database dan transaksi simpan.
- `backend/prisma/schema.prisma` dan `backend/prisma/migrations/20261107014000_employee_bank_accounts/migration.sql` — tabel rekening.
- `backend/src/modules/employees/import/employee-import.processor.spec.ts` — fixture Excel mengikuti header baru. Processor tidak berubah.
- `frontend/src/components/employees/EmployeeImportDialog.tsx` — daftar kolom yang ditampilkan.

---

### Task 1: Header, parser, template, file gagal

**Files:**

- Modify: `backend/src/modules/employees/import/employee-import.types.ts`
- Modify: `backend/src/modules/employees/import/employee-import-parser.ts`
- Modify: `backend/src/modules/employees/import/employee-import-template.ts`
- Modify: `backend/src/modules/employees/import/employee-import-parser.spec.ts`
- Modify: `backend/src/modules/employees/import/employee-import-template.spec.ts`
- Modify: `backend/src/modules/employees/import/employee-import.processor.spec.ts`
- Modify: `backend/src/modules/employees/import/employee-import.service.spec.ts`
- Create: `backend/src/modules/employees/import/employee-import-failed-export.spec.ts`
- Test: file-file spec di atas

**Interfaces:**

- Consumes: `normalizeKtpNumber` tidak dipakai di parser. Parser punya normalisasi sendiri supaya angka Excel tidak aman tidak ikut terpotong.
- Produces:
  - `IMPORT_HEADERS` 12 string dalam urutan Global Constraints.
  - `UNSAFE_EXCEL_NUMBER = '\u0000UNSAFE_EXCEL_NUMBER'`
  - `ParsedEmployeeRow` menambah `ktpNumber: string`, `gender: 'male' | 'female' | null`, `accountNumber: string`, `bankName: string`, `bankNameKey: string`.
  - `importRowToCells` mengembalikan 12 sel dalam urutan header.
  - `parseEmployeeSheet` mengisi field itu. Baris yang gagal tidak memasukkan NIK atau pasangan rekening ke set duplikat file.

- [ ] **Step 1: Write the failing tests**

Ganti isi `employee-import-parser.spec.ts` dengan ini:

```typescript
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
      [header, dataRow(valid), dataRow(), dataRow({ ...valid, ktp: '3201010101010002', firstName: 'Budi', lastName: 'Santoso', department: 'Tidak Ada', designation: 'Tidak Ada', employmentType: 'MAGIC', email: 'budi@eiger.test', phone: '', gender: '', joinDate: '2026-01-15' })],
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
        dataRow({ ...valid, department: 'engineering', designation: 'staff', employmentType: 'CONTRACT', email: 'amir@eiger.test', joinDate: '2026-02-01' }),
        dataRow({ ...valid, firstName: 'Sari', lastName: 'Putri', ktp: '3201010101010002', account: '222', bank: 'BNI', employmentType: 'INTERN', email: 'amir@eiger.test' }),
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
```

Di `employee-import-template.spec.ts`, ganti dua expect sel sampel:

```typescript
expect(sample?.getRow(2).getCell(1).value).toBe('Amir');
expect(sample?.getRow(2).getCell(3).value).toBe('3201010101010001');
expect(sample?.getRow(2).getCell(5).value).toBe('Laki-laki');
expect(sample?.getRow(2).getCell(6).value).toBe('1234567890');
expect(sample?.getRow(2).getCell(7).value).toBe('BCA');
expect(sample?.getRow(2).getCell(8).value).toBe('Engineering');
expect(sample?.getRow(2).getCell(10).value).toBe('PERMANENT');
expect(data?.getColumn(3).numFmt).toBe('@');
expect(data?.getColumn(6).numFmt).toBe('@');
expect(sample?.getColumn(3).numFmt).toBe('@');
expect(sample?.getColumn(6).numFmt).toBe('@');
```

Biarkan `expect(data?.rowCount).toBe(1)`.

Buat `employee-import-failed-export.spec.ts`:

```typescript
import ExcelJS from 'exceljs';
import { buildFailedImportRowsWorkbook } from './employee-import-failed-export';
import { IMPORT_FAILED_REASON_HEADER, IMPORT_HEADERS } from './employee-import.types';

describe('buildFailedImportRowsWorkbook', () => {
  it('writes the 12 template columns and the failure reason', async () => {
    const cells = [
      'Amir',
      'Mufid',
      '3201010101010001',
      '0812',
      'Laki-laki',
      '1234567890',
      'BCA',
      'Engineering',
      'Staff',
      'PERMANENT',
      '',
      '',
    ];
    const buffer = await buildFailedImportRowsWorkbook([
      { row: 2, message: 'NIK KTP sudah dipakai', cells },
    ]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    const sheet = workbook.getWorksheet('Data');
    const headers = [...IMPORT_HEADERS, IMPORT_FAILED_REASON_HEADER].map((_, index) =>
      sheet?.getRow(1).getCell(index + 1).value,
    );
    expect(headers).toEqual([...IMPORT_HEADERS, IMPORT_FAILED_REASON_HEADER]);
    expect(sheet?.getRow(2).getCell(3).value).toBe('3201010101010001');
    expect(sheet?.getRow(2).getCell(13).value).toBe('NIK KTP sudah dipakai');
  });
});
```

Di `employee-import.service.spec.ts`, tambahkan field ini pada setiap objek baris:

```typescript
ktpNumber: '3201010101010001',
gender: null,
accountNumber: '1234567890',
bankName: 'BCA',
bankNameKey: 'bca',
```

Baris Sari memakai `ktpNumber: '3201010101010002'`, `accountNumber: '222'`, `bankName: 'BNI'`, `bankNameKey: 'bni'`.

Di `employee-import.processor.spec.ts`, ganti header dan dua baris data menjadi 12 kolom. Baris 2: Amir, Mufid, `3201010101010001`, `0812`, kosong, `1234567890`, `BCA`, `ENG`, `STF`, `PERMANENT`, kosong, kosong. Baris 4, lewat `getRow(4)` seperti sekarang:

```typescript
budi.getCell(1).value = 'Budi';
budi.getCell(2).value = 'Santoso';
budi.getCell(3).value = '3201010101010002';
budi.getCell(6).value = '9876543210';
budi.getCell(7).value = 'Mandiri';
budi.getCell(8).value = 'ENG';
budi.getCell(9).value = 'Staff';
budi.getCell(10).value = 'CONTRACT';
```

- [ ] **Step 2: Run test to verify it fails**

Run dari `en-hrms-be-fe/backend`:

```bash
npx jest --watchAll=false src/modules/employees/import/employee-import-parser.spec.ts src/modules/employees/import/employee-import-template.spec.ts src/modules/employees/import/employee-import-failed-export.spec.ts
```

Expected: FAIL. Header masih 8 kolom, jadi `ktpNumber` tidak ada dan format kolom `@` belum diset.

- [ ] **Step 3: Write minimal implementation**

Ganti `IMPORT_HEADERS`, `ParsedEmployeeRow`, dan `importRowToCells` di `employee-import.types.ts`:

```typescript
export const IMPORT_HEADERS = [
  'Nama depan',
  'Nama belakang',
  'NIK KTP',
  'NO TELPON',
  'JENIS KELAMIN',
  'NO REKENING',
  'NAMA BANK',
  'Departemen',
  'Jabatan',
  'Tipe kerja',
  'Email',
  'Tanggal bergabung',
] as const;

export type ParsedEmployeeRow = {
  row: number;
  firstName: string;
  lastName: string;
  ktpNumber: string;
  gender: 'male' | 'female' | null;
  departmentLabel: string;
  departmentId: string | null;
  designationLabel: string;
  designationId: string | null;
  employmentType: EmploymentTypeValue;
  email: string | null;
  phone: string | null;
  accountNumber: string;
  bankName: string;
  bankNameKey: string;
  joinDate: string | null;
};

export function importRowToCells(row: {
  firstName: string;
  lastName: string;
  ktpNumber: string;
  gender: 'male' | 'female' | null;
  departmentLabel: string;
  designationLabel: string;
  employmentType: string;
  email: string | null;
  phone: string | null;
  accountNumber: string;
  bankName: string;
  joinDate: string | null;
}): string[] {
  const genderLabel =
    row.gender === 'male' ? 'Laki-laki' : row.gender === 'female' ? 'Perempuan' : '';
  return [
    row.firstName,
    row.lastName,
    row.ktpNumber,
    row.phone ?? '',
    genderLabel,
    row.accountNumber,
    row.bankName,
    row.departmentLabel,
    row.designationLabel,
    row.employmentType,
    row.email ?? '',
    row.joinDate ?? '',
  ];
}
```

Biarkan `EMPLOYMENT_TYPES`, `EmployeeImportJobData`, dan `normalizeImportProgress` seperti sekarang.

Di `employee-import-parser.ts`:

- Ekspor `export const UNSAFE_EXCEL_NUMBER = '\u0000UNSAFE_EXCEL_NUMBER';`
- Ubah `cellString` menjadi `cellString(value, mode: 'plain' | 'phone' | 'identity' = 'plain')`.
- Pada cabang `typeof value === 'number'`: kalau `mode === 'identity'` dan `!Number.isSafeInteger(value)`, kembalikan `UNSAFE_EXCEL_NUMBER`. Kalau `mode === 'phone'` dan digit cocok `/^8\d{8,12}$/`, tetap tambahkan `0`. Mode `plain` dan `identity` yang aman tidak menambahkan `0`.
- Panggilan sel: indeks 0, 1, 4, 6, 7, 8, 9, 10 memakai `plain`. Indeks 3 memakai `phone`. Indeks 2 dan 5 memakai `identity`. Indeks 11 tetap `cellString` plain karena tanggal sudah ditangani di cabang `Date`.

Tambahkan helper ini di parser:

```typescript
function parseGender(raw: string): 'male' | 'female' | null | 'invalid' {
  const token = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (token === '') return null;
  if (token === 'laki-laki' || token === 'laki laki' || token === 'l' || token === 'pria') {
    return 'male';
  }
  if (token === 'perempuan' || token === 'p' || token === 'wanita') {
    return 'female';
  }
  return 'invalid';
}

function normalizeBankName(raw: string): { bankName: string; bankNameKey: string } | null {
  const bankName = raw.trim().replace(/\s+/g, ' ');
  if (bankName === '') return null;
  return { bankName, bankNameKey: bankName.toLowerCase() };
}
```

Di `parseEmployeeSheet`, selain `seenEmails`, simpan `seenKtp` dan `seenBank` (`Set<string>`). Kunci bank adalah `` `${bankNameKey}\u0000${accountNumber}` ``.

Untuk setiap baris tidak kosong:

- `firstName` kosong → `Nama depan wajib diisi`.
- Sel 2 sama dengan `UNSAFE_EXCEL_NUMBER` → `NIK KTP harus diisi sebagai teks`. Selain itu ambil digit dengan `replace(/\D/g, '')`. Kosong → `NIK KTP wajib diisi`. Panjang bukan 16 → `NIK KTP harus 16 digit`. Kalau `seenKtp` sudah punya digit itu → `NIK KTP sudah dipakai`.
- Sel 4 lewat `parseGender`. `'invalid'` → `Jenis kelamin tidak valid`.
- Sel 5 sama dengan `UNSAFE_EXCEL_NUMBER` → `Nomor rekening harus diisi sebagai teks`. Selain itu `replace(/\s+/g, '')`. Hasil kosong → `Nomor rekening wajib diisi`.
- `normalizeBankName` pada sel 6. `null` → `Nama bank wajib diisi`.
- Kalau nomor rekening dan nama bank keduanya ada dan kuncinya ada di `seenBank` → `Nomor rekening sudah dipakai`.
- Departemen, jabatan, tipe kerja, email, telepon, dan tanggal bergabung tetap memakai aturan sekarang. Telepon kosong menjadi `null`.

Kalau `messages` kosong, masukkan baris ke `parsedRows`, lalu tambahkan email, NIK, dan kunci bank ke set. Baris gagal tidak menambah set.

`employee-import-template.ts` memakai baris sampel:

```typescript
sampleSheet.addRow([
  'Amir',
  'Mufid',
  '3201010101010001',
  '08123456789',
  'Laki-laki',
  '1234567890',
  'BCA',
  'Engineering',
  'Staff',
  'PERMANENT',
  'amir@eiger.test',
  '2026-01-15',
]);
```

Setelah kedua sheet dibuat:

```typescript
for (const sheet of [dataSheet, sampleSheet]) {
  sheet.getColumn(3).numFmt = '@';
  sheet.getColumn(6).numFmt = '@';
}
```

Jangan membuat baris kosong 2 sampai 5001. Format kolom berlaku untuk sel yang nanti diisi di baris itu, dan `rowCount` sheet `Data` tetap 1. `countNonEmptyDataRows` tidak menghitung sel kosong.

- [ ] **Step 4: Run test to verify it passes**

Run dari `en-hrms-be-fe/backend`:

```bash
npx jest --watchAll=false src/modules/employees/import
```

Expected: PASS, termasuk processor spec dan service spec yang fixture-nya sudah berisi field baru. Service belum menulis rekening. Itu tugas berikutnya.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/employees/import/employee-import.types.ts backend/src/modules/employees/import/employee-import-parser.ts backend/src/modules/employees/import/employee-import-parser.spec.ts backend/src/modules/employees/import/employee-import-template.ts backend/src/modules/employees/import/employee-import-template.spec.ts backend/src/modules/employees/import/employee-import-failed-export.spec.ts backend/src/modules/employees/import/employee-import.processor.spec.ts backend/src/modules/employees/import/employee-import.service.spec.ts
git commit -m "$(cat <<'EOF'
feat: validate identity columns on employee import

EOF
)"
```

Jalankan git dari root repo `en-hrms-be-fe`.

---

### Task 2: Tabel rekening dan transaksi simpan

**Files:**

- Modify: `backend/prisma/schema.prisma`
- Create: `backend/prisma/migrations/20261107014000_employee_bank_accounts/migration.sql`
- Modify: `backend/src/modules/employees/import/employee-import.service.ts`
- Modify: `backend/src/modules/employees/import/employee-import.service.spec.ts`
- Test: `backend/src/modules/employees/import/employee-import.service.spec.ts`

**Interfaces:**

- Consumes: `ParsedEmployeeRow.ktpNumber`, `gender`, `phone`, `accountNumber`, `bankName`, `bankNameKey` dari Task 1.
- Produces: model Prisma `EmployeeBankAccount`, delegate `prisma.employeeBankAccount`. `importRows` menulis `employee.ktpNumber`, `employee.gender`, `employee.phone`, dan satu `employeeBankAccount` dengan `isPrimary: true`.

- [ ] **Step 1: Write the failing test**

Di `employee-import.service.spec.ts`, ganti objek `prisma` menjadi:

```typescript
const prisma = {
  employee: {
    findMany: jest.fn().mockResolvedValue([{ employeeCode: '900042' }]),
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'emp-1' }),
  },
  employeeBankAccount: {
    findFirst: jest.fn().mockResolvedValue(null),
    create: jest.fn().mockResolvedValue({ id: 'bank-1' }),
  },
  $transaction: jest.fn(async (fn: (tx: unknown) => Promise<void>) => fn(prisma)),
};
```

`findFirst` karyawan harus membedakan email dan KTP. Di tes email yang sudah ada, hapus `mockResolvedValueOnce`. Baris pertama tetap gagal karena `existingEmails`. Tambahkan implementasi:

```typescript
prisma.employee.findFirst.mockImplementation(async (args: { where: { email?: string; ktpNumber?: string } }) => {
  if (args.where.email === 'amir@eiger.test') return { id: 'existing' };
  return null;
});
```

Pasang implementasi itu di tes email saja. Tes lain membiarkan `findFirst` mengembalikan `null`.

Tambahkan tiga tes:

```typescript
it('creates the employee and one primary bank account in a transaction', async () => {
  const service = new EmployeeImportService(prisma as never);
  const result = await service.importRows(
    'tenant-1',
    '90',
    [
      {
        row: 2,
        firstName: 'Amir',
        lastName: 'Mufid',
        ktpNumber: '3201010101010001',
        gender: 'male',
        departmentId: 'dept-1',
        departmentLabel: 'Engineering',
        designationId: 'desig-1',
        designationLabel: 'Staff',
        employmentType: 'PERMANENT',
        email: null,
        phone: '0812',
        accountNumber: '1234567890',
        bankName: 'BCA',
        bankNameKey: 'bca',
        joinDate: null,
      },
    ],
    new Set(),
  );

  expect(result.created).toBe(1);
  expect(prisma.employee.create).toHaveBeenCalledWith(
    expect.objectContaining({
      data: expect.objectContaining({
        employeeCode: '900043',
        ktpNumber: '3201010101010001',
        gender: 'male',
        phone: '0812',
        email: null,
        ssoUserId: null,
      }),
    }),
  );
  expect(prisma.employeeBankAccount.create).toHaveBeenCalledWith({
    data: {
      tenantId: 'tenant-1',
      employeeId: 'emp-1',
      accountNumber: '1234567890',
      bankName: 'BCA',
      bankNameKey: 'bca',
      isPrimary: true,
    },
  });
});

it('fails the row when the KTP or bank account already exists and creates nothing', async () => {
  prisma.employee.findFirst.mockImplementation(async (args: { where: { ktpNumber?: string } }) => {
    if (args.where.ktpNumber === '3201010101010001') return { id: 'existing' };
    return null;
  });
  const service = new EmployeeImportService(prisma as never);
  const ktpResult = await service.importRows('tenant-1', '90', [rowOf({ ktpNumber: '3201010101010001' })], new Set());
  expect(ktpResult).toEqual(
    expect.objectContaining({ created: 0, failed: 1, errors: [expect.objectContaining({ message: 'NIK KTP sudah dipakai' })] }),
  );
  expect(prisma.employee.create).not.toHaveBeenCalled();

  prisma.employee.findFirst.mockResolvedValue(null);
  prisma.employeeBankAccount.findFirst.mockResolvedValueOnce({ id: 'bank-existing' });
  const bankResult = await service.importRows('tenant-1', '90', [rowOf({ ktpNumber: '3201010101010009' })], new Set());
  expect(bankResult.errors[0].message).toBe('Nomor rekening sudah dipakai');
  expect(prisma.employee.create).not.toHaveBeenCalled();
});

it('does not advance the employee code when the bank insert fails', async () => {
  prisma.$transaction.mockRejectedValueOnce(
    Object.assign(new Error('unique'), { code: 'P2002', meta: { target: ['tenantId', 'bankNameKey', 'accountNumber'] } }),
  );
  const service = new EmployeeImportService(prisma as never);
  const result = await service.importRows(
    'tenant-1',
    '90',
    [rowOf({ row: 2 }), rowOf({ row: 3, ktpNumber: '3201010101010008', accountNumber: '888', bankName: 'BNI', bankNameKey: 'bni' })],
    new Set(),
  );
  expect(result.failed).toBe(1);
  expect(result.created).toBe(1);
  expect(result.errors[0].message).toBe('Nomor rekening sudah dipakai');
  expect(prisma.employee.create).toHaveBeenCalledWith(
    expect.objectContaining({ data: expect.objectContaining({ employeeCode: '900043' }) }),
  );
});
```

Tambahkan helper dan `beforeEach` ini di file spec yang sama. Tes yang sudah ada boleh tetap memakai objek literal, asalkan field barunya lengkap.

```typescript
import type { ParsedEmployeeRow } from './employee-import.types';

function rowOf(overrides: Partial<ParsedEmployeeRow> = {}): ParsedEmployeeRow {
  return {
    row: 2,
    firstName: 'Amir',
    lastName: 'Mufid',
    ktpNumber: '3201010101010001',
    gender: 'male',
    departmentId: 'dept-1',
    departmentLabel: 'Engineering',
    designationId: 'desig-1',
    designationLabel: 'Staff',
    employmentType: 'PERMANENT',
    email: null,
    phone: '0812',
    accountNumber: '1234567890',
    bankName: 'BCA',
    bankNameKey: 'bca',
    joinDate: null,
    ...overrides,
  };
}

beforeEach(() => {
  jest.clearAllMocks();
  prisma.employee.findMany.mockResolvedValue([{ employeeCode: '900042' }]);
  prisma.employee.findFirst.mockResolvedValue(null);
  prisma.employee.create.mockResolvedValue({ id: 'emp-1' });
  prisma.employeeBankAccount.findFirst.mockResolvedValue(null);
  prisma.employeeBankAccount.create.mockResolvedValue({ id: 'bank-1' });
  prisma.$transaction.mockImplementation(async (fn: (tx: typeof prisma) => Promise<void>) =>
    fn(prisma),
  );
});
```

Tambahkan tes pelanggaran unik KTP dari database:

```typescript
it('maps a KTP unique violation from the database', async () => {
  prisma.$transaction.mockRejectedValueOnce(
    Object.assign(new Error('unique'), {
      code: 'P2002',
      meta: { target: ['tenantId', 'ktpNumber'] },
    }),
  );
  const service = new EmployeeImportService(prisma as never);
  const result = await service.importRows('tenant-1', '90', [rowOf()], new Set());
  expect(result.created).toBe(0);
  expect(result.failed).toBe(1);
  expect(result.errors[0].message).toBe('NIK KTP sudah dipakai');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run dari `en-hrms-be-fe/backend`:

```bash
npx jest --watchAll=false src/modules/employees/import/employee-import.service.spec.ts
```

Expected: FAIL. `employee.create` belum menerima `ktpNumber`, dan `employeeBankAccount.create` belum dipanggil. `$transaction` belum ada sehingga tes juga bisa gagal karena `this.prisma.$transaction is not a function` sebelum implementasi.

- [ ] **Step 3: Write minimal implementation**

Di `schema.prisma`, pada model `Tenant` di samping `employeeSalaries`, tambahkan `employeeBankAccounts EmployeeBankAccount[]`. Pada model `Employee`, di samping `employeeSalaries`, tambahkan `bankAccounts EmployeeBankAccount[]`.

Tambahkan model:

```prisma
model EmployeeBankAccount {
  id            String   @id @default(uuid())
  tenantId      String
  employeeId    String
  accountNumber String
  bankName      String
  bankNameKey   String
  isPrimary     Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  tenant   Tenant   @relation(fields: [tenantId], references: [id])
  employee Employee @relation(fields: [employeeId], references: [id], onDelete: Cascade)

  @@unique([tenantId, bankNameKey, accountNumber])
  @@index([tenantId])
  @@index([employeeId])
  @@map("employee_bank_accounts")
}
```

Isi migrasi:

```sql
CREATE TABLE "employee_bank_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankNameKey" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_bank_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employee_bank_accounts_tenantId_bankNameKey_accountNumber_key" ON "employee_bank_accounts"("tenantId", "bankNameKey", "accountNumber");

CREATE INDEX "employee_bank_accounts_tenantId_idx" ON "employee_bank_accounts"("tenantId");

CREATE INDEX "employee_bank_accounts_employeeId_idx" ON "employee_bank_accounts"("employeeId");

CREATE UNIQUE INDEX "employee_bank_accounts_one_primary_per_employee" ON "employee_bank_accounts"("employeeId") WHERE "isPrimary" = true;

ALTER TABLE "employee_bank_accounts" ADD CONSTRAINT "employee_bank_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "employee_bank_accounts" ADD CONSTRAINT "employee_bank_accounts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
```

Indeks parsial hanya ada di SQL. Prisma schema tidak bisa menyatakannya. Jangan menghapusnya saat menyelaraskan schema.

Jalankan dari `en-hrms-be-fe/backend`:

```bash
npx prisma generate
```

Expected: Prisma Client selesai dibuat dan memuat `EmployeeBankAccount`.

Di `employee-import.service.ts`, sebelum `nextEmployeeCode`:

```typescript
const duplicateKtp = await this.prisma.employee.findFirst({
  where: { tenantId, ktpNumber: row.ktpNumber },
  select: { id: true },
});
if (duplicateKtp) {
  failed++;
  errors.push({ row: row.row, message: 'NIK KTP sudah dipakai', cells });
  continue;
}

const duplicateBank = await this.prisma.employeeBankAccount.findFirst({
  where: {
    tenantId,
    accountNumber: row.accountNumber,
    bankNameKey: row.bankNameKey,
  },
  select: { id: true },
});
if (duplicateBank) {
  failed++;
  errors.push({ row: row.row, message: 'Nomor rekening sudah dipakai', cells });
  continue;
}
```

Ganti `employee.create` tunggal dengan:

```typescript
await this.prisma.$transaction(async (tx) => {
  const employee = await tx.employee.create({
    data: {
      tenantId,
      employeeCode,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      phone: row.phone,
      gender: row.gender,
      ktpNumber: row.ktpNumber,
      departmentId: row.departmentId,
      designationId: row.designationId,
      employmentType: row.employmentType,
      joinDate,
      status: 'ACTIVE',
      ssoUserId: null,
    },
  });
  await tx.employeeBankAccount.create({
    data: {
      tenantId,
      employeeId: employee.id,
      accountNumber: row.accountNumber,
      bankName: row.bankName,
      bankNameKey: row.bankNameKey,
      isPrimary: true,
    },
  });
});
existingCodes.push(employeeCode);
```

`existingCodes.push` tetap di luar transaksi, hanya pada jalur sukses. Di `catch`:

```typescript
const unique = uniqueViolationMessage(err);
errors.push({
  row: row.row,
  message: unique ?? (err instanceof Error ? err.message : String(err)),
  cells,
});
```

```typescript
function uniqueViolationMessage(err: unknown): string | null {
  if (typeof err !== 'object' || err === null || (err as { code?: string }).code !== 'P2002') {
    return null;
  }
  const target = (err as { meta?: { target?: unknown } }).meta?.target;
  const text = Array.isArray(target) ? target.map(String).join(',') : String(target ?? '');
  if (text.includes('ktpNumber')) return 'NIK KTP sudah dipakai';
  if (text.includes('bankNameKey') || text.includes('accountNumber')) {
    return 'Nomor rekening sudah dipakai';
  }
  return null;
}
```

Cek email yang sudah ada tetap jalan lebih dulu dan tidak ikut diubah pesannya.

- [ ] **Step 4: Run test to verify it passes**

Run dari `en-hrms-be-fe/backend`:

```bash
npx jest --watchAll=false src/modules/employees/import
```

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/prisma/schema.prisma backend/prisma/migrations/20261107014000_employee_bank_accounts/migration.sql backend/src/modules/employees/import/employee-import.service.ts backend/src/modules/employees/import/employee-import.service.spec.ts
git commit -m "$(cat <<'EOF'
feat: store imported employee KTP and primary bank account

EOF
)"
```

---

### Task 3: Header dialog impor

**Files:**

- Modify: `frontend/src/components/employees/EmployeeImportDialog.tsx`
- Modify: `frontend/src/components/employees/EmployeeImportDialog.test.tsx`
- Test: `frontend/src/components/employees/EmployeeImportDialog.test.tsx`

**Interfaces:**

- Consumes: 12 string header dari Task 1. Salin nilainya. Frontend tidak mengimpor file backend.
- Produces: `IMPORT_DATA_COLUMNS` sama persis dengan `IMPORT_HEADERS`.

- [ ] **Step 1: Write the failing test**

Di tes `shows progress counts from the job status`, setelah assert yang sudah ada, tambahkan:

```typescript
for (const header of [
  'Nama depan',
  'Nama belakang',
  'NIK KTP',
  'NO TELPON',
  'JENIS KELAMIN',
  'NO REKENING',
  'NAMA BANK',
  'Departemen',
  'Jabatan',
  'Tipe kerja',
  'Email',
  'Tanggal bergabung',
]) {
  expect(screen.getByRole('columnheader', { name: header })).toBeInTheDocument();
}
```

- [ ] **Step 2: Run test to verify it fails**

Run dari `en-hrms-be-fe/frontend`:

```bash
npx jest --watchAll=false src/components/employees/EmployeeImportDialog.test.tsx
```

Expected: FAIL karena `NIK KTP` belum menjadi columnheader. Header lama masih `Telepon`.

- [ ] **Step 3: Write minimal implementation**

Ganti `IMPORT_DATA_COLUMNS` di `EmployeeImportDialog.tsx`:

```typescript
const IMPORT_DATA_COLUMNS = [
  'Nama depan',
  'Nama belakang',
  'NIK KTP',
  'NO TELPON',
  'JENIS KELAMIN',
  'NO REKENING',
  'NAMA BANK',
  'Departemen',
  'Jabatan',
  'Tipe kerja',
  'Email',
  'Tanggal bergabung',
] as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run dari `en-hrms-be-fe/frontend`:

```bash
npx jest --watchAll=false src/components/employees/EmployeeImportDialog.test.tsx
```

Expected: PASS.

Dari root workspace `eal`, jalankan `graphify update .` supaya graf mengikuti file yang berubah. Jangan masukkan `graphify-out/` ke commit.

- [ ] **Step 5: Commit**

```bash
git add frontend/src/components/employees/EmployeeImportDialog.tsx frontend/src/components/employees/EmployeeImportDialog.test.tsx
git commit -m "$(cat <<'EOF'
feat: show identity columns in the employee import dialog

EOF
)"
```

Jalankan git dari root repo `en-hrms-be-fe`.
