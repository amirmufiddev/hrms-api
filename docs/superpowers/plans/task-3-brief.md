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

