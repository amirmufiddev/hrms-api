# Handover FE — Auth SSO & Org (fase 1)

Frontend **tidak** diimplementasi di spek ini. Dokumen ini kontrak API untuk tim FE (web + mobile).

Token yang dipakai HRMS adalah **OAuth access token opaque dari SSO** (`eal-rbac-api`). HRMS **tidak** mint JWT sendiri dan **tidak** ada langkah exchange token.

Placeholder `{SSO}` = base URL `eal-rbac-api` (contoh lokal `http://localhost:3000`). Base URL HRMS = `{HRMS}` (contoh lokal `http://localhost:3001`).

---

## 1. Web (fe-sso + PKCE)

1. Login di **fe-sso** (OAuth authorize + PKCE), `client_id` = `hrms-web`.
2. Simpan `access_token`. **Catatan:** `localStorage` = risiko XSS; preferensi jangka panjang cookie httpOnly — itu pekerjaan fase FE, bukan backend.
3. Semua request ke API HRMS: header `Authorization: Bearer <access_token>`.
4. **Jangan** panggil `POST /api/auth/login`. Endpoint itu HTTP **410** jika `AUTH_LOCAL_ENABLED` false (default). `GET /api/auth/me` tetap dipakai.
5. **401** → redirect ke fe-sso (login ulang). **503** → tampilkan “SSO tidak tersedia” (SSO down / timeout; fail-closed).
6. Refresh token: `POST {SSO}/api/auth/oauth2/token` (grant refresh). **HRMS tidak mengeluarkan refresh token.**

### Header setiap request HRMS

```http
Authorization: Bearer <access_token>
```

### Login lokal (jangan dipakai)

```http
POST {HRMS}/api/auth/login
```

Jika `AUTH_LOCAL_ENABLED=false` (default produksi):

- Status: **410 Gone**
- Pesan: `Local login is disabled. Use SSO OAuth access token.`

`POST /api/auth/register` juga 410 pada kondisi yang sama (akun dibuat di SSO).

---

## 2. Mobile (direct-auth)

```http
POST {SSO}/api/direct-auth/sign-in
x-client-id: <hrms-mobile client id>
x-client-secret: <hrms-mobile client secret>
Content-Type: application/json
```

Body:

```json
{
  "method": "email",
  "email": "user@example.com",
  "password": "..."
}
```

Response:

```json
{
  "access_token": "...",
  "refresh_token": "...",
  "expires_in": 3600
}
```

Setelah itu Bearer ke HRMS sama seperti web: `Authorization: Bearer <access_token>`.

---

## 3. `GET /api/auth/me`

```http
GET {HRMS}/api/auth/me
Authorization: Bearer <access_token>
```

Shape kontrak (spek §9):

```json
{
  "id": "<user lokal>",
  "ssoUserId": "<uuid SSO>",
  "email": "...",
  "role": "EMPLOYEE",
  "tenantId": "<tenant lokal>",
  "ssoCompanyId": "<uuid SSO>",
  "employeeId": "<employee lokal>",
  "company": { "id": "...", "name": "...", "code": "..." }
}
```

- `id` / `tenantId` / `employeeId` = PK lokal HRMS.
- `ssoUserId` / `ssoCompanyId` = UUID di SSO.
- `company.id` = tenant lokal (bukan UUID SSO).
- `role`: `SUPER_ADMIN` | `HR_ADMIN` | `MANAGER` | `EMPLOYEE`.

### Kode HTTP auth (ringkas)

| Status | Arti | Aksi FE |
|--------|------|---------|
| 401 | Token hilang/invalid, atau SSO menolak token | Redirect fe-sso (web) / minta login lagi (mobile) |
| 403 `NO_COMPANY` | User SSO belum di-assign company | Tampilkan error; jangan retry login loop |
| 410 | Login/register lokal dimatikan | Hapus pemanggilan `POST /api/auth/login` |
| 503 | SSO tidak tersedia (network/5xx) | “SSO tidak tersedia”; jangan anggap session expired |

