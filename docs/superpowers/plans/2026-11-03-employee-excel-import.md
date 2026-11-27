# Employee Excel Import Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Import karyawan HRMS dari `.xlsx` lewat antrean BullMQ, dengan progress di halaman Employees, tanpa membuat akun SSO.

**Architecture:** Request unggah hanya menyimpan file dan memasukkan job `employee-import`. Worker membaca sheet `Data`, mengalokasikan NIK 6 digit dari prefix, lalu membuat karyawan per baris. Layar mem-poll `GET /api/employees/import/:jobId` sekali per detik.

**Tech Stack:** NestJS, Prisma, BullMQ, ExcelJS, Next.js, Jest.

## Global Constraints

- Akun SSO tidak dibuat.
- Header sheet `Data`: `Nama depan`, `Nama belakang`, `Departemen`, `Tipe kerja`, `Email`, `Telepon`, `Tanggal bergabung`.
- Sheet `Contoh` tidak diimpor.
- Prefix NIK tepat 2 digit, `10`–`99`. Kode = prefix + 4 digit urutan. Belum ada data mulai `0001`. Habis di `9999` membuat baris gagal.
- Email boleh kosong. Email non-kosong yang sama di perusahaan yang sama membuat baris gagal.
- Tanggal bergabung kosong memakai tanggal kalender Asia/Jakarta.
- Departemen dicocokkan kode persis, lalu nama tanpa membedakan huruf besar.
- Tipe kerja: `PERMANENT`, `CONTRACT`, `TEMPORARY`, `INTERN`, `DAILY_WORKER`.
- Satu baris gagal tidak menghentikan baris lain. Baris kosong dilewati dan tidak dihitung.
- File `.xlsx` saja, maksimum 5 MB, maksimum 5000 baris data. Pelanggaran ditolak saat unggah.
- Impor kedua untuk perusahaan yang sama, selagi job menunggu atau berjalan, ditolak HTTP 409 beserta id dan status job yang sedang berjalan.
- Header sheet `Data` yang salah membuat job `failed` dan tidak ada karyawan yang dibuat.
- Izin unduh, unggah, dan status: `employees:create`.
- Form tambah karyawan satu per satu tidak berubah.
- Antrean bernama `employee-import`.

---

### Task 1: Email karyawan boleh kosong

**Files:**

- Modify: `en-hrms-be-fe/backend/prisma/schema.prisma` (field `Employee.email`)
- Create: `en-hrms-be-fe/backend/prisma/migrations/20261103210000_employee_email_optional/migration.sql`
- Test: `en-hrms-be-fe/backend/src/modules/employees/import/employee-email-optional.spec.ts`

**Interfaces:**

- Consumes: model `Employee` yang ada.
- Produces: `Employee.email` bertipe `String?`. `@@unique([tenantId, email])` tetap.

- [ ] **Step 1: Write the failing test**

```ts
import { Prisma } from '@prisma/client';

describe('Employee.email', () => {
  it('is optional on the Prisma model', () => {
    const field = Prisma.dmmf.datamodel.models
      .find((model) => model.name === 'Employee')
      ?.fields.find((item) => item.name === 'email');

    expect(field?.isRequired).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd en-hrms-be-fe/backend && yarn test src/modules/employees/import/employee-email-optional.spec.ts --no-coverage`

Expected: FAIL because `field.isRequired` is `true`.

- [ ] **Step 3: Write minimal implementation**

Di `schema.prisma`, ubah field employee menjadi `email String?`.

Buat `migration.sql`:

```sql
ALTER TABLE "employees" ALTER COLUMN "email" DROP NOT NULL;
```

Jangan mengubah `@@unique([tenantId, email])`. PostgreSQL mengizinkan banyak `NULL` pada indeks unik.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd en-hrms-be-fe/backend && yarn prisma generate && yarn test src/modules/employees/import/employee-email-optional.spec.ts --no-coverage`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add en-hrms-be-fe/backend/prisma/schema.prisma en-hrms-be-fe/backend/prisma/migrations/20261103210000_employee_email_optional en-hrms-be-fe/backend/src/modules/employees/import/employee-email-optional.spec.ts
git commit -m "feat: allow employee records without an email"
```

