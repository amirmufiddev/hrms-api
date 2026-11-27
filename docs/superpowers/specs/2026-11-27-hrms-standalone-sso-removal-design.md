# HRMS berdiri sendiri — hapus integrasi SSO

Tanggal: 2026-11-27

## Tujuan

HRMS berjalan tanpa `eal-rbac-api` dan tanpa aplikasi ERP saudaranya. Tidak ada klien ERP di repo ini. Satu-satunya ikatan ke luar adalah SSO. Setelah pekerjaan ini selesai, tidak ada kode, env, kolom, atau dokumen yang memanggil SSO.

Sesi adalah JWT yang diterbitkan HRMS. Company, department, position, dan karyawan disimpan di database HRMS. Approval mengubah status lokal. Menu adalah daftar statis yang sudah ada di sidebar. Izin diturunkan dari `UserRole` pada setiap request.

Token mesin absensi (`ATTENDANCE_DEVICE_APP_TOKEN`) tetap. Itu rahasia lokal HRMS.

## Urutan

Empat spec diimplementasi berurutan. Tiap spec menghapus potongannya dan menggantinya dengan perilaku lokal sebelum spec berikutnya dimulai. Aplikasi tetap bisa login sesudah spec pertama.

1. Auth, menu, dan pemilihan perusahaan.
2. Master organisasi.
3. Approval.
4. Migrasi kolom dan sisa referensi.

## Peta izin

`PermissionsGuard` menolak user yang `permissions`-nya kosong, termasuk `HR_ADMIN`. `SUPER_ADMIN` sudah di-bypass di guard. `validateUser` dan `GET /api/auth/me` mengisi `permissions` dari `user.role` setiap request. Daftar ini tidak disimpan di JWT dan tidak disimpan di database.

| Role | `permissions` |
| --- | --- |
| `SUPER_ADMIN` | kosong; guard mengizinkan semua |
| `HR_ADMIN` | `*:*` |
| `MANAGER` | `attendance:read`, `attendance:approve`, `leave:approve`, `expenses:approve`, `employees:read`, `employees:update`, `positions:read`, `performance:read`, `onboarding:read` |
| `EMPLOYEE` | kosong |

Wildcard `*:*` dan `module:*` mengikuti `PermissionsGuard` serta `checkPermission` di frontend. `EMPLOYEE` tetap bisa membuka endpoint milik sendiri yang tidak memakai `@RequirePermissions` (profil, pengajuan cuti, klaim sendiri). `MANAGER` yang menyetujui bukan bawahan langsung tetap ditolak di service dengan 403.

## Spec 1 — Auth, menu, perusahaan

### Perilaku

`JwtAuthGuard` hanya menjalankan `passport-jwt`. Flag `AUTH_LOCAL_ENABLED` dihapus dari kode dan env. `POST /api/auth/login` serta `POST /api/auth/register` selalu aktif.

Login mencari user aktif dengan email pada `dto.tenantId` atau `DEFAULT_TENANT_ID`, lalu membandingkan kata sandi dengan `passwordHash` (bcrypt). JWT berisi `sub`, `email`, `tenantId`, `role`, dan `employeeId`.

Halaman `/login` adalah form email dan kata sandi. Sukses menyimpan `hrms_token` dan memuat profil dari `GET /api/auth/me`. Logout menghapus `hrms_token` dan `hrms_user`, lalu membuka `/login`.

Sidebar memakai `staticSections`. Panggilan `GET /api/auth/app-menus` dihapus. `DashboardLayout` tidak lagi menahan user di `SelectCompanyScreen`. Tenant user adalah perusahaan sesi. Header `x-sso-company-id` tidak dikirim.

Satu user memiliki satu tenant. Tidak ada pemilih perusahaan.

### Dihapus pada spec ini

- `SsoAuthGuard`, `IdpClientService`, `IdentityProvisionService`, `sso-role.mapper`, dan tesnya.
- `frontend/src/lib/pkce.ts`, `frontend/src/app/auth/callback/`, `frontend/src/app/api/auth/token/route.ts`.
- `ssoApi`, `SelectCompanyScreen`, `selected-company`, dan cabang 503 "SSO unavailable" di interceptor.
- Catatan serta tautan "Buka SSO Portal" pada modal change request di halaman profil. Change request tetap untuk phone dan designation. Nama dan email karyawan diubah lewat form karyawan yang sudah ada.
- Env login saja: `SSO_OAUTH_CLIENT_ID`, `SSO_OAUTH_CLIENT_SECRET`, `SSO_USER_CONTEXT_CACHE_TTL_SEC`, dan `NEXT_PUBLIC_SSO_*` di frontend.

`SSO_API_BASE_URL`, `SSO_SERVICE_API_KEY`, `SSO_SERVICE_APP_KEY`, dan `SSO_SERVICE_APP_NAME` tetap sampai spec 4, karena klien organisasi dan approval masih memakainya. Klien itu tidak lagi ikut jalur login.

