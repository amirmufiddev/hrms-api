# Task 1 report: Header, parser, template, file gagal

## Implemented

- **`employee-import.types.ts`:** `IMPORT_HEADERS` 12 kolom sesuai Global Constraints; `ParsedEmployeeRow` berisi `ktpNumber`, `gender`, `accountNumber`, `bankName`, `bankNameKey`; `importRowToCells` mengembalikan 12 string (label jenis kelamin dari `gender`).
- **`employee-import-parser.ts`:** Ekspor `UNSAFE_EXCEL_NUMBER`; `cellString` dengan mode `plain` | `phone` | `identity` (unsafe integer pada identitas → sentinel; telepon aman tetap dapat prefiks `0` untuk pola `8…`); `parseGender`, `normalizeBankName`; `parseEmployeeSheet` dengan `seenKtp`, `seenBank`, validasi NIK/rekening/bank/jenis kelamin, pesan gabungan `; `, baris gagal tidak menambah set duplikat.
- **`employee-import-template.ts`:** Baris contoh 12 kolom; `numFmt = '@'` pada kolom 3 dan 6 (NIK, nomor rekening) untuk sheet Data dan Contoh; tanpa baris kosong tambahan.
- **Specs:** Parser suite sesuai brief; template & failed-export spec baru; processor/service spec disesuaikan header dan fixture.

## Deviasi singkat dari teks brief

- Pada tes *parses a valid row and skips a blank row*, baris Budi memakai `account: '9876543210'` dan `bank: 'Mandiri'` agar tidak bentrok dengan pasangan rekening baris Amir (aturan unik `(bankNameKey, accountNumber)`); kalau tetap sama dengan Amir, pesan error menjadi campuran dan tidak lagi `"Tipe kerja tidak valid"` saja.

## TDD evidence

**RED** (sesuai langkah 2 brief):

```bash
cd en-hrms-be-fe/backend && npx jest --watchAll=false src/modules/employees/import/employee-import-parser.spec.ts src/modules/employees/import/employee-import-template.spec.ts src/modules/employees/import/employee-import-failed-export.spec.ts
```

- Gagal: parser spec tidak compile (`ParsedEmployeeRow` belum punya `gender` / `ktpNumber` / `accountNumber`); template spec salah kolom (header 8); failed-export kolom alasan di posisi salah (8 vs 13).

**GREEN** (langkah 4):

```bash
cd en-hrms-be-fe/backend && npx jest --watchAll=false src/modules/employees/import
```

- **Pass:** 8 suites, 28 tests.

## Tests and results

| Command | Result |
|--------|--------|
| `npx jest --watchAll=false src/modules/employees/import` | PASS (8/8 suites, 28 tests) |

## Files changed (committed)

- `backend/src/modules/employees/import/employee-import.types.ts`
- `backend/src/modules/employees/import/employee-import-parser.ts`
- `backend/src/modules/employees/import/employee-import-parser.spec.ts`
- `backend/src/modules/employees/import/employee-import-template.ts`
- `backend/src/modules/employees/import/employee-import-template.spec.ts`
- `backend/src/modules/employees/import/employee-import-failed-export.spec.ts` (baru)
- `backend/src/modules/employees/import/employee-import.processor.spec.ts`
- `backend/src/modules/employees/import/employee-import.service.spec.ts`

## Self-review

- Header lama dengan `Telepon` ditolak oleh assert header (perbandingan posisi-ke-posisi).
- Duplikat: email, NIK, dan pasangan bank hanya ditambahkan ke set setelah baris lolos semua validasi.
- `EmployeeImportService` tidak diubah untuk menulis rekening ke DB (sesuai scope tugas).
- `graphify update` dijalankan pada folder import setelah perubahan.

## Concerns

- Satu baris data uji di parser spec disesuaikan (lihat deviasi) agar asersi pesan tunggal tetap bermakna di bawah aturan duplikat rekening.

## Commit

- `3004455` — `feat: validate identity columns on employee import`