### Task 2: Pengalokasi kode NIK

**Files:**

- Create: `en-hrms-be-fe/backend/src/modules/employees/import/nik-sequence.ts`
- Test: `en-hrms-be-fe/backend/src/modules/employees/import/nik-sequence.spec.ts`

**Interfaces:**

- Consumes: tidak ada.
- Produces:
  - `assertNikPrefix(prefix: string): string`
  - `nextEmployeeCode(prefix: string, existingCodes: string[]): string`

- [ ] **Step 1: Write the failing test**

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd en-hrms-be-fe/backend && yarn test src/modules/employees/import/nik-sequence.spec.ts --no-coverage`

Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

```ts
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd en-hrms-be-fe/backend && yarn test src/modules/employees/import/nik-sequence.spec.ts --no-coverage`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add en-hrms-be-fe/backend/src/modules/employees/import/nik-sequence.ts en-hrms-be-fe/backend/src/modules/employees/import/nik-sequence.spec.ts
git commit -m "feat: allocate 6-digit employee codes from a prefix"
```

### Task 3: Parser baris Excel

**Files:**

- Create: `en-hrms-be-fe/backend/src/modules/employees/import/employee-import.types.ts`
- Create: `en-hrms-be-fe/backend/src/modules/employees/import/employee-import-parser.ts`
- Test: `en-hrms-be-fe/backend/src/modules/employees/import/employee-import-parser.spec.ts`

**Interfaces:**

- Consumes: tidak ada.
- Produces:
  - `IMPORT_HEADERS`
  - `ParsedEmployeeRow`
  - `parseEmployeeSheet(rows: unknown[][], departments: { id: string; name: string; code: string }[]): { rows: ParsedEmployeeRow[]; errors: { row: number; message: string }[] }`
  - `assertImportHeaders(header: unknown[]): void`
  - `jakartaJoinDate(now?: Date): Date`

- [ ] **Step 1: Write the failing test**

```ts
import { assertImportHeaders, parseEmployeeSheet } from './employee-import-parser';

const departments = [{ id: 'dept-1', name: 'Engineering', code: 'ENG' }];

describe('parseEmployeeSheet', () => {
  const header = [
    'Nama depan',
    'Nama belakang',
    'Departemen',
    'Tipe kerja',
    'Email',
    'Telepon',
    'Tanggal bergabung',
  ];

  it('rejects a header that does not match the template', () => {
    expect(() => assertImportHeaders(['Nama'])).toThrow('Header sheet Data tidak sesuai template');
  });

  it('parses a valid row and skips a blank row', () => {
    const result = parseEmployeeSheet(
      [
        header,
        ['Amir', 'Mufid', 'ENG', 'PERMANENT', '', '0812', ''],
        ['', '', '', '', '', '', ''],
        ['Budi', 'Santoso', 'Tidak Ada', 'MAGIC', 'budi@eiger.test', '', '2026-01-15'],
      ],
      departments,
    );

    expect(result.rows).toEqual([
      expect.objectContaining({
        row: 2,
        firstName: 'Amir',
        lastName: 'Mufid',
        departmentId: 'dept-1',
        employmentType: 'PERMANENT',
        email: null,
        phone: '0812',
        joinDate: null,
      }),
    ]);
    expect(result.errors.map((error) => error.row)).toEqual([4]);
    expect(result.errors[0].message).toContain('Departemen tidak ditemukan');
    expect(result.errors[0].message).toContain('Tipe kerja tidak valid');
  });

  it('rejects a duplicate email inside the same file on the second row', () => {
    const result = parseEmployeeSheet(
      [
        header,
        ['Amir', 'Mufid', 'engineering', 'CONTRACT', 'amir@eiger.test', '', '2026-02-01'],
        ['Sari', 'Putri', 'Engineering', 'INTERN', 'amir@eiger.test', '', ''],
      ],
      departments,
    );

    expect(result.rows).toHaveLength(1);
    expect(result.errors[0]).toEqual({
      row: 3,
      message: 'Email sudah dipakai',
    });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd en-hrms-be-fe/backend && yarn test src/modules/employees/import/employee-import-parser.spec.ts --no-coverage`

Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

