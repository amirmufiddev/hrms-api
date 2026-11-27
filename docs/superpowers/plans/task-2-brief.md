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

