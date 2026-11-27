# Task 7 Report: Dialog impor di halaman Employees

## Status

Implementasi selesai; tes fokus lulus.

## TDD Evidence

### RED (Step 2)

Command:

```bash
cd en-hrms-be-fe/frontend && yarn test src/components/employees/EmployeeImportDialog.test.tsx --no-coverage
```

Output (ringkas):

```
FAIL src/components/employees/EmployeeImportDialog.test.tsx
  ● Test suite failed to run
    Cannot find module './EmployeeImportDialog' from '...
Test Suites: 1 failed, 1 total
Tests:       0 total
```

### GREEN (Step 4)

Command: sama seperti di atas.

Output (ringkas):

```
PASS src/components/employees/EmployeeImportDialog.test.tsx
  EmployeeImportDialog
    ✓ shows progress counts from the job status
Test Suites: 1 passed, 1 total
Tests:       1 passed, 1 total
```

## Files Changed

| File | Change |
|------|--------|
| `frontend/src/lib/api.ts` | Menambah `downloadImportTemplate`, `enqueueImport`, `getImportStatus` pada `employeesApi` |
| `frontend/src/components/employees/EmployeeImportDialog.tsx` | Dialog impor baru (upload, template, polling, progress) |
| `frontend/src/components/employees/EmployeeImportDialog.test.tsx` | Tes fokus dari brief |
| `frontend/src/app/(protected)/employees/page.tsx` | Tombol Unduh template & Import di dalam `Can`; wiring `EmployeeImportDialog` + `loadEmployees` on completed |

## Implementation Notes

- **Polling:** Saat `jobId` prop atau `activeJobId` internal ada, `getImportStatus` dipanggil segera lalu setiap 1000 ms; interval dibersihkan saat unmount atau state `completed` / `failed`.
- **Progress UI:** Bar `processed/total`, teks `{created} berhasil`, `{failed} gagal`, daftar `Baris {row}: {message}`.
- **Upload:** Prefix divalidasi dengan `/^[1-9]\d$/`; pesan error verbatim dari brief. File `.xlsx` only.
- **409:** `jobId` dari `error.response.data` → lanjut mode progress.
- **Template:** `downloadBlob(..., 'template-import-karyawan.xlsx')` di dialog dan tombol header halaman.

## Self-Review

- Props dialog sesuai brief: `open`, `jobId`, `onClose`, `onCompleted`.
- `onCompleted` dipanggil sekali per siklus dialog terbuka (ref `completedNotifiedRef`), reset saat dialog ditutup.
- Menggunakan `Modal`, `Button`, `Input`, `FormError` dari `@/components/ui`.
- Tombol Unduh template / Import di kiri Add Employee, masih dalam `employees:create`.

## Concerns

1. **Cakupan tes:** Hanya satu tes progress; prefix invalid, enqueue sukses, 409, dan `onCompleted` belum diuji otomatis.
2. **`importJobId` di page:** State disiapkan tetapi saat ini hanya kosong; resume job dari URL/storage belum ada (di luar brief).
3. **`onCompleted` di dependency effect polling:** Jika parent mem-pass callback inline tanpa `useCallback`, effect bisa re-subscribe; risiko kecil untuk halaman saat ini karena `loadEmployees` stabil enough in practice.

## Commit

Tidak dilakukan (permintaan user: commit manual).