`employee-import.types.ts`:

```ts
export const IMPORT_HEADERS = [
  'Nama depan',
  'Nama belakang',
  'Departemen',
  'Tipe kerja',
  'Email',
  'Telepon',
  'Tanggal bergabung',
] as const;

export const EMPLOYMENT_TYPES = [
  'PERMANENT',
  'CONTRACT',
  'TEMPORARY',
  'INTERN',
  'DAILY_WORKER',
] as const;

export type EmploymentTypeValue = (typeof EMPLOYMENT_TYPES)[number];

export type ParsedEmployeeRow = {
  row: number;
  firstName: string;
  lastName: string;
  departmentId: string;
  employmentType: EmploymentTypeValue;
  email: string | null;
  phone: string | null;
  joinDate: string | null;
};

export type ImportRowError = { row: number; message: string };
```

`employee-import-parser.ts` mengimplementasikan:

- `assertImportHeaders` membandingkan 7 sel pertama, setelah `trim`, dengan `IMPORT_HEADERS`.
- `parseEmployeeSheet` melempar error header yang sama bila baris pertama salah.
- Sel dibaca sebagai string `trim`. Baris yang semua selnya kosong dilewati.
- Nama depan dan nama belakang kosong menambah error `Nama depan wajib diisi` atau `Nama belakang wajib diisi` dan baris tidak masuk `rows`.
- Departemen: cari `code` yang persis sama, lalu `name.trim().toLowerCase()`. Gagal dengan `Departemen tidak ditemukan`.
- Tipe kerja di luar `EMPLOYMENT_TYPES` gagal dengan `Tipe kerja tidak valid`.
- Email kosong menjadi `null`. Email diisi harus lolos `/^[^\s@]+@[^\s@]+\.[^\s@]+$/`. Email yang sudah muncul di `rows` gagal dengan `Email sudah dipakai`.
- Telepon kosong menjadi `null`.
- Tanggal kosong menjadi `null`. Tanggal terisi harus `YYYY-MM-DD` yang valid menurut `Date.UTC`; gagal dengan `Tanggal bergabung tidak valid`.
- Satu baris boleh mengumpulkan beberapa alasan, digabung dengan `; `.
- `jakartaJoinDate` memakai `Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Jakarta', year: 'numeric', month: '2-digit', day: '2-digit' })` dan mengembalikan `Date` pada `YYYY-MM-DDT00:00:00.000Z`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd en-hrms-be-fe/backend && yarn test src/modules/employees/import/employee-import-parser.spec.ts --no-coverage`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add en-hrms-be-fe/backend/src/modules/employees/import/employee-import.types.ts en-hrms-be-fe/backend/src/modules/employees/import/employee-import-parser.ts en-hrms-be-fe/backend/src/modules/employees/import/employee-import-parser.spec.ts
git commit -m "feat: parse employee import rows"
```

### Task 4: File template

**Files:**

- Create: `en-hrms-be-fe/backend/src/modules/employees/import/employee-import-template.ts`
- Test: `en-hrms-be-fe/backend/src/modules/employees/import/employee-import-template.spec.ts`

**Interfaces:**

- Consumes: `IMPORT_HEADERS` dari Task 3.
- Produces: `buildEmployeeImportTemplate(): Promise<Buffer>`

- [ ] **Step 1: Write the failing test**

```ts
import ExcelJS from 'exceljs';
import { buildEmployeeImportTemplate } from './employee-import-template';
import { IMPORT_HEADERS } from './employee-import.types';

describe('buildEmployeeImportTemplate', () => {
  it('writes headers on Data and one sample on Contoh', async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await buildEmployeeImportTemplate());

    const data = workbook.getWorksheet('Data');
    const sample = workbook.getWorksheet('Contoh');
    const headers = IMPORT_HEADERS.map((_, index) => data?.getRow(1).getCell(index + 1).value);

    expect(headers).toEqual([...IMPORT_HEADERS]);
    expect(data?.rowCount).toBe(1);
    expect(sample?.getRow(2).getCell(1).value).toBe('Amir');
    expect(sample?.getRow(2).getCell(4).value).toBe('PERMANENT');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd en-hrms-be-fe/backend && yarn test src/modules/employees/import/employee-import-template.spec.ts --no-coverage`

Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

