# Frontend Handover: Modul Onboarding & Exit Management (Offboarding)

Dokumen ini menjelaskan integrasi endpoint, RBAC permission granular, alur status proses onboarding dan offboarding (exit/separation) pada HRMS backend.

---

## 1. Hak Akses & Permissions SSO

- `onboarding:read`: Melihat master template onboarding, daftar proses onboarding, dan detail status onboarding pegawai.
- `onboarding:manage`: Membuat, mengedit, dan menghapus template onboarding; memulai (`createProcess`) atau membatalkan (`cancelProcess`) onboarding pegawai.
- `exit:read`: Melihat daftar dan rincian pemisahan/separation karyawan (resignation/termination).
- `exit:manage`: Memulai proses separation (`initiate`), mengupdate catatan, memajukan tahapan status (`notice-period`, `clearance`, `complete`, `cancel`).
- **Karyawan Reguler (Self-Service)**:
  - `GET /api/onboarding/my-tasks`: Melihat daftar tugas onboarding/orientasi yang ditugaskan kepadanya.
  - `PUT /api/onboarding/tasks/:id`: Mengubah progress/status tugas yang ditugaskan kepadanya.
  - `POST /api/onboarding/tasks/:id/complete`: Menandai tugas onboarding selesai.

---

## 2. Ringkasan Endpoint Onboarding

### Template Onboarding
| Method | Endpoint | Permission | Keterangan |
|---|---|---|---|
| `GET` | `/api/onboarding/templates` | `onboarding:read` | Mengambil daftar template checklist |
| `GET` | `/api/onboarding/templates/:id` | `onboarding:read` | Mengambil detail template |
| `POST` | `/api/onboarding/templates` | `onboarding:manage` | Membuat template baru dengan daftar task JSON |
| `PUT` | `/api/onboarding/templates/:id` | `onboarding:manage` | Mengupdate template |
| `DELETE` | `/api/onboarding/templates/:id` | `onboarding:manage` | Menghapus template (jika belum ada proses aktif) |

### Proses Onboarding Karyawan
| Method | Endpoint | Permission | Keterangan |
|---|---|---|---|
| `GET` | `/api/onboarding/processes?status=IN_PROGRESS` | `onboarding:read` | Daftar proses onboarding karyawan |
| `GET` | `/api/onboarding/processes/:id` | `onboarding:read` | Rincian proses beserta status task-tasknya |
| `POST` | `/api/onboarding/processes` | `onboarding:manage` | Memulai onboarding pegawai baru berdasarkan template |
| `POST` | `/api/onboarding/processes/:id/cancel` | `onboarding:manage` | Membatalkan proses onboarding |
| `DELETE` | `/api/onboarding/processes/:id` | `onboarding:manage` | Menghapus proses onboarding |

### Self-Service Tasks
| Method | Endpoint | Role | Keterangan |
|---|---|---|---|
| `GET` | `/api/onboarding/my-tasks` | Authenticated Employee | Mengambil tugas onboarding milik user yang login |
| `PUT` | `/api/onboarding/tasks/:id` | Owner / HR Admin | Mengupdate task onboarding |
| `POST` | `/api/onboarding/tasks/:id/complete` | Owner / HR Admin | Menyelesaikan task onboarding |

---

## 3. Ringkasan Endpoint Exit Management (Separation)

| Method | Endpoint | Permission | Keterangan |
|---|---|---|---|
| `GET` | `/api/exit/separations?status=INITIATED` | `exit:read` | Mengambil daftar pengunduran diri / pemutusan kerja |
| `GET` | `/api/exit/separations/:id` | `exit:read` | Mengambil rincian separation |
| `POST` | `/api/exit/separations` | `exit:manage` | Menginisiasi separation pegawai aktif |
| `PUT` | `/api/exit/separations/:id` | `exit:manage` | Mengubah detail permohonan |
| `POST` | `/api/exit/separations/:id/notice-period` | `exit:manage` | Memindahkan status ke `NOTICE_PERIOD` |
| `POST` | `/api/exit/separations/:id/clearance` | `exit:manage` | Memindahkan status ke `CLEARANCE_PENDING` |
| `POST` | `/api/exit/separations/:id/complete` | `exit:manage` | Menyelesaikan exit (otomatis ubah status pegawai -> `INACTIVE` & set `exitDate`) |
| `POST` | `/api/exit/separations/:id/cancel` | `exit:manage` | Membatalkan separation |
