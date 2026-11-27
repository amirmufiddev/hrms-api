# Frontend Handover: Modul Shift Scheduling & Roster

Dokumen ini menjelaskan integrasi endpoint, RBAC permission granular, serta alur penugasan jadwal kerja (Shift Roster) pada HRMS backend.

---

## 1. Hak Akses & Permissions SSO

- `shifts:read`: Melihat master jadwal shift (`GET /api/shifts`, `GET /api/shifts/:id`) dan daftar shift karyawan aktif (`GET /api/shifts/assignments/list`).
- `shifts:manage`: Membuat, mengedit, dan menghapus master shift (`POST`, `PUT`, `DELETE /api/shifts`); serta menugaskan shift ke karyawan (`POST /api/shifts/assignments`) atau penugasan massal (`POST /api/shifts/assignments/bulk`).
- **Karyawan Reguler**: Dapat melihat riwayat penugasan shift miliknya sendiri (`GET /api/shifts/assignments/employee/:employeeId`).

---

## 2. Ringkasan Endpoint Master Shifts

| Method | Endpoint | Permission | Keterangan |
|---|---|---|---|
| `GET` | `/api/shifts` | `shifts:read` | Mengambil semua master shift aktif |
| `GET` | `/api/shifts/:id` | `shifts:read` | Mengambil detail shift tertentu |
| `POST` | `/api/shifts` | `shifts:manage` | Membuat master shift baru |
| `PUT` | `/api/shifts/:id` | `shifts:manage` | Memperbarui master shift |
| `DELETE` | `/api/shifts/:id` | `shifts:manage` | Menghapus (soft delete `isActive: false`) master shift |

---

## 3. Ringkasan Endpoint Penugasan Shift (Roster)

| Method | Endpoint | Permission / Role | Keterangan |
|---|---|---|---|
| `GET` | `/api/shifts/assignments/list?activeOnly=true` | `shifts:read` | Mengambil daftar penugasan shift aktif |
| `GET` | `/api/shifts/assignments/employee/:employeeId` | Owner / `shifts:read` | Mengambil riwayat pergantian shift karyawan |
| `POST` | `/api/shifts/assignments` | `shifts:manage` | Menugaskan shift ke satu karyawan |
| `POST` | `/api/shifts/assignments/bulk` | `shifts:manage` | Menugaskan shift ke banyak karyawan sekaligus |