`buildEmployeeImportTemplate` membuat workbook ExcelJS. Sheet `Data` hanya baris header `IMPORT_HEADERS`. Sheet `Contoh` memakai header yang sama dan satu baris: `Amir`, `Mufid`, `Engineering`, `PERMANENT`, `amir@eiger.test`, `08123456789`, `2026-01-15`. Kembalikan `Buffer.from(await workbook.xlsx.writeBuffer())`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd en-hrms-be-fe/backend && yarn test src/modules/employees/import/employee-import-template.spec.ts --no-coverage`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add en-hrms-be-fe/backend/src/modules/employees/import/employee-import-template.ts en-hrms-be-fe/backend/src/modules/employees/import/employee-import-template.spec.ts
git commit -m "feat: add the employee import workbook template"
```

### Task 5: Menyimpan baris tanpa SSO

**Files:**

- Create: `en-hrms-be-fe/backend/src/modules/employees/import/employee-import.service.ts`
- Test: `en-hrms-be-fe/backend/src/modules/employees/import/employee-import.service.spec.ts`

**Interfaces:**

- Consumes: `nextEmployeeCode`, `parseEmployeeSheet`, `jakartaJoinDate`, `ParsedEmployeeRow`.
- Produces:
  - `EmployeeImportService.importRows(tenantId: string, prefix: string, rows: ParsedEmployeeRow[], existingEmails: Set<string>): Promise<{ created: number; failed: number; errors: { row: number; message: string }[] }>`

- [ ] **Step 1: Write the failing test**

```ts
import { EmployeeImportService } from './employee-import.service';

describe('EmployeeImportService.importRows', () => {
  const prisma = {
    employee: {
      findMany: jest.fn().mockResolvedValue([{ employeeCode: '900042' }]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'emp-1' }),
    },
  };

  it('creates the next code and stores a null email', async () => {
    const service = new EmployeeImportService(prisma as never);
    const result = await service.importRows(
      'tenant-1',
      '90',
      [
        {
          row: 2,
          firstName: 'Amir',
          lastName: 'Mufid',
          departmentId: 'dept-1',
          employmentType: 'PERMANENT',
          email: null,
          phone: null,
          joinDate: null,
        },
      ],
      new Set(),
    );

    expect(result.created).toBe(1);
    expect(prisma.employee.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          employeeCode: '900043',
          email: null,
          ssoUserId: null,
          departmentId: 'dept-1',
          employmentType: 'PERMANENT',
          status: 'ACTIVE',
        }),
      }),
    );
  });

  it('records a row failure when the email already exists and continues', async () => {
    prisma.employee.findFirst.mockResolvedValueOnce({ id: 'existing' });
    const service = new EmployeeImportService(prisma as never);
    const result = await service.importRows(
      'tenant-1',
      '90',
      [
        {
          row: 2,
          firstName: 'Amir',
          lastName: 'Mufid',
          departmentId: 'dept-1',
          employmentType: 'PERMANENT',
          email: 'amir@eiger.test',
          phone: null,
          joinDate: '2026-01-15',
        },
        {
          row: 3,
          firstName: 'Sari',
          lastName: 'Putri',
          departmentId: 'dept-1',
          employmentType: 'INTERN',
          email: null,
          phone: null,
          joinDate: null,
        },
      ],
      new Set(['amir@eiger.test']),
    );

    expect(result.failed).toBe(1);
    expect(result.created).toBe(1);
    expect(result.errors[0].message).toBe('Email sudah dipakai');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd en-hrms-be-fe/backend && yarn test src/modules/employees/import/employee-import.service.spec.ts --no-coverage`

Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

`EmployeeImportService` menerima `PrismaService`. `importRows`:

