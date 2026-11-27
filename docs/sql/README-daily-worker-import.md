# Import Daily Worker (On Board CSV)

Script SQL untuk memasukkan karyawan **Daily Worker** ke HRMS **tanpa** akun SSO / tabel `users`.

## Prasyarat

1. Enum `DAILY_WORKER` sudah ada (migrasi `20261029130000_add_daily_worker_employment_type`):

   ```bash
   cd en-hrms-be-fe/backend && npx prisma migrate deploy
   ```

2. Tenant target: **PT Eiger Ekowisata Nusantara (EEN)** — `tenantId` `45f39972-f027-440c-ae15-59341f13d33e`.

## Regenerate SQL dari CSV

Jika file CSV di root monorepo berubah:

```bash
python3 en-hrms-be-fe/backend/scripts/generate-daily-worker-import.py
```

Output: `import-daily-workers-onboard.sql` (di folder ini).

## Jalankan import

```bash
psql "$DATABASE_URL" -f en-hrms-be-fe/docs/sql/import-daily-workers-onboard.sql
```

Atau dengan kredensial dev (sesuaikan host/db):

```bash
PGPASSWORD='...' psql -h 10.10.12.134 -U eal-dbadmin -d dev-en-hris \
  -f en-hrms-be-fe/docs/sql/import-daily-workers-onboard.sql
```

## Konvensi data

| CSV | HRMS |
|-----|------|
| NIK (KTP) | `ktpNumber` (16 digit, unik per tenant) |
| — | `employeeCode` — angka awalan **9**, 6–10 digit, auto `900001`, … |
| Nama | `firstName` + `lastName` (kata terakhir = belakang) |
| Join Date | `joinDate` (format bervariasi; kosong → `2026-01-01`) |
| Posisi / DEPT | `designationId` / `departmentId` (mapping ke master EEN) |
| — | `employmentType` = `DAILY_WORKER` |
| — | Email placeholder: `dw.{nik}@hrms-local.eigeradventureland.com` |
| — | `ssoUserId` NULL, **tidak** insert ke `users` |

Insert memakai `WHERE NOT EXISTS` pada `(tenantId, employeeCode)` agar aman dijalankan ulang.

## Backfill (sudah import pakai KTP sebagai employee code)

Jika data daily worker sudah terlanjur memakai NIK KTP di `employeeCode`:

```bash
cd en-hrms-be-fe/backend
python3 scripts/backfill-daily-worker-employee-codes.py --dry-run   # preview
python3 scripts/backfill-daily-worker-employee-codes.py             # jalankan
```

Script akan:

- Memindahkan KTP **16 digit** dari `employeeCode` → `ktpNumber`
- Mengganti `employeeCode` dengan kode awalan **9** (lanjut dari max existing, mis. `989335+`)
- Memperbarui email placeholder `dw.*@hrms-local...` dan `nik` di `attendance_punches` / `attendance_punch_jobs` jika ada

## Baris dilewati (CSV)

- NIK duplikat dalam file (baris 16, 40, 199) — hanya entri pertama yang di-import.
- Baris tanpa nama atau department tidak dikenali — tercatat sebagai komentar `-- SKIP` di file SQL.
