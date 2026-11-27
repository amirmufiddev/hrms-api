# Task 2 report: Tabel rekening dan transaksi simpan

## Implemented

- **Prisma**: Model `EmployeeBankAccount` dengan relasi ke `Tenant` dan `Employee` (cascade delete), `@@unique([tenantId, bankNameKey, accountNumber])`, indeks tenant/employee, `@@map("employee_bank_accounts")`. Relasi `employeeBankAccounts` / `bankAccounts` ditambahkan di `Tenant` dan `Employee`.
- **Migrasi SQL**: Tabel `employee_bank_accounts`, constraint FK, unique compound, indeks parsial `employee_bank_accounts_one_primary_per_employee` pada `employeeId` WHERE `isPrimary = true` (hanya di SQL, tidak di schema Prisma).
- **EmployeeImportService**: Sebelum `nextEmployeeCode`, pengecekan duplikat NIK (`employee.findFirst` by `ktpNumber`) dan duplikat rekening (`employeeBankAccount.findFirst` by `tenantId` + `accountNumber` + `bankNameKey`). Pembuatan karyawan + satu rekening `isPrimary: true` dalam `prisma.$transaction`. Field `gender`, `ktpNumber`, `phone` ikut ditulis ke `employee.create`. `existingCodes.push(employeeCode)` hanya setelah transaksi sukses. Helper `uniqueViolationMessage` memetakan `P2002` ke pesan NIK atau nomor rekening sesuai `meta.target`.
- **Tests**: Mock Prisma diperluas (`employeeBankAccount`, `$transaction`), `beforeEach` reset mock, helper `rowOf`, tes transaksi/duplikat/gagal bank/advance code/P2002 KTP; tes email memakai `findFirst.mockImplementation` untuk membedakan email vs KTP.

## TDD evidence

### RED (first run sebelum fix TypeScript)

Perintah: `npx jest --watchAll=false src/modules/employees/import/employee-import.service.spec.ts`

**Hasil:** suite gagal **compile** (bukan assertion): `TS7022` / `TS7024` karena objek `prisma` mereferensi dirinya sendiri di initializer `$transaction: jest.fn(async (fn) => fn(prisma))`, sehingga TypeScript memblok.

### Fix TDD

`$transaction` diinisialisasi sebagai `jest.fn()` kosong; implementasi `mockImplementation` hanya di `beforeEach` (tanpa self-reference di initializer).

### GREEN

1. Focused: `npx jest --watchAll=false src/modules/employees/import/employee-import.service.spec.ts` — **PASS**, 6 tests.
2. Import suite: `npx jest --watchAll=false src/modules/employees/import` — **PASS**, 8 suites, 32 tests.

## Lainnya

- `npx prisma generate` (dari `backend/`) sukses; client memuat `EmployeeBankAccount`.

## Files changed (commit)

- `backend/prisma/schema.prisma`
- `backend/prisma/migrations/20261107014000_employee_bank_accounts/migration.sql`
- `backend/src/modules/employees/import/employee-import.service.ts`
- `backend/src/modules/employees/import/employee-import.service.spec.ts`

## Self-review

- Perilaku selaras brief: satu transaksi, kode pegawai tidak maju jika transaksi gagal, pesan unik DB dan duplikat pra-cek.
- Mock `$transaction` tidak mengikuti persis snippet brief yang self-referential; perilaku sama (delegate ke `fn(prisma)`) tanpa error TS.
- Tidak mengubah file di luar daftar brief; tidak stage attendance / `.superpowers`.

## Concerns

- `graphify update .` dari root repo dijalankan setelah edit tetapi prosesnya berjalan lama di environment ini; jika graph lokal perlu mutakhir, jalankan ulang `graphify update .` secara manual dan pastikan selesai.
- File laporan ini (`task-2-report.md`) berada di path yang di-ignore git (`.gitignore` mengabaikan `docs/superpowers/plans/`), sehingga tidak ikut dalam commit — tetap ada di workspace untuk referensi lokal.
