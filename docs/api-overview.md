# API Overview

## Base URL

All API endpoints are prefixed with `/api`:

```
http://localhost:3001/api    # Development
https://your-domain.com/api  # Production
```

## Interactive Documentation

Swagger UI is available at `/api/docs` in non-production environments. It provides:
- Full endpoint listing with request/response schemas
- Try-it-out functionality for testing endpoints
- Bearer token authentication support

## Authentication

HRMS menerima **OAuth access token opaque dari SSO** (`eal-rbac-api`), bukan JWT yang di-issue HRMS. Semua request API memakai:

```
Authorization: Bearer <access_token>
```

Web login lewat **fe-sso** (OAuth2 PKCE, `client_id=hrms-web`). Mobile login lewat SSO direct-auth. HRMS **tidak** mengeluarkan refresh token.

`POST /api/auth/login` lokal (email/password) **dimatikan** (HTTP **410**) jika `AUTH_LOCAL_ENABLED=false` (default). Jangan panggil endpoint itu dari klien.

Kontrak lengkap (web, mobile, `/me`, org, ops): [sso-fe-handover.md](./sso-fe-handover.md).

### Using the Token

```bash
curl http://localhost:3001/api/employees \
  -H "Authorization: Bearer <sso-oauth-access-token>"
```

## API Modules

| Module | Base Path | Description |
|--------|-----------|-------------|
| Auth | `/api/auth` | Profile (`GET /me`); login/register lokal 410 |
| Employees | `/api/employees` | Employee CRUD, 360 view, direct reports |
| Departments | `/api/departments` | Department hierarchy |
| Companies | `/api/companies` | Multi-tenant company management |
| Attendance | `/api/attendance` | Clock in/out, OT, payable hours |
| Leave | `/api/leave` | Leave types, balances, requests, approvals |
| Admin | `/api/admin` | Dashboard stats, OT rules |
| Holidays | `/api/holidays` | Holiday management |
| Shifts | `/api/shifts` | Shift definitions and assignments |
| Announcements | `/api/announcements` | Company announcements |
| Payroll | `/api/payroll` | Salary structures, payroll runs, payslips |
| Expenses | `/api/expenses` | Expense categories and claims |
| Performance | `/api/performance` | Review cycles, reviews, goals |
| Onboarding | `/api/onboarding` | Templates, processes, tasks |
| Notifications | `/api/notifications` | In-app notifications |
| Documents | `/api/employees/:id/documents` | Employee documents |
| Self-Service | `/api/self-service` | Profile changes, change requests |
| Audit | `/api/audit` | Audit logs |
| Reports | `/api/reports` | Report generation |
| Uploads | `/api/uploads` | File upload/download |

## Common Patterns

### Pagination

List endpoints support pagination via query parameters:

```
GET /api/employees?page=1&limit=20
```

### Filtering

Many list endpoints support filtering:

```
GET /api/employees?status=ACTIVE&departmentId=dept-123
GET /api/leave/requests/me?status=PENDING
GET /api/attendance/me?startDate=2025-01-01&endDate=2025-01-31
```

### Error Responses

The API returns consistent error responses:

```json
{
  "statusCode": 400,
  "message": ["email must be an email"],
  "error": "Bad Request"
}
```

| Status Code | Meaning |
|-------------|---------|
| 400 | Bad Request — validation failed or invalid input |
| 401 | Unauthorized — missing or invalid SSO access token |
| 403 | Forbidden — insufficient role permissions |
| 404 | Not Found — resource does not exist |
| 410 | Gone — local login/register disabled; company identity CUD di SSO |
| 500 | Internal Server Error — unexpected server error |
| 503 | Service Unavailable — SSO tidak tersedia |

### Validation

The API uses `class-validator` with a strict whitelist policy:
- Unknown properties are rejected (HTTP 400)
- Required fields are enforced
- Type coercion is automatic (strings to numbers where applicable)

For detailed endpoint documentation including request/response schemas, see the [Swagger UI](http://localhost:3001/api/docs).
