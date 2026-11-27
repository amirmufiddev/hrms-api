# Task 3: Header dialog impor — laporan

## Yang diimplementasikan

- **`EmployeeImportDialog.tsx`**: `IMPORT_DATA_COLUMNS` diganti menjadi 12 header persis seperti Task 1 / backend template: `Nama depan`, `Nama belakang`, `NIK KTP`, `NO TELPON`, `JENIS KELAMIN`, `NO REKENING`, `NAMA BANK`, `Departemen`, `Jabatan`, `Tipe kerja`, `Email`, `Tanggal bergabung`. Dialog progress (tabel header dan sel error) memakai konstanta ini.
- **`EmployeeImportDialog.test.tsx`**:
  - Tes `shows progress counts from the job status` memakai loop `columnheader` untuk semua 12 header (sesuai brief TDD).
  - Mock `cells` untuk baris error diperpanjang menjadi 12 elemen agar indeks kolom selaras dengan urutan baru (Departemen di kolom ke-8, Jabatan ke-9, Tipe kerja ke-10, Email ke-11, Tanggal bergabung ke-12); assertion teks `Unknown` dan `DAILY_WORKER` tetap valid.

Tidak ada perubahan backend. Frontend tidak mengimpor konstanta backend.

## TDD: RED dan GREEN

**RED** (setelah Step 1–2, sebelum implementasi dialog):

- Perintah: `npx jest --watchAll=false src/components/employees/EmployeeImportDialog.test.tsx` dari `frontend/`.
- Hasil: **FAIL** — `Unable to find an accessible element with the role "columnheader" and name "NIK KTP"`. Output menunjukkan header lama masih termasuk `Telepon`, bukan daftar 12 kolom identity-first.

**GREEN** (setelah Step 3–4):

- Perintah sama.
- Hasil: **PASS** — 3 tests passed (`EmployeeImportDialog`).

## File yang diubah

| File | Perubahan |
|------|-----------|
| `frontend/src/components/employees/EmployeeImportDialog.tsx` | `IMPORT_DATA_COLUMNS` → 12 header verbatim |
| `frontend/src/components/employees/EmployeeImportDialog.test.tsx` | Assert columnheader ×12; mock `cells` 12 elemen |

## Graphify

- Dari root `/home/amirmufid/works/eal`: `graphify update .` dijalankan setelah tes hijau; exit 0. `graphify-out/` **tidak** di-commit (sesuai brief).

## Self-review

- Urutan string header identik dengan brief; casing (`NO TELPON`, `NAMA BANK`, dll.) dipelihara.
- Tabel memetakan `cells[i]` ke `IMPORT_DATA_COLUMNS[i]`; perpanjangan mock menjaga perilaku visual tes.
- Tidak ada sentuhan pada API upload/polling hanya UI kolom.

## Concerns

- Mock `cells` memakai string kosong untuk kolom identitas/bank yang tidak dipakai dalam assert itu; jika di masa depan tes perlu memverifikasi nilai sel per kolom baru, mock bisa diperkaya.
- `graphify query` awal mengembalikan node dari proyek lain di monorepo; konteks impor HRMS tetap ditangani dengan membaca file target secara langsung setelah orientasi singkat.
