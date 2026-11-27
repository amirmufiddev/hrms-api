# HRMS Rebranding & Product Documentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Menghilangkan seluruh identitas `EIGER`, `EAL`, `Nature`, `EN`, dan `Adventure` dari antarmuka, aset logo, fallback PDF/template backend, dan dokumentasi, menamainya **HRMS**, lalu menjalankan aplikasi untuk mengambil minimal 5 screenshot unggulan dan melengkapi `DESKRIPSI.md`.

**Architecture:** Rebranding dilakukan pada permukaan produk yang terlihat pengguna (frontend UI, `public/` assets, fallback PDF/template backend, dan `DESKRIPSI.md`), sedangkan key/URL integrasi SSO di `.env` dan `SSO_SERVICE_APP_KEY` dipertahankan agar kompatibilitas sistem tetap aman. Aplikasi dijalankan lokal via `docker compose` (seed `admin@example.com / password123`) untuk pengambilan screenshot asli via browser.

**Tech Stack:** Next.js 16, React 19, NestJS 11, Prisma 6, PostgreSQL 16, Jest, Testing Library, Docker Compose.

**Spec:** [2026-11-27-hrms-rebranding-design.md](file:///home/amirmufid/projects/eal/en-hrms-be-fe/docs/superpowers/specs/2026-11-27-hrms-rebranding-design.md)

## Global Constraints
- Tidak ada teks `EIGER`, `EAL`, `Nature`, `EN`, atau `Adventure` pada UI yang tampil ke pengguna, PDF slip gaji fallback, aset logo/ikon, maupun `DESKRIPSI.md`.
- Nama produk resmi adalah **HRMS**.
- `SSO_SERVICE_APP_KEY` dan URL `.env` SSO tidak diubah agar integrasi eksternal tetap kompatibel.
- Seluruh unit test frontend dan backend tetap lulus setelah perubahan.

## Review Focus
- Fallback logo di `Sidebar.tsx` saat `tenantLogoUrl` gagal dimuat harus menampilkan `alt="HRMS"` dan memuat `/logo.png` baru.
- Fallback perusahaan pada `payroll-pdf.service.ts` dan `payroll.controller.ts` saat `tenant` kosong tidak boleh menampilkan nama/email/footer merek lama.
- Contoh email pada template import Excel (`employee-import-template.ts`) tidak boleh memakai domain `@eiger.test`.
- Screenshot yang diambil harus berasal dari aplikasi yang benar-benar berjalan setelah rebranding (logo & judul baru terlihat).
- `DESKRIPSI.md` harus memuat ketujuh bagian yang diminta (`Description`, `Overview`, `Client`, `Service`, `Tech Stack`, `Features`, `Screenshots`) dengan minimal 5 tautan gambar valid.

---

### Task 1: Rebrand Frontend UI & Tests

**Files:**
- Modify: `frontend/src/app/layout.tsx:22`
- Modify: `frontend/src/components/layout/Sidebar.tsx:364`
- Modify: `frontend/src/components/ui/Spinner.tsx:51`
- Modify: `frontend/src/app/(auth)/login/page.tsx:63`
- Modify: `frontend/src/app/(protected)/admin/departments/page.tsx:185`
- Modify: `frontend/src/app/(protected)/admin/designations/page.tsx:305`
- Modify: `frontend/src/components/layout/Sidebar.test.tsx:65-79`
- Modify: `frontend/src/components/employees/OrganizationFields.test.tsx:44,60`
- Modify: `frontend/src/test/types-check.test.ts:14-26`

- [ ] **Step 1: Update `Sidebar.test.tsx`, `OrganizationFields.test.tsx`, dan `types-check.test.ts` ke branding HRMS/generik**
  Ganti `PT Eiger Ekowisata Nusantara (EEN)`, `Eiger Nature`, `EAL Corp`, `EAL`, dan URL `api-sso.eigeradventureland.dev` dengan nilai generik (`PT Nusantara Teknologi`, `HRMS`, `ACME Corp`, `ACME`, `https://sso.example.com/uploads/companies/logo.png`).
- [ ] **Step 2: Jalankan test frontend terkait untuk memverifikasi kegagalan sebelum update komponen**
  Run: `cd frontend && npx jest src/components/layout/Sidebar.test.tsx --no-coverage`
  Expected: FAIL pada `getByAltText('HRMS')`.
- [ ] **Step 3: Update seluruh teks branding pada komponen & halaman frontend**
  - `layout.tsx`: `title: 'HRMS'`, `description: 'Human Resource Management System'`
  - `Sidebar.tsx`, `Spinner.tsx`, `(auth)/login/page.tsx`: `alt="HRMS"`
  - `admin/departments/page.tsx` & `admin/designations/page.tsx`: hapus referensi `fe-sso` / `eal-rbac-api` menjadi keterangan generik portal SSO (`portal SSO`).
- [ ] **Step 4: Jalankan test frontend untuk verifikasi lulus**
  Run: `cd frontend && npx jest src/components/layout/Sidebar.test.tsx src/components/employees/OrganizationFields.test.tsx src/test/types-check.test.ts --no-coverage`
  Expected: PASS.

---

### Task 2: Replace Brand Logo & App Icon Assets

**Files:**
- Modify: `frontend/public/logo.png`
- Modify: `frontend/public/icon-512.png`
- Check/Modify: `backend/assets/logo.png` (jika ada)

- [ ] **Step 1: Buat aset logo `frontend/public/logo.png` dan `frontend/public/icon-512.png` bertema HRMS**
  Buat gambar PNG bersih (menggunakan `image-generator` atau skrip rendering lokal) bertuliskan/berikon **HRMS** dengan warna selaras tema aplikasi (`#1e3a8a` / warm slate), tanpa elemen EIGER/Nature.
- [ ] **Step 2: Periksa hasil gambar dengan `read_file` dan sinkronkan ke `backend/assets/logo.png` jika file tersebut ada**
  Expected: Kedua aset terbaca valid dan bebas merek lama.

---

### Task 3: Rebrand Backend PDF Fallbacks, Import Template & Tests

**Files:**
- Modify: `backend/src/modules/payroll/payroll-pdf.service.ts:260,296,299,332,340,881`
- Modify: `backend/src/modules/payroll/payroll.controller.ts:396,400,404`
- Modify: `backend/src/modules/employees/import/employee-import-template.ts:23`
- Modify: `backend/src/modules/leave/leave-accrual-cron.service.spec.ts:30,59`
- Modify: `backend/src/modules/payroll/payroll-pdf.service.spec.ts:48`
- Modify: `backend/src/modules/employees/import/employee-import.service.spec.ts:99,118,144`
- Modify: `backend/src/modules/employees/import/employee-import-parser.spec.ts:84,321,322`
- Modify: `backend/src/modules/companies/logo.controller.spec.ts:56,63`

- [ ] **Step 1: Update fallback & template backend**
  - `payroll-pdf.service.ts`: ganti `"EIGER Nature"` → `"HRMS"`, `"PT Eigerindo Multi Produk Industri"` → `"Perusahaan"`, `"hr@eigernature.com"` → `"hr@example.com"`, footer `"CONFIDENTIAL  ·  Dokumen ini diterbitkan secara sah oleh sistem HRMS."`
  - `payroll.controller.ts`: ganti fallback `"EIGER Nature"`, `"PT Eigerindo Multi Produk Industri"`, `"hr@eigernature.com"` ke nilai generik yang sama.
  - `employee-import-template.ts`: ganti `'amir@eiger.test'` → `'amir@example.com'`.
- [ ] **Step 2: Update test backend terkait agar konsisten bebas merek lama**
- [ ] **Step 3: Jalankan unit test backend terkait**
  Run: `cd backend && npx jest src/modules/payroll/payroll-pdf.service.spec.ts src/modules/employees/import/ src/modules/leave/leave-accrual-cron.service.spec.ts src/modules/companies/logo.controller.spec.ts --no-coverage`
  Expected: PASS.

---

### Task 4: Run Local Stack & Capture 5+ Featured Screenshots

**Files:**
- Create: `docs/screenshots/01-login.png` (atau Dashboard sebagai 01)
- Create: `docs/screenshots/02-dashboard.png`
- Create: `docs/screenshots/03-employees.png`
- Create: `docs/screenshots/04-attendance.png`
- Create: `docs/screenshots/05-leave.png`
- Create: `docs/screenshots/06-payroll.png`

- [ ] **Step 1: Jalankan stack Docker lokal (`docker compose up -d --build`) dan tunggu frontend/backend sehat**
  Run: `docker compose up -d --build`
  Expected: `localhost:3000` dan `localhost:3001/api` merespons.
- [ ] **Step 2: Gunakan `browser` subagent untuk login (`admin@example.com` / `password123`) dan mengambil minimal 5 screenshot halaman unggulan**
  Halaman target: Login (atau langsung 5 fitur utama: Dashboard, Direktori Karyawan / Bagan Organisasi, Absensi, Cuti, Payroll), pastikan logo **HRMS** baru tampil dan tidak ada error layar. Simpan ke `docs/screenshots/`.

---

### Task 5: Update Product Description & Details in `DESKRIPSI.md`

**Files:**
- Modify: `DESKRIPSI.md`

- [ ] **Step 1: Tulis ulang `DESKRIPSI.md` dengan 7 bagian lengkap**
  1. `Description`
  2. `Overview`
  3. `Client` (target perusahaan multi-entitas / enterprise HR teams, tanpa menyebut EIGER/EAL/Nature/Adventure)
  4. `Service`
  5. `Tech Stack`
  6. `Features`
  7. `Screenshots` (minimal 5 screenshot unggulan dengan keterangan dan tautan relatif `docs/screenshots/...`)
- [ ] **Step 2: Verifikasi akhir dengan grep bahwa tidak ada lagi `EIGER`, `EAL`, `Nature`, `Adventure` di `DESKRIPSI.md` maupun UI/PDF**