- Mengambil `employeeCode` 6 digit di tenant yang diawali prefix lewat `findMany`.
- Menyimpan daftar kode itu di memori dan memanggil `nextEmployeeCode` setiap baris berhasil, lalu mendorong kode baru ke daftar supaya baris berikutnya tidak bentrok.
- Sebelum `create`, kalau `email` ada di `existingEmails` atau `findFirst({ where: { tenantId, email } })` ketemu, catat `Email sudah dipakai` dan lanjut.
- `create` mengisi `tenantId`, `employeeCode`, `firstName`, `lastName`, `email`, `phone`, `departmentId`, `employmentType`, `joinDate` (`row.joinDate` sebagai `new Date(row.joinDate + 'T00:00:00.000Z')` atau `jakartaJoinDate()`), `status: 'ACTIVE'`, `ssoUserId: null`.
- Kesalahan `nextEmployeeCode` dan kesalahan create dicatat di `errors`, tidak dilempar.
- Tidak memanggil `EmployeesService.create` dan tidak memanggil klien SSO.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd en-hrms-be-fe/backend && yarn test src/modules/employees/import/employee-import.service.spec.ts --no-coverage`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add en-hrms-be-fe/backend/src/modules/employees/import/employee-import.service.ts en-hrms-be-fe/backend/src/modules/employees/import/employee-import.service.spec.ts
git commit -m "feat: create imported employees without SSO accounts"
```

### Task 6: Antrean, unggah, dan status

**Files:**

- Modify: `en-hrms-be-fe/backend/src/common/queue/queue.module.ts`
- Create: `en-hrms-be-fe/backend/src/modules/employees/import/employee-import.processor.ts`
- Create: `en-hrms-be-fe/backend/src/modules/employees/import/employee-import.controller.ts`
- Modify: `en-hrms-be-fe/backend/src/modules/employees/employees.module.ts`
- Test: `en-hrms-be-fe/backend/src/modules/employees/import/employee-import.controller.spec.ts`
- Test: `en-hrms-be-fe/backend/src/modules/employees/import/employee-import.processor.spec.ts`

**Interfaces:**

- Consumes: `buildEmployeeImportTemplate`, `assertImportHeaders`, `parseEmployeeSheet`, `EmployeeImportService.importRows`, `assertNikPrefix`.
- Produces:
  - `POST /api/employees/import`
  - `GET /api/employees/import/template`
  - `GET /api/employees/import/:jobId`
  - Job data `{ tenantId: string; filePath: string; nikPrefix: string }`
  - Progress `{ total: number; processed: number; created: number; failed: number; errors: { row: number; message: string }[] }`

- [ ] **Step 1: Write the failing controller test**

```ts
import { ConflictException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { EmployeeImportController } from './employee-import.controller';
import { overrideJwtAuthGuard } from '../../../test/helpers';

describe('EmployeeImportController', () => {
  const queue = {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    getJobs: jest.fn().mockResolvedValue([]),
    getJob: jest.fn(),
  };

  it('returns the job id without importing rows', async () => {
    const module = await overrideJwtAuthGuard(
      Test.createTestingModule({
        controllers: [EmployeeImportController],
        providers: [{ provide: getQueueToken('employee-import'), useValue: queue }],
      }),
    ).compile();
    const controller = module.get(EmployeeImportController);

    await expect(
      controller.enqueue(
        { tenantId: 'tenant-1' } as never,
        { nikPrefix: '90' },
        {
          buffer: Buffer.from('xlsx'),
          originalname: 'karyawan.xlsx',
          size: 4,
          mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        } as never,
      ),
    ).resolves.toEqual({ jobId: 'job-1' });
    expect(queue.add).toHaveBeenCalledWith(
      'import',
      expect.objectContaining({ tenantId: 'tenant-1', nikPrefix: '90' }),
    );
  });

  it('rejects a second active import for the same tenant', async () => {
    queue.getJobs.mockResolvedValueOnce([
      { id: 'job-9', data: { tenantId: 'tenant-1' }, getState: async () => 'active' },
    ]);
    const module = await overrideJwtAuthGuard(
      Test.createTestingModule({
        controllers: [EmployeeImportController],
        providers: [{ provide: getQueueToken('employee-import'), useValue: queue }],
      }),
    ).compile();
    const controller = module.get(EmployeeImportController);

    await expect(
      controller.enqueue({ tenantId: 'tenant-1' } as never, { nikPrefix: '90' }, {
        buffer: Buffer.from('xlsx'),
        originalname: 'karyawan.xlsx',
        size: 4,
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd en-hrms-be-fe/backend && yarn test src/modules/employees/import/employee-import.controller.spec.ts --no-coverage`

Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

