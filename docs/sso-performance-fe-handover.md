# Frontend Handover: Modul Performance Appraisal & Goals

Dokumen ini menjelaskan integrasi endpoint, RBAC permission granular, serta alur proses Review Cycles, Evaluasi Kinerja (Self & Manager Review), dan penetapan Goals/KPI pada HRMS backend.

---

## 1. Hak Akses & Permissions SSO

- `performance:read`: Melihat master review cycle (`cycles`), hasil evaluasi tim (`team-reviews`).
- `performance:manage`: Membuat, mengedit, menghapus, meluncurkan (`launch`), dan menyelesaikan (`complete`) review cycle; serta memberikan evaluasi manajer (`manager-review`).
- **Karyawan Reguler (Self-Service)**:
  - `GET /api/performance/my-reviews`: Melihat riwayat & undangan review untuk diri sendiri.
  - `GET /api/performance/reviews/:id`: Melihat detail form review (hanya jika pemilik atau manajer/admin).
  - `POST /api/performance/reviews/:id/self-review`: Mengirimkan penilaian mandiri (self-rating & feedback).
  - `GET /api/performance/my-goals`: Melihat daftar target/KPI pribadi.
  - `POST /api/performance/goals`: Membuat target baru.
  - `PUT /api/performance/goals/:id`: Mengupdate progres target (misal: 0% -> 100%).
  - `DELETE /api/performance/goals/:id`: Menghapus target pribadi.

---

## 2. Ringkasan Endpoint Review Cycles (Admin)

| Method | Endpoint | Permission | Keterangan |
|---|---|---|---|
| `GET` | `/api/performance/cycles?status=ACTIVE` | `performance:read` | Daftar periode review tahunan/semesteran |
| `GET` | `/api/performance/cycles/:id` | `performance:read` | Detail periode review cycle |
| `POST` | `/api/performance/cycles` | `performance:manage` | Membuat periode review baru (status DRAFT) |
| `PUT` | `/api/performance/cycles/:id` | `performance:manage` | Mengubah jadwal/deskripsi review (hanya DRAFT) |
| `DELETE` | `/api/performance/cycles/:id` | `performance:manage` | Menghapus review cycle (hanya DRAFT) |
| `POST` | `/api/performance/cycles/:id/launch` | `performance:manage` | Meluncurkan review cycle ke seluruh pegawai aktif |
| `POST` | `/api/performance/cycles/:id/complete` | `performance:manage` | Menutup review cycle |

---

## 3. Ringkasan Endpoint Evaluasi Kinerja (Reviews)

| Method | Endpoint | Role / Permission | Keterangan |
|---|---|---|---|
| `GET` | `/api/performance/my-reviews` | Authenticated Employee | Mengambil daftar formulir review milik user yang login |
| `GET` | `/api/performance/reviews/:id` | Owner / Manager / Admin | Mengambil rincian form review dan scoring |
| `POST` | `/api/performance/reviews/:id/self-review` | Authenticated Employee | Mengirimkan self-review (rating & comments) |
| `GET` | `/api/performance/team-reviews` | `performance:read` / Manager | Melihat status evaluasi tim bawahan |
| `POST` | `/api/performance/reviews/:id/manager-review` | `performance:manage` / Manager | Mengirimkan penilaian manajer untuk bawahan |

---

## 4. Ringkasan Endpoint Goals / KPI

| Method | Endpoint | Role | Keterangan |
|---|---|---|---|
| `GET` | `/api/performance/my-goals` | Authenticated Employee | Mengambil daftar target kinerja pribadi |
| `POST` | `/api/performance/goals` | Authenticated Employee | Menambahkan KPI / Goal baru |
| `PUT` | `/api/performance/goals/:id` | Authenticated Employee | Memperbarui progress target |
| `DELETE` | `/api/performance/goals/:id` | Authenticated Employee | Menghapus target |