### Akun tanpa kata sandi

User dengan `passwordHash` null tidak bisa login. Perintah `backend/scripts/set-local-passwords.ts` mengisi hash untuk user aktif yang hash-nya masih null. Kata sandi dibaca dari `LOCAL_BOOTSTRAP_PASSWORD`. Perintah ini tidak menimpa hash yang sudah ada. Cost bcrypt sama dengan `AuthService` (10).

### Error

Kredensial salah, user nonaktif, atau akun tanpa hash membalas 401 `Invalid credentials`. JWT kedaluwarsa atau tanda tangan salah membalas 401. Frontend membersihkan sesi dan membuka `/login`. Register oleh peran selain `SUPER_ADMIN` dan `HR_ADMIN` membalas 403. Email yang sudah ada di tenant yang sama membalas 409.

### Tes

- Login sukses, 401 untuk kata sandi salah, user nonaktif, dan hash kosong.
- `JwtAuthGuard` menolak token yang bukan JWT HRMS.
- `validateUser` mengisi peta izin di atas untuk keempat role.
- Halaman login mengirim email serta kata sandi dan menyimpan token.
- Sidebar tidak memanggil app-menus.
- `DashboardLayout` menampilkan shell aplikasi tanpa layar pilih perusahaan.
- `AuthContext` membersihkan sesi saat `/api/auth/me` membalas 401.

## Spec 2 — Master organisasi

Company, department, position, dan karyawan ditulis lewat endpoint HRMS yang sudah ada. Service berhenti memanggil klien SSO sebelum dan sesudah tulis. Endpoint `syncFromSso` dihapus. Pembuatan karyawan tidak membuat akun SSO.

Dihapus: `company-sso.client`, `department-sso.client`, `position-sso.client`, `user-sso.client`, `fetch-sso-directory`, dan `backend/scripts/resync-sso-employees.ts`.

Tes create dan update organisasi mengharapkan satu tulis ke Prisma dan nol panggilan HTTP ke SSO.

## Spec 3 — Approval

Modul: cuti, klaim, comp-off, regularisasi absensi, dan lembur.

Pengajuan hanya membuat record lokal berstatus `PENDING`. Tidak ada `submitIfLinked`. Setujui dan tolak tidak membaca `approvalRequestId`.

Pengecekan peran di service tetap. `MANAGER` hanya untuk bawahan langsung. `HR_ADMIN` dan `SUPER_ADMIN` untuk semua record di tenant. Setelah lolos, status langsung `APPROVED` atau `REJECTED`, beserta efek yang sudah ada (saldo cuti, absensi, notifikasi). Record yang bukan `PENDING` membalas 404. Pelanggaran peran membalas 403. Gagal mengirim email tidak menggagalkan perubahan status.

Dihapus: `HrmsApprovalOrchestrator`, `approval-sso.client`, `sso-http.client`, `SsoClientModule`, dan webhook `sso-approval-webhook`.

Tes tiap modul: submit menghasilkan `PENDING` tanpa ID eksternal; approve `HR_ADMIN` menjadi `APPROVED`; approve `MANAGER` untuk bawahan langsung lolos; untuk karyawan lain 403; record non-pending 404.

## Spec 4 — Skema dan sisa referensi

Migrasi Prisma menghapus kolom:

- `Tenant.ssoCompanyId`
- `User.ssoUserId`
- `Department.ssoDepartmentId`
- `Designation.ssoPositionId`
- `Employee.ssoUserId`
- `approvalRequestId` pada `LeaveRequest`, `ExpenseClaim`, `CompOffRequest`, `AttendanceRegularization`, dan `AttendanceRecord`

Nilai di kolom itu adalah ID sistem luar. Tidak ada penyalinan. Field yang sama dihapus dari DTO, tipe frontend, dan respons API (`ssoUserId`, `ssoCompanyId` pada profil).

Env SSO yang tersisa dihapus dari `.env.example` dan validasi env. Dokumen `docs/sso-*.md` dihapus.

Selesai ketika pencarian `sso-client`, `SsoAuthGuard`, `IdpClient`, `approvalRequestId`, dan `ssoUserId` di `backend/` serta `frontend/` kosong, dan tes skema tidak lagi memuat kolom tersebut.

## Di luar cakupan

- Alur lupa kata sandi lewat email. Pengisian awal hanya lewat skrip bootstrap.
- Mesin approval bertingkat baru. Satu tindakan menyetujui atau menolak record lokal.
- Satu user di banyak perusahaan. Sesi mengikuti `tenantId` user.
- Token aplikasi mesin absensi.

## Kriteria selesai

Keempat spec terpasang. User dengan kata sandi lokal bisa login, melihat menu sesuai peran, mengubah organisasi, dan menyetujui pengajuan tanpa proses di luar HRMS. Tidak ada request keluar ke SSO.