Di `queue.module.ts`, tambahkan `{ name: 'employee-import' }` pada `BullModule.registerQueue` yang sudah ada. Jangan daftarkan processor di sana.

`EmployeeImportController`:

- `@Controller('employees/import')`, guard yang sama dengan `EmployeesController`, izin `employees:create`.
- `GET template` mengirim buffer dari `buildEmployeeImportTemplate` dengan nama `template-import-karyawan.xlsx`.
- `POST` memakai `FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } })` dan body `nikPrefix`.
- Tolak file kosong, ekstensi selain `.xlsx`, dan prefix lewat `assertNikPrefix`.
- `getJobs(['waiting', 'active'])`. Kalau ada job dengan `data.tenantId` yang sama, lempar `ConflictException` body `{ jobId, state, progress }`.
- Tulis buffer ke `path.join(os.tmpdir(), 'hrms-employee-import', '${randomUUID()}.xlsx')`.
- Baca workbook hanya untuk menghitung baris non-kosong di sheet `Data`. Lebih dari 5000 ditolak sebelum `queue.add`, dan file sementara dihapus.
- `queue.add('import', { tenantId, filePath, nikPrefix })` lalu kembalikan `{ jobId }`.
- `GET :jobId` membaca job. Tenant yang tidak sama mengembalikan 404. State `waiting`, `active`, `completed`, atau `failed`. Progress default nol bila belum ada.

`EmployeeImportProcessor` pada queue `employee-import`:

- Buka file dengan ExcelJS. Sheet `Data` wajib ada.
- Panggil `assertImportHeaders`. Kalau gagal, hapus file dan lempar error supaya state job menjadi `failed`.
- `parseEmployeeSheet` dengan departemen `findMany` tenant itu (`id`, `name`, `code`).
- Kumpulkan email yang sudah ada di tenant untuk email non-kosong pada baris valid.
- Panggil `importRows`.
- `job.updateProgress` setelah parser dan setelah `importRows`, dengan `total` = jumlah `rows + errors` parser, `processed` = total itu, `created`, `failed`, dan `errors` gabungan parser serta service.
- Selalu hapus file di `finally`.

`employees.module.ts` mengimpor `BullModule.registerQueue({ name: 'employee-import' })` hanya bila `process.env.REDIS_ENABLED === 'true'`, lalu menyediakan controller, service, dan processor. Token inject queue: `@InjectQueue('employee-import')`.

Constructor controller menerima `@InjectQueue('employee-import') private readonly queue: Queue`. Di tes, provider-nya `{ provide: getQueueToken('employee-import'), useValue: queue }` dari `@nestjs/bullmq`. Jangan memakai token string `EMPLOYEE_IMPORT_QUEUE`.

- [ ] **Step 4: Run test to verify it passes**

Tambahkan `employee-import.processor.spec.ts` yang memberi workbook dengan header salah dan mengharapkan `unlink` terpanggil serta error `Header sheet Data tidak sesuai template` dilempar sebelum `importRows`.

