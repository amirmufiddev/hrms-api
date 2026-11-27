# Frontend Handover: Modul Payroll & Salary Calculation

Dokumen ini menjelaskan endpoint, otorisasi RBAC granular, serta integrasi unduh slip gaji (PDF) dengan format mata uang dinamis (IDR/USD/INR) pada HRMS backend.

---

## 1. Hak Akses & Permission Granular SSO
Pengguna dengan role SSO memerlukan permission berikut untuk mengakses fitur-fitur Payroll:
- `payroll:read`: Melihat struktur gaji, daftar payroll run, daftar payslip, dan riwayat gaji pegawai.
- `payroll:process`: Membuat payroll run baru (`DRAFT`) dan memicu proses komputasi slip gaji (`COMPUTED`).
- `payroll:manage`: Menyetujui payroll run (`APPROVED`), menandai telah dibayar (`PAID`), menghapus draft run, membuat/mengubah salary structure, dan menetapkan salary assignment kepada karyawan.
- **Karyawan Reguler**: Dapat selalu mengakses `GET /api/payroll/my-payslips` dan mengunduh PDF slip gaji miliknya sendiri (`GET /api/payroll/payslips/:id/pdf`).

---

## 2. Ringkasan Endpoint

### Salary Structures & Assignment
| Method | Endpoint | Permission / Role | Keterangan |
|---|---|---|---|
| `GET` | `/api/payroll/structures` | `payroll:manage` | Mengambil daftar struktur komponen gaji |
| `GET` | `/api/payroll/structures/:id` | `payroll:manage` | Detail struktur komponen gaji |
| `POST` | `/api/payroll/structures` | `payroll:manage` | Membuat master struktur gaji baru |
| `PUT` | `/api/payroll/structures/:id` | `payroll:manage` | Mengubah struktur komponen gaji |
| `DELETE` | `/api/payroll/structures/:id` | `payroll:manage` | Menghapus struktur komponen gaji |
| `GET` | `/api/payroll/employees/:employeeId/salary` | `payroll:read` | Riwayat penugasan gaji pegawai |
| `POST` | `/api/payroll/employees/:employeeId/salary` | `payroll:manage` | Menugaskan struktur gaji & base pay ke pegawai |

### Payroll Runs
| Method | Endpoint | Permission / Role | Keterangan |
|---|---|---|---|
| `GET` | `/api/payroll/runs?year=2026&status=DRAFT` | `payroll:read` | Daftar periode payroll run |
| `GET` | `/api/payroll/runs/:id` | `payroll:read` | Detail payroll run beserta daftar slip gaji |
| `POST` | `/api/payroll/runs` | `payroll:process` | Membuat batch payroll run bulan/tahun tertentu |
| `POST` | `/api/payroll/runs/:id/process` | `payroll:process` | Menghitung gaji, potongan, OT, dan cuti seluruh pegawai aktif |
| `POST` | `/api/payroll/runs/:id/approve` | `payroll:manage` | Menyetujui hasil komputasi payroll run |
| `POST` | `/api/payroll/runs/:id/pay` | `payroll:manage` | Menandai payroll run telah dibayarkan |
| `DELETE` | `/api/payroll/runs/:id` | `payroll:manage` | Menghapus batch payroll run (hanya status DRAFT) |

### Payslips & Unduh PDF
| Method | Endpoint | Permission / Role | Keterangan |
|---|---|---|---|
| `GET` | `/api/payroll/my-payslips` | Authenticated Employee | Mengambil seluruh slip gaji milik user yang sedang login |
| `GET` | `/api/payroll/runs/:runId/payslips` | `payroll:read` | Mengambil daftar slip gaji dalam suatu batch run (dengan paginasi) |
| `GET` | `/api/payroll/employees/:employeeId/payslips` | `payroll:read` | Mengambil seluruh riwayat slip gaji pegawai tertentu |
| `GET` | `/api/payroll/payslips/:id` | Owner / `payroll:read` | Mengambil data rincian slip gaji (JSON) |
| `GET` | `/api/payroll/payslips/:id/pdf` | Owner / `payroll:read` | Mengunduh file PDF slip gaji resmi (Binary Blob `application/pdf`) |

---

## 3. Format Unduh PDF Slip Gaji
Endpoint `GET /api/payroll/payslips/:id/pdf` merespon dengan:
- **Header:**
  - `Content-Type: application/pdf`
  - `Content-Disposition: attachment; filename="payslip-EMP001-Aug-2026.pdf"`
- **Mata Uang:**
  - Otomatis disesuaikan dengan konfigurasi mata uang tenant (`currency` dari SSO Company Overlay, contoh: `IDR` diformat `Rp 10.000.000`, `USD` diformat `$ 5,000.00`, `INR` diformat `₹ 10,000.00`).
