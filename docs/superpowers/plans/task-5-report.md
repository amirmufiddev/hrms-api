# Task 5 Report: Menyimpan baris tanpa SSO

## Status

**DONE** — kedua tes di `employee-import.service.spec.ts` lulus.

## RED (Step 2)

Perintah:

```bash
cd en-hrms-be-fe/backend && yarn test src/modules/employees/import/employee-import.service.spec.ts --no-coverage
```

Output:

```
FAIL src/modules/employees/import/employee-import.service.spec.ts
  ● Test suite failed to run

    src/modules/employees/import/employee-import.service.spec.ts:1:39 - error TS2307: Cannot find module './employee-import.service' or its corresponding type declarations.

Test Suites: 1 failed, 1 total
Tests:       0 total
```

Sesuai ekspektasi brief: modul belum ada.

## GREEN (Step 4)

Perintah yang sama setelah implementasi.

Output:

```
PASS src/modules/employees/import/employee-import.service.spec.ts
  EmployeeImportService.importRows
    ✓ creates the next code and stores a null email (23 ms)
    ✓ records a row failure when the email already exists and continues (1 ms)

Test Suites: 1 passed, 1 total
Tests:       2 passed, 2 total
```

## Files changed

| File | Action |
|------|--------|
| `backend/src/modules/employees/import/employee-import.service.ts` | Created |
| `backend/src/modules/employees/import/employee-import.service.spec.ts` | Created |

## Implementasi ringkas

`EmployeeImportService` menerima `PrismaService` lewat constructor (sesuai mock `prisma as never` di tes).

`importRows`:

1. `findMany` kode karyawan tenant dengan `employeeCode` diawali `prefix`.
2. Untuk tiap baris: cek duplikat email (`existingEmails` atau `findFirst`); jika bentrok → `Email sudah dipakai`, increment `failed`, lanjut baris berikutnya.
3. `nextEmployeeCode(prefix, existingCodes)`; error ditangkap ke `errors`, tidak dilempar.
4. `create` dengan `ssoUserId: null`, `status: 'ACTIVE'`, `joinDate` dari ISO date baris atau `jakartaJoinDate()`.
5. Kode baru didorong ke `existingCodes` agar baris berikutnya tidak bentrok.

Tidak memanggil `EmployeesService.create` atau klien SSO.

## Self-review

- Constructor dan signature `importRows` sesuai brief.
- Pesan error email persis `Email sudah dipakai`.
- Urutan cek: `existingEmails` dulu, baru `findFirst` (efisien untuk email yang sudah diketahui dari sheet).
- Error `nextEmployeeCode` dan `create` dicatat per baris tanpa menghentikan import.

## Concerns

- Tes kedua mem-mock `findFirst` tetapi baris gagal sebenarnya karena `existingEmails`; `findFirst` tidak terpanggil untuk baris itu — mock redundant tapi tidak memengaruhi assertion.
- Belum ada tes integrasi Prisma nyata; hanya unit mock seperti brief.
- Commit sengaja tidak dijalankan (instruksi user).

## Commits

Tidak ada (user commit manual).