Run: `cd en-hrms-be-fe/backend && yarn test src/modules/employees/import/employee-import.controller.spec.ts src/modules/employees/import/employee-import.processor.spec.ts --no-coverage`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add en-hrms-be-fe/backend/src/common/queue/queue.module.ts en-hrms-be-fe/backend/src/modules/employees/employees.module.ts en-hrms-be-fe/backend/src/modules/employees/import/employee-import.controller.ts en-hrms-be-fe/backend/src/modules/employees/import/employee-import.processor.ts en-hrms-be-fe/backend/src/modules/employees/import/employee-import.controller.spec.ts en-hrms-be-fe/backend/src/modules/employees/import/employee-import.processor.spec.ts
git commit -m "feat: queue employee spreadsheet imports"
```

### Task 7: Dialog impor di halaman Employees

**Files:**

- Modify: `en-hrms-be-fe/frontend/src/lib/api.ts` (objek `employeesApi`)
- Create: `en-hrms-be-fe/frontend/src/components/employees/EmployeeImportDialog.tsx`
- Test: `en-hrms-be-fe/frontend/src/components/employees/EmployeeImportDialog.test.tsx`
- Modify: `en-hrms-be-fe/frontend/src/app/(protected)/employees/page.tsx` (blok tombol di samping Add Employee)

**Interfaces:**

- Consumes: endpoint Task 6.
- Produces: `employeesApi.downloadImportTemplate()`, `employeesApi.enqueueImport(file: File, nikPrefix: string)`, `employeesApi.getImportStatus(jobId: string)`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { EmployeeImportDialog } from './EmployeeImportDialog';

jest.mock('@/lib/api', () => ({
  employeesApi: {
    getImportStatus: jest.fn().mockResolvedValue({
      data: {
        jobId: 'job-1',
        state: 'active',
        progress: { total: 10, processed: 4, created: 3, failed: 1, errors: [{ row: 5, message: 'Departemen tidak ditemukan' }] },
      },
    }),
  },
}));

describe('EmployeeImportDialog', () => {
  it('shows progress counts from the job status', async () => {
    render(
      <EmployeeImportDialog open jobId="job-1" onClose={jest.fn()} onCompleted={jest.fn()} />,
    );

    expect(await screen.findByText('3 berhasil')).toBeInTheDocument();
    expect(screen.getByText('1 gagal')).toBeInTheDocument();
    expect(screen.getByText('Baris 5: Departemen tidak ditemukan')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd en-hrms-be-fe/frontend && yarn test src/components/employees/EmployeeImportDialog.test.tsx --no-coverage`

Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

Pada `employeesApi`:

```ts
downloadImportTemplate: () =>
  api.get('/employees/import/template', { responseType: 'blob' }),
enqueueImport: (file: File, nikPrefix: string) => {
  const body = new FormData();
  body.append('file', file);
  body.append('nikPrefix', nikPrefix);
  return api.post<{ jobId: string }>('/employees/import', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
},
getImportStatus: (jobId: string) =>
  api.get<{
    jobId: string;
    state: 'waiting' | 'active' | 'completed' | 'failed';
    progress: {
      total: number;
      processed: number;
      created: number;
      failed: number;
      errors: { row: number; message: string }[];
    };
    failedReason?: string;
  }>(`/employees/import/${jobId}`),
```

`EmployeeImportDialog` memakai `Modal` yang sudah ada. Saat `jobId` kosong, tampilkan input prefix dan input file `.xlsx`, plus tombol unduh template. Prefix yang tidak lolos `/^[1-9]\d$/` menampilkan `Prefix NIK harus 2 digit dari 10 sampai 99` dan tidak mengunggah. Setelah `enqueueImport` sukses, simpan `jobId` dan poll `getImportStatus` setiap 1000 ms. Tampilkan batang progress `processed / total`, teks `N berhasil`, teks `N gagal`, dan `Baris {row}: {message}`. Pada `completed`, panggil `onCompleted` sekali. Pada `failed`, tampilkan `failedReason`. Pada response 409, ambil `jobId` dari body dan lanjut menampilkan progress job itu.

Di `employees/page.tsx`, di dalam `Can permission="employees:create"` dan di sebelah kiri tombol Add Employee, tambahkan tombol `Unduh template` dan `Import`. `Import` membuka dialog. `onCompleted` memanggil ulang pemuatan daftar karyawan.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd en-hrms-be-fe/frontend && yarn test src/components/employees/EmployeeImportDialog.test.tsx --no-coverage`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add en-hrms-be-fe/frontend/src/lib/api.ts en-hrms-be-fe/frontend/src/components/employees/EmployeeImportDialog.tsx en-hrms-be-fe/frontend/src/components/employees/EmployeeImportDialog.test.tsx en-hrms-be-fe/frontend/src/app/\(protected\)/employees/page.tsx
git commit -m "feat: show employee import progress on the employees page"
```