---

## 4. Company & department

Sumber kebenaran identitas org = **SSO**. HRMS hanya overlay (geofence, timezone, payroll, `isActive` HR).

List companies/departments: bentuk existing HRMS **plus** field:

| Resource | Field extra |
|----------|-------------|
| Company | `ssoCompanyId` |
| Department | `ssoDepartmentId`, `classification` (`DIVISION` / `DEPARTMENT` / …; FE boleh abaikan dulu) |

### Company

| Method | Path | Perilaku |
|--------|------|----------|
| GET | `/api/companies`, `/api/companies/:id` | Merge list SSO + overlay lokal (geofence, settings) |
| PUT | `/api/companies/:id` | **Boleh** — overlay saja (geofence, timezone, currency, jam kerja, payroll day, `isActive`, alamat HR). **Abaikan** `name` / `code` di body (bukan master). |
| POST / PATCH / DELETE | identity company | **410** — pesan `Manage companies in SSO`. Kelola create/rename/hapus company di SSO / fe-sso. |

Jangan panggil CUD identitas company di HRMS.

### Department

| Method | Path | Perilaku |
|--------|------|----------|
| GET | `/api/departments`, hierarchy | Sync cache dari SSO lalu kembalikan tree |
| POST / PUT / DELETE | `/api/departments` | **403** `{ "code": "SSO_ORG_READONLY" }` — kelola di SSO |

Jangan dual-write department ke SSO dari klien HRMS.

---

## 5. Employee & self-service

### Create employee

**Jangan** kirim `createUser` (atau `userEmail` / `userPassword` / `userRole` untuk mint akun lokal).

Jika `createUser: true`:

- Status: **400**
- Pesan: `User accounts are provisioned via SSO`

Akun user = provisioning SSO (JIT saat login). Employee historis tanpa `ssoUserId` tetap boleh dibuat, tapi **tidak bisa login**.

### Self-service change-request

Jangan request perubahan `email` / `firstName` / `lastName`. Identitas nama/email diubah di **SSO**. Jika FE tetap kirim field itu → **400**.

Field change-request yang masih diterima backend saat ini: `phone`, `designation`.

---

## 6. Ops SSO (bukan pekerjaan FE, wajib sebelum go-live)

Daftarkan dua OAuth application di `eal-rbac-api` (modul `/api/apps` / tabel `OauthApplication`):

| Client | Tipe | Catatan |
|--------|------|---------|
| `hrms-web` | PKCE (public/confidential sesuai standar fe-sso) | Redirect = URL frontend HRMS callback |
| `hrms-mobile` | confidential — direct-auth | Tidak perlu redirect; `x-client-id` / `x-client-secret` |

Allow-list service-to-service di `eal-rbac-api`:

```
SSO_SERVICE_ALLOWED_APPS=eal-erp,api-booking,eal-hrms
```

`eal-hrms` adalah **app-key** HRMS (nilai default `SSO_SERVICE_APP_KEY` di backend HRMS). Tanpa ini, HRMS tidak bisa memanggil endpoint service SSO (list company/dept, batch user, user-context).

Env HRMS terkait (lihat `backend/.env.example`): `SSO_API_BASE_URL`, `SSO_SERVICE_API_KEY`, `SSO_SERVICE_APP_KEY=eal-hrms`, `SSO_SERVICE_APP_NAME`, `SSO_OAUTH_CLIENT_ID` / `SSO_OAUTH_CLIENT_SECRET` (mobile), `AUTH_LOCAL_ENABLED=false`.

---

## 7. Yang tidak berubah untuk FE (fase 1)

- Header `x-company-id` **tidak** didukung (multi-company pakai `company_id` aktif dari context SSO).
- Catalog permission `leave:*` / sidebar app-menus SSO = fase 2.
- Domain HR (absensi, cuti, gaji, PII, dokumen) tetap API HRMS existing, hanya header auth yang berganti.
