# Desain Rebranding HRMS & Dokumentasi Produk

## Intent & Why
Menghilangkan seluruh identitas merek lama (`EIGER`, `EAL`, `Nature`, `EN`, `Adventure`) dari antarmuka, PDF/template backend, aset logo, dan dokumentasi, serta menstandarkan nama produk menjadi **HRMS** lengkap dengan deskripsi produk dan minimal 5 screenshot asli dari aplikasi yang berjalan.

## Goals & Non-Goals
- **Goals:**
  - Mengganti seluruh teks, `title`, `alt`, fallback PDF slip gaji, dan contoh email template yang menyebut merek lama menjadi **HRMS** generik.
  - Mengganti `frontend/public/logo.png` dan `frontend/public/icon-512.png` dengan logo **HRMS** netral.
  - Memperbarui `DESKRIPSI.md` dengan 7 bagian: `Description`, `Overview`, `Client`, `Service`, `Tech Stack`, `Features`, dan `Screenshots` (minimal 5 screenshot unggulan dari aplikasi lokal yang dijalankan).
  - Menjaga seluruh unit test yang ada tetap lulus (termasuk menyesuaikan assertion test jika ada yang menguji teks branding lama).
- **Non-Goals / Constraints:**
  - Tidak mengubah `SSO_SERVICE_APP_KEY`, URL `.env` SSO, atau nama database/volume Docker agar kompatibilitas integrasi SSO dan environment lokal tetap terjaga.

## Approaches
1. **Pendekatan A — Rebranding Aman + Logo Baru + Screenshot via Docker Lokal (Dipilih):** Mengubah seluruh permukaan produk yang terlihat pengguna (UI, aset gambar, fallback PDF, template import, dan `DESKRIPSI.md`) sambil menjaga key/env teknis eksternal tetap kompatibel.
2. **Pendekatan B — Rebranding Total hingga Key Teknis & Env:** Berisiko memutus koneksi SSO eksternal dan merusak setup database lokal tanpa nilai tambah visual/dokumentasi.

## Decisions & Scope
- **Frontend:** `layout.tsx`, `Sidebar.tsx`, `Spinner.tsx`, `(auth)/login/page.tsx`, `admin/departments/page.tsx`, `admin/designations/page.tsx`, `frontend/public/logo.png`, `frontend/public/icon-512.png`, serta penyesuaian test terkait (`Sidebar.test.tsx`).
- **Backend:** `payroll-pdf.service.ts`, `payroll.controller.ts`, `employee-import-template.ts`, serta test terkait jika ada.
- **Screenshots:** Menjalankan stack lokal via `docker compose` (seed `admin@example.com`), mengambil minimal 5 screenshot halaman unggulan (Dashboard, Direktori/Bagan Organisasi, Absensi, Cuti, Payroll/Slip Gaji) ke `docs/screenshots/`.
- **Dokumentasi:** Memperbarui `DESKRIPSI.md` dengan struktur 7 bagian yang diminta (`Client` ditulis sebagai perusahaan multi-entitas / enterprise).
