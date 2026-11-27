# HRMS Local Auth Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Sesi HRMS hanya JWT lokal, menu statis, dan satu tenant per user, tanpa jalur login SSO.

**Architecture:** `JwtAuthGuard` hanya `passport-jwt`. `validateUser` dan `GET /api/auth/me` mengisi `permissions` dari `UserRole`. Frontend login dengan email dan kata sandi, menyimpan `hrms_token`, lalu memuat profil. Sidebar memakai `staticSections`. Layar pilih perusahaan dan PKCE dihapus. Klien organisasi serta approval SSO tidak disentuh.

**Tech Stack:** NestJS 11, Passport JWT, Prisma, bcrypt, Next.js 16, Jest, Testing Library.

## Global Constraints

- `SUPER_ADMIN`: `permissions` kosong; `PermissionsGuard` mengizinkan semua.
- `HR_ADMIN`: `*:*`.
- `MANAGER`: `attendance:read`, `attendance:approve`, `leave:approve`, `expenses:approve`, `employees:read`, `employees:update`, `positions:read`, `performance:read`, `onboarding:read`.
- `EMPLOYEE`: `permissions` kosong.
- Daftar izin dihitung setiap request dari `user.role`. Tidak disimpan di JWT dan tidak disimpan di database.
- Kredensial salah, user nonaktif, atau `passwordHash` null membalas 401 `Invalid credentials`.
- `POST /api/auth/register` tetap memakai `@Roles(UserRole.SUPER_ADMIN, UserRole.HR_ADMIN)`.
- Cost bcrypt untuk skrip bootstrap adalah 10.
- `SSO_API_BASE_URL`, `SSO_SERVICE_API_KEY`, `SSO_SERVICE_APP_KEY`, dan `SSO_SERVICE_APP_NAME` tetap.
- Jangan menghapus `backend/src/common/sso-client/**` atau pemanggilan sync organisasi. Itu spec 2 dan 3.
- Jangan commit `backend/.env` atau `frontend/.env`.
- Token mesin absensi tidak berubah.

---

### Task 1: Peta izin pada sesi lokal

**Files:**
- Create: `backend/src/modules/auth/role-permissions.ts`
- Create: `backend/src/modules/auth/role-permissions.spec.ts`
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/auth.service.spec.ts`
- Modify: `backend/src/modules/auth/auth.controller.ts`
- Modify: `backend/src/modules/auth/auth.controller.spec.ts`

**Interfaces:**
- Consumes: `UserRole` dari `@prisma/client`.
- Produces: `permissionsForRole(role: UserRole): string[]`. `AuthService.validateUser` mengembalikan `permissions`. `AuthService.getProfile(userId: string)` mengisi `permissions` dari role user di database. Controller memanggil `getProfile(user.userId)` tanpa argumen kedua.

- [ ] **Step 1: Write the failing test**

Buat `backend/src/modules/auth/role-permissions.spec.ts`:

```ts
import { UserRole } from '@prisma/client';
import { permissionsForRole } from './role-permissions';

describe('permissionsForRole', () => {
  it('gives SUPER_ADMIN an empty list', () => {
    expect(permissionsForRole(UserRole.SUPER_ADMIN)).toEqual([]);
  });

  it('gives HR_ADMIN a full wildcard', () => {
    expect(permissionsForRole(UserRole.HR_ADMIN)).toEqual(['*:*']);
  });

  it('gives MANAGER the standalone approval and read set', () => {
    expect(permissionsForRole(UserRole.MANAGER)).toEqual([
      'attendance:read',
      'attendance:approve',
      'leave:approve',
      'expenses:approve',
      'employees:read',
      'employees:update',
      'positions:read',
      'performance:read',
      'onboarding:read',
    ]);
  });

  it('gives EMPLOYEE an empty list', () => {
    expect(permissionsForRole(UserRole.EMPLOYEE)).toEqual([]);
  });
});
```

Di `auth.service.spec.ts`, pada tes `validateUser` "should validate and return user data for active user", ubah ekspektasi menjadi:

```ts
expect(result).toEqual({
  userId: 'user-1',
  email: 'user@test.com',
  tenantId: 'test-tenant',
  role: 'EMPLOYEE',
  employeeId: 'emp-1',
  permissions: [],
});
```

Tambahkan di dalam `describe('validateUser')`:

```ts
it('attaches the HR_ADMIN wildcard', async () => {
  prisma.user.findUnique.mockResolvedValue({
    ...mockActiveUser,
    role: 'HR_ADMIN',
  });

  const result = await service.validateUser(payload);

  expect(result.permissions).toEqual(['*:*']);
});
```

Ubah pemanggilan dan ekspektasi `getProfile` yang sekarang mengirim `['leave:read', 'leave:approve']`:

```ts
const result = await service.getProfile('user-1');

expect(result.permissions).toEqual([]);
```

Role pada `mockUserWithEmployee` adalah `EMPLOYEE`, jadi izinnya kosong. Tambahkan:

```ts
it('derives HR_ADMIN permissions from the stored role', async () => {
  prisma.user.findUnique.mockResolvedValue({
    ...mockUserWithEmployee,
    role: 'HR_ADMIN',
  });

  const result = await service.getProfile('user-1');

  expect(result.permissions).toEqual(['*:*']);
});
```

Di `auth.controller.spec.ts`, ubah ekspektasi `getProfile`:

```ts
expect(service.getProfile).toHaveBeenCalledWith('user-1');
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/modules/auth/role-permissions.spec.ts src/modules/auth/auth.service.spec.ts src/modules/auth/auth.controller.spec.ts --no-coverage`

Expected: FAIL. `permissionsForRole` tidak ada, dan `validateUser` belum mengembalikan `permissions`.

- [ ] **Step 3: Write minimal implementation**

Buat `backend/src/modules/auth/role-permissions.ts`:

```ts
import { UserRole } from '@prisma/client';

const MANAGER_PERMISSIONS = [
  'attendance:read',
  'attendance:approve',
  'leave:approve',
  'expenses:approve',
  'employees:read',
  'employees:update',
  'positions:read',
  'performance:read',
  'onboarding:read',
];

export function permissionsForRole(role: UserRole): string[] {
  switch (role) {
    case UserRole.HR_ADMIN:
      return ['*:*'];
    case UserRole.MANAGER:
      return [...MANAGER_PERMISSIONS];
    case UserRole.SUPER_ADMIN:
    case UserRole.EMPLOYEE:
    default:
      return [];
  }
}
```

Di `auth.service.ts`, import `permissionsForRole`. `getProfile` menjadi satu argumen dan mengisi izin dari role:

```ts
async getProfile(userId: string) {
  const user = await this.prisma.user.findUnique({
    where: { id: userId },
    include: {
      tenant: {
        select: {
          id: true,
          name: true,
          code: true,
          ssoCompanyId: true,
        },
      },
      employee: {
        include: {
          department: true,
          manager: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              email: true,
            },
          },
        },
      },
    },
  });

  if (!user) {
    throw new UnauthorizedException('User not found');
  }

  return {
    id: user.id,
    ssoUserId: user.ssoUserId,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    ssoCompanyId: user.tenant?.ssoCompanyId,
    employeeId: user.employeeId,
    permissions: permissionsForRole(user.role),
    company: user.tenant
      ? {
          id: user.tenant.id,
          name: user.tenant.name,
          code: user.tenant.code,
        }
      : undefined,
    employee: user.employee,
  };
}
```

`validateUser` mengembalikan:

```ts
return {
  userId: user.id,
  email: user.email,
  tenantId: user.tenantId,
  role: user.role,
  employeeId: user.employeeId || undefined,
  permissions: permissionsForRole(user.role),
};
```

Di `auth.controller.ts`:

```ts
async getProfile(@CurrentUser() user: AuthenticatedUser) {
  return this.authService.getProfile(user.userId);
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/modules/auth/role-permissions.spec.ts src/modules/auth/auth.service.spec.ts src/modules/auth/auth.controller.spec.ts --no-coverage`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/auth/role-permissions.ts backend/src/modules/auth/role-permissions.spec.ts backend/src/modules/auth/auth.service.ts backend/src/modules/auth/auth.service.spec.ts backend/src/modules/auth/auth.controller.ts backend/src/modules/auth/auth.controller.spec.ts
git commit -m "$(cat <<'EOF'
feat: derive session permissions from the local user role

EOF
)"
```

---

### Task 2: Login lokal selalu aktif

**Files:**
- Modify: `backend/src/modules/auth/auth.service.ts`
- Modify: `backend/src/modules/auth/auth.service.spec.ts`
- Modify: `backend/src/modules/auth/auth.controller.spec.ts`

**Interfaces:**
- Consumes: `permissionsForRole` dari Task 1.
- Produces: `login` dan `register` tidak membaca `AUTH_LOCAL_ENABLED` dan tidak melempar `GoneException`.

- [ ] **Step 1: Write the failing test**

Di `auth.service.spec.ts`, hapus konstanta `LOCAL_DISABLED_MESSAGE`, import `GoneException`, dan keempat tes `should throw GoneException when AUTH_LOCAL_ENABLED...` (register dua, login dua). Hapus cabang `AUTH_LOCAL_ENABLED` di `configGetImpl`.

Tambahkan di `describe('login')`:

```ts
it('rejects a user without a password hash', async () => {
  prisma.user.findFirst.mockResolvedValue({ ...mockUser, passwordHash: null });

  await expect(service.login(loginDto)).rejects.toThrow(UnauthorizedException);
  await expect(service.login(loginDto)).rejects.toThrow('Invalid credentials');
  expect(mockBcrypt.compare).not.toHaveBeenCalled();
});
```

Di `auth.controller.spec.ts`, hapus import `GoneException`, konstanta `LOCAL_DISABLED_MESSAGE`, dan dua tes `should propagate GoneException when local auth is disabled`.

Tambahkan:

```ts
it('keeps register limited to super admin and hr admin', () => {
  const { ROLES_KEY } = require('../../common/decorators/roles.decorator');
  const roles = Reflect.getMetadata(ROLES_KEY, AuthController.prototype.register);
  expect(roles).toEqual([UserRole.SUPER_ADMIN, UserRole.HR_ADMIN]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/modules/auth/auth.service.spec.ts src/modules/auth/auth.controller.spec.ts --no-coverage`

Expected: FAIL pada tes hash null jika `bcrypt.compare` tetap terpanggil, atau PASS lebih dulu untuk tes itu karena kode sudah menolak `passwordHash` null. Tes metadata role harus PASS. Jika tes hash null sudah PASS, lanjut ke Step 3 hanya untuk menghapus `assertLocalAuthEnabled`. Jangan meninggalkan `GoneException`.

- [ ] **Step 3: Write minimal implementation**

Hapus import `GoneException` dari `auth.service.ts`. Hapus method `assertLocalAuthEnabled` dan kedua pemanggilannya di `register` serta `login`. Method itu sekarang langsung menjalankan logika tenant dan kredensial yang sudah ada.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/modules/auth/auth.service.spec.ts src/modules/auth/auth.controller.spec.ts --no-coverage`

Expected: PASS. Tidak ada tes `GoneException`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/auth/auth.service.ts backend/src/modules/auth/auth.service.spec.ts backend/src/modules/auth/auth.controller.spec.ts
git commit -m "$(cat <<'EOF'
feat: keep local login and register enabled

EOF
)"
```

---

### Task 3: Guard JWT tanpa SSO

**Files:**
- Modify: `backend/src/modules/auth/guards/jwt-auth.guard.ts`
- Create: `backend/src/modules/auth/guards/jwt-auth.guard.spec.ts`
- Modify: `backend/src/modules/auth/auth.module.ts`
- Modify: `backend/src/modules/auth/auth.controller.ts`
- Modify: `backend/src/modules/auth/auth.controller.spec.ts`
- Modify: `backend/src/main.ts`
- Delete: `backend/src/modules/auth/guards/sso-auth.guard.ts`
- Delete: `backend/src/modules/auth/guards/sso-auth.guard.spec.ts`
- Delete: `backend/src/modules/auth/idp-client.service.ts`
- Delete: `backend/src/modules/auth/idp-client.service.spec.ts`
- Delete: `backend/src/modules/auth/identity-provision.service.ts`
- Delete: `backend/src/modules/auth/identity-provision.service.spec.ts`
- Delete: `backend/src/modules/auth/sso-role.mapper.ts`
- Delete: `backend/src/modules/auth/sso-role.mapper.spec.ts`
- Delete: `backend/src/modules/auth/company-override.ts`
- Delete: `backend/src/modules/auth/company-override.spec.ts`
- Delete: `backend/src/modules/auth/types/idp-user-context.ts`

**Interfaces:**
- Consumes: `AuthService.validateUser` dari Task 1.
- Produces: `JwtAuthGuard` tanpa dependensi `SsoAuthGuard`. `AuthController` tidak lagi punya `GET app-menus`. `AuthModule` mengekspor `AuthService`, `JwtAuthGuard`, dan `DeviceAppAuthGuard`.

- [ ] **Step 1: Write the failing test**

Buat `backend/src/modules/auth/guards/jwt-auth.guard.spec.ts`:

```ts
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { Test } from '@nestjs/testing';
import { AuthService } from '../auth.service';
import { JwtStrategy } from '../strategies/jwt.strategy';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  const secret = 'test-secret-test-secret-test-secret';

  it('rejects a bearer token that is not an HRMS JWT', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [
        PassportModule.register({ defaultStrategy: 'jwt' }),
        JwtModule.register({ secret }),
      ],
      providers: [
        JwtAuthGuard,
        JwtStrategy,
        {
          provide: ConfigService,
          useValue: { get: (key: string) => (key === 'JWT_SECRET' ? secret : undefined) },
        },
        {
          provide: AuthService,
          useValue: { validateUser: jest.fn() },
        },
      ],
    }).compile();

    const guard = moduleRef.get(JwtAuthGuard);
    const context = {
      switchToHttp: () => ({
        getRequest: () => ({
          headers: { authorization: 'Bearer not-a-jwt' },
        }),
        getResponse: () => ({}),
      }),
      getClass: () => class TestClass {},
      getHandler: () => function testHandler() {},
      getType: () => 'http',
    };

    await expect(guard.canActivate(context as never)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/modules/auth/guards/jwt-auth.guard.spec.ts --no-coverage`

Expected: FAIL. Guard saat ini melempar `Error: SsoAuthGuard is not available in JwtAuthGuard` karena `AUTH_LOCAL_ENABLED` tidak true.

- [ ] **Step 3: Write minimal implementation**

Ganti isi `jwt-auth.guard.ts` dengan:

```ts
import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {}
```

`auth.module.ts` providers dan exports:

```ts
providers: [AuthService, JwtStrategy, JwtAuthGuard, DeviceAppAuthGuard],
exports: [AuthService, JwtAuthGuard, DeviceAppAuthGuard],
```

Hapus import `SsoAuthGuard`, `IdpClientService`, dan `IdentityProvisionService`.

`auth.controller.ts` menghapus `IdpClientService`, `Headers`, `UnauthorizedException` jika tidak terpakai, method `appMenus`, dan decorator `ApiBearerAuth` jika hanya dipakai method itu. Constructor hanya menerima `AuthService`.

`auth.controller.spec.ts` menghapus provider `IdpClientService`.

`backend/src/main.ts` `allowedHeaders` menjadi:

```ts
allowedHeaders: ["Content-Type", "Authorization", "Accept"],
```

Hapus file yang tercantum di daftar Delete.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/modules/auth --no-coverage`

Expected: PASS. Tidak ada suite `SsoAuthGuard`, `IdpClientService`, `IdentityProvisionService`, atau `mapSsoRole`.

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/auth backend/src/main.ts
git commit -m "$(cat <<'EOF'
feat: authenticate API requests with HRMS JWT only

EOF
)"
```

---

### Task 4: Env login SSO

**Files:**
- Modify: `backend/src/config/env.validation.ts`
- Modify: `backend/.env.example`

**Interfaces:**
- Consumes: tidak ada.
- Produces: `validate()` tidak membaca `AUTH_LOCAL_ENABLED`, `SSO_OAUTH_CLIENT_ID`, `SSO_OAUTH_CLIENT_SECRET`, `IDP_USER_CONTEXT_PATH`, atau `SSO_USER_CONTEXT_CACHE_TTL_SEC`. Production tetap mewajibkan `SSO_API_BASE_URL` dan `SSO_SERVICE_API_KEY` minimal 32 karakter.

- [ ] **Step 1: Write the failing test**

Tambahkan di `backend/src/config/env.validation.spec.ts`:

```ts
it('does not require local-auth or oauth client vars', () => {
  const validated = validate({ ...base, NODE_ENV: 'development' });
  expect(validated).not.toHaveProperty('AUTH_LOCAL_ENABLED');
  expect(validated).not.toHaveProperty('SSO_OAUTH_CLIENT_ID');
  expect(validated).not.toHaveProperty('SSO_USER_CONTEXT_CACHE_TTL_SEC');
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/config/env.validation.spec.ts --no-coverage`

Expected: FAIL karena `AUTH_LOCAL_ENABLED` masih ada pada hasil `plainToInstance`.

- [ ] **Step 3: Write minimal implementation**

Di `env.validation.ts`, hapus field `SSO_OAUTH_CLIENT_ID`, `SSO_OAUTH_CLIENT_SECRET`, `IDP_USER_CONTEXT_PATH`, `SSO_USER_CONTEXT_CACHE_TTL_SEC`, dan `AUTH_LOCAL_ENABLED` beserta decorator `@Transform`-nya. Import `class-transformer` menjadi `plainToInstance` saja. Ganti `validate` dengan:

```ts
export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors.map((e) => Object.values(e.constraints || {}).join(', ')).join('\n')}`,
    );
  }

  const nodeEnv = validatedConfig.NODE_ENV;
  if (nodeEnv === Environment.Production) {
    if (!validatedConfig.SSO_API_BASE_URL) {
      throw new Error('SSO_API_BASE_URL is required in production');
    }
    if (!validatedConfig.SSO_SERVICE_API_KEY || validatedConfig.SSO_SERVICE_API_KEY.length < 32) {
      throw new Error('SSO_SERVICE_API_KEY is required in production (min 32 chars)');
    }
  }

  return validatedConfig;
}
```

Di `backend/.env.example`, hapus baris `SSO_OAUTH_CLIENT_ID`, `SSO_OAUTH_CLIENT_SECRET`, `IDP_USER_CONTEXT_PATH`, `SSO_USER_CONTEXT_CACHE_TTL_SEC`, dan `AUTH_LOCAL_ENABLED`. Biarkan `SSO_API_BASE_URL`, `SSO_SERVICE_API_KEY`, `SSO_SERVICE_APP_KEY`, dan `SSO_SERVICE_APP_NAME`.

Jangan mengedit `backend/.env` ke dalam commit. Hapus kunci yang sama di file lokal itu hanya supaya proses dev tidak membawa variabel mati.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/config/env.validation.spec.ts --no-coverage`

Expected: PASS. Tes production yang mewajibkan `SSO_API_BASE_URL` tetap PASS.

- [ ] **Step 5: Commit**

```bash
git add backend/src/config/env.validation.ts backend/src/config/env.validation.spec.ts backend/.env.example
git commit -m "$(cat <<'EOF'
chore: drop oauth login settings from env validation

EOF
)"
```

---

### Task 5: Skrip kata sandi awal

**Files:**
- Create: `backend/src/modules/auth/local-password-bootstrap.ts`
- Create: `backend/src/modules/auth/local-password-bootstrap.spec.ts`
- Create: `backend/scripts/set-local-passwords.ts`

**Interfaces:**
- Consumes: `bcrypt.hash(password, 10)`.
- Produces: `usersMissingPassword<T extends { passwordHash: string | null }>(users: T[]): T[]` dan `hashLocalPassword(password: string): Promise<string>`. Skrip `set-local-passwords.ts` membaca `LOCAL_BOOTSTRAP_PASSWORD`, memuat user aktif dengan `passwordHash: null`, dan tidak menimpa hash yang sudah ada.

- [ ] **Step 1: Write the failing test**

Buat `backend/src/modules/auth/local-password-bootstrap.spec.ts`:

```ts
import { hashLocalPassword, usersMissingPassword } from './local-password-bootstrap';
import * as bcrypt from 'bcrypt';

describe('local password bootstrap', () => {
  it('selects only users whose password hash is null', () => {
    const users = [
      { id: '1', passwordHash: null },
      { id: '2', passwordHash: 'already-set' },
    ];

    expect(usersMissingPassword(users)).toEqual([{ id: '1', passwordHash: null }]);
  });

  it('hashes with bcrypt cost 10', async () => {
    const hash = await hashLocalPassword('bootstrap-secret');
    expect(await bcrypt.compare('bootstrap-secret', hash)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd backend && npx jest src/modules/auth/local-password-bootstrap.spec.ts --no-coverage`

Expected: FAIL. Modul belum ada.

- [ ] **Step 3: Write minimal implementation**

`backend/src/modules/auth/local-password-bootstrap.ts`:

```ts
import * as bcrypt from 'bcrypt';

export function usersMissingPassword<T extends { passwordHash: string | null }>(
  users: T[],
): T[] {
  return users.filter((user) => user.passwordHash == null);
}

export function hashLocalPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}
```

`backend/scripts/set-local-passwords.ts`:

```ts
import { PrismaClient } from '@prisma/client';
import { hashLocalPassword, usersMissingPassword } from '../src/modules/auth/local-password-bootstrap';

async function main() {
  const password = process.env.LOCAL_BOOTSTRAP_PASSWORD;
  if (!password || password.length < 6) {
    throw new Error('LOCAL_BOOTSTRAP_PASSWORD is required (min 6 chars)');
  }

  const prisma = new PrismaClient();
  try {
    const active = await prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, passwordHash: true },
    });
    const missing = usersMissingPassword(active);
    const passwordHash = await hashLocalPassword(password);
    for (const user of missing) {
      await prisma.user.update({
        where: { id: user.id },
        data: { passwordHash },
      });
    }
    console.log(`Updated ${missing.length} user(s)`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd backend && npx jest src/modules/auth/local-password-bootstrap.spec.ts --no-coverage`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add backend/src/modules/auth/local-password-bootstrap.ts backend/src/modules/auth/local-password-bootstrap.spec.ts backend/scripts/set-local-passwords.ts
git commit -m "$(cat <<'EOF'
feat: add a bootstrap command for users without a password

EOF
)"
```

---

### Task 6: Klien API dan sesi frontend

**Files:**
- Create: `frontend/src/lib/redirect.ts`
- Modify: `frontend/src/lib/api.ts`
- Modify: `frontend/src/lib/api.test.ts`
- Modify: `frontend/src/contexts/AuthContext.tsx`
- Modify: `frontend/src/contexts/AuthContext.test.tsx`

**Interfaces:**
- Consumes: `POST /api/auth/login` mengembalikan `{ accessToken, user }`. `GET /api/auth/me` mengembalikan profil beserta `permissions`.
- Produces: `redirectToUrl(url: string): void`. `authApi.login(data: { email: string; password: string; tenantId?: string })`. `AuthContext.login(email: string, password: string): Promise<User>`. Tidak ada `loginWithSso`. Logout menghapus `hrms_token`, `hrms_user`, dan `hrms_refresh_token`, lalu memanggil `redirectToUrl('/login')`.

- [ ] **Step 1: Write the failing test**

Buat `frontend/src/lib/redirect.ts` belum. Ubah tes dulu.

Di `api.test.ts`, ganti mock `./pkce` dengan mock `./redirect`:

```ts
import * as redirectModule from './redirect';

jest.mock('./redirect', () => ({
  redirectToUrl: jest.fn(),
}));
```

Hapus tes `sends the selected company on HRMS requests`, tes `handles 403 NO_COMPANY...`, dan tes `handles 503 by transforming error to SSO unavailable error`.

Ubah tes 401 agar mengharapkan `redirectModule.redirectToUrl` dan tidak mengharapkan penghapusan `hrms_company_id`.

Tambahkan:

```ts
it('does not send an SSO company header', async () => {
  mockLocalStorage.setItem('hrms_token', 'test-access-token');
  mockLocalStorage.setItem('hrms_company_id', 'een-id');

  const requestInterceptor = (api.interceptors.request as any).handlers[0];
  const config = await requestInterceptor.fulfilled({ headers: {} });

  expect(config.headers.Authorization).toBe('Bearer test-access-token');
  expect(config.headers['x-sso-company-id']).toBeUndefined();
});
```

Di `AuthContext.test.tsx`, mock `@/lib/redirect` sebagai `{ redirectToUrl: jest.fn() }` dan hapus mock `@/lib/pkce`. Tambahkan `login: jest.fn()` pada `authApi`.

Ganti tombol `Login With SSO` dengan:

```tsx
<button onClick={() => auth.login('user@test.com', 'password123')}>Login</button>
```

Ganti tes `loginWithSso triggers initiateSsoLogin` dengan:

```ts
it('login stores the access token and loads the profile', async () => {
  const mockUser = {
    id: '1',
    email: 'user@test.com',
    role: 'HR_ADMIN',
    tenantId: 't1',
    permissions: ['*:*'],
  };
  (authApi.login as jest.Mock).mockResolvedValue({
    data: { accessToken: 'jwt-1', user: mockUser },
  });
  (authApi.getProfile as jest.Mock).mockResolvedValue({ data: mockUser });

  render(
    <AuthProvider>
      <TestComponent />
    </AuthProvider>,
  );

  await waitFor(() => {
    expect(screen.getByTestId('is-loading').textContent).toBe('false');
  });

  await act(async () => {
    screen.getByText('Login').click();
  });

  await waitFor(() => {
    expect(screen.getByTestId('is-authenticated').textContent).toBe('true');
  });
  expect(authApi.login).toHaveBeenCalledWith({
    email: 'user@test.com',
    password: 'password123',
  });
  expect(mockLocalStorage.setItem).toHaveBeenCalledWith('hrms_token', 'jwt-1');
});
```

Pada tes logout, ganti `pkceModule.redirectToUrl` dengan `redirectToUrl` dari `@/lib/redirect`, dan hapus ekspektasi `hrms_company_id`.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx jest src/lib/api.test.ts src/contexts/AuthContext.test.tsx --no-coverage`

Expected: FAIL. `auth.login` dan `./redirect` belum ada.

- [ ] **Step 3: Write minimal implementation**

`frontend/src/lib/redirect.ts`:

```ts
export function redirectToUrl(url: string) {
  if (typeof window !== 'undefined') {
    window.location.href = url;
  }
}
```

Di `api.ts`, ganti import `pkce` dan `selected-company` dengan `redirectToUrl` dari `./redirect`. Request interceptor hanya memasang `Authorization`. Response interceptor pada 401 menghapus `hrms_token`, `hrms_user`, dan `hrms_refresh_token`, lalu `redirectToUrl('/login')`. Hapus cabang 403 `NO_COMPANY` dan cabang 503. Biarkan `ssoApi` sampai Task 8, karena `Sidebar.tsx` masih mengimpornya.

Tambahkan:

```ts
export const authApi = {
  login: (data: { email: string; password: string; tenantId?: string }) =>
    api.post<{ accessToken: string; user: User }>('/auth/login', data),
  getProfile: () => api.get<User>('/auth/me'),
};
```

Di `AuthContext.tsx`, hapus `loginWithSso`, import `pkce`, dan `clearSelectedCompanyId`. Tambahkan `login`:

```ts
const login = useCallback(async (email: string, password: string): Promise<User> => {
  const response = await authApi.login({ email, password });
  return setSession(response.data.accessToken);
}, [setSession]);
```

`logout` menghapus tiga kunci token dan memanggil `redirectToUrl('/login')`. Masukkan `login` ke context. Hapus `loginWithSso` dari tipe.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx jest src/lib/api.test.ts src/contexts/AuthContext.test.tsx --no-coverage`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/lib/redirect.ts frontend/src/lib/api.ts frontend/src/lib/api.test.ts frontend/src/contexts/AuthContext.tsx frontend/src/contexts/AuthContext.test.tsx
git commit -m "$(cat <<'EOF'
feat: sign in from the HRMS login endpoint

EOF
)"
```

---

### Task 7: Halaman login

**Files:**
- Modify: `frontend/src/app/(auth)/login/page.tsx`
- Modify: `frontend/src/app/(auth)/login/page.test.tsx`

**Interfaces:**
- Consumes: `useAuth().login(email: string, password: string)` dari Task 6.
- Produces: form email dan kata sandi. Sukses mengarah ke `/dashboard` lewat efek `isAuthenticated`. Gagal menampilkan pesan error.

- [ ] **Step 1: Write the failing test**

Ganti isi `login/page.test.tsx` agar mock `useAuth` menyediakan `login`, bukan `loginWithSso`.

```ts
it('submits email and password', async () => {
  const mockLogin = jest.fn().mockResolvedValue(undefined);
  (useAuth as jest.Mock).mockReturnValue({
    isAuthenticated: false,
    isLoading: false,
    login: mockLogin,
  });

  render(<LoginPage />);

  await userEvent.type(screen.getByLabelText(/email/i), 'user@test.com');
  await userEvent.type(screen.getByLabelText(/kata sandi/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /^masuk$/i }));

  expect(mockLogin).toHaveBeenCalledWith('user@test.com', 'password123');
});

it('shows the login error message', async () => {
  const mockLogin = jest.fn().mockRejectedValue(new Error('Invalid credentials'));
  (useAuth as jest.Mock).mockReturnValue({
    isAuthenticated: false,
    isLoading: false,
    login: mockLogin,
  });

  render(<LoginPage />);
  await userEvent.type(screen.getByLabelText(/email/i), 'user@test.com');
  await userEvent.type(screen.getByLabelText(/kata sandi/i), 'password123');
  await userEvent.click(screen.getByRole('button', { name: /^masuk$/i }));

  expect(await screen.findByText('Invalid credentials')).toBeInTheDocument();
});
```

Pertahankan tes redirect ke `/dashboard` saat `isAuthenticated` dan tes spinner saat `isLoading`. Hapus tes branding SSO.

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx jest src/app/\\(auth\\)/login/page.test.tsx --no-coverage`

Expected: FAIL. Halaman masih merender tombol SSO dan tidak punya input email.

- [ ] **Step 3: Write minimal implementation**

Ganti `frontend/src/app/(auth)/login/page.tsx` dengan form ini. Pertahankan logo, `Button`, dan `FormError`.

```tsx
'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { Button, FormError } from '@/components/ui';

export default function LoginPage() {
  const router = useRouter();
  const { isAuthenticated, isLoading, login } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.push('/dashboard');
    }
  }, [isLoading, isAuthenticated, router]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await login(email, password);
    } catch (err) {
      setSubmitting(false);
      setError(err instanceof Error ? err.message : 'Login gagal. Periksa email dan kata sandi.');
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-[3px] border-primary-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="w-full max-w-md space-y-6 sm:space-y-8">
      <div className="text-center">
        <img src="/logo.png" alt="Eiger Nature" className="mx-auto h-12 sm:h-16 w-auto object-contain" />
        <h2 className="mt-4 sm:mt-6 text-2xl sm:text-3xl font-bold text-warm-900">Masuk ke HRMS</h2>
        <p className="mt-1.5 sm:mt-2 text-sm text-warm-500 max-w-sm mx-auto">
          Gunakan email dan kata sandi akun HRMS.
        </p>
      </div>
      <form
        onSubmit={handleSubmit}
        className="bg-white py-6 sm:py-8 px-5 sm:px-7 shadow-elevated rounded-2xl border border-warm-200 space-y-5"
      >
        {error && <FormError message={error} />}
        <label className="block text-sm font-medium text-warm-700">
          Email
          <input
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-1 w-full rounded-lg border border-warm-300 px-3 py-2"
          />
        </label>
        <label className="block text-sm font-medium text-warm-700">
          Kata sandi
          <input
            type="password"
            required
            minLength={6}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-1 w-full rounded-lg border border-warm-300 px-3 py-2"
          />
        </label>
        <Button type="submit" className="w-full h-12" loading={submitting} disabled={submitting}>
          Masuk
        </Button>
      </form>
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx jest src/app/\\(auth\\)/login/page.test.tsx --no-coverage`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend/src/app/\(auth\)/login/page.tsx frontend/src/app/\(auth\)/login/page.test.tsx
git commit -m "$(cat <<'EOF'
feat: replace SSO login with an email and password form

EOF
)"
```

---

### Task 8: Shell aplikasi tanpa SSO

**Files:**
- Modify: `frontend/src/components/layout/Sidebar.tsx`
- Modify: `frontend/src/components/layout/Sidebar.test.tsx`
- Modify: `frontend/src/components/layout/DashboardLayout.tsx`
- Modify: `frontend/src/components/layout/DashboardLayout.test.tsx`
- Modify: `frontend/src/app/(protected)/my-profile/page.tsx`
- Delete: `frontend/src/lib/pkce.ts`
- Delete: `frontend/src/lib/pkce.test.ts`
- Delete: `frontend/src/lib/selected-company.ts`
- Delete: `frontend/src/lib/selected-company.test.ts`
- Delete: `frontend/src/components/company/SelectCompanyScreen.tsx`
- Delete: `frontend/src/components/company/SelectCompanyScreen.test.tsx`
- Delete: `frontend/src/app/auth/callback/page.tsx`
- Delete: `frontend/src/app/auth/callback/page.test.tsx`
- Delete: `frontend/src/app/api/auth/token/route.ts`
- Modify: `frontend/.env.example`

**Interfaces:**
- Consumes: `staticSections` yang sudah ada di `Sidebar.tsx`. `useAuth` dari Task 6.
- Produces: sidebar tidak memanggil menu SSO. `DashboardLayout` menampilkan shell saat user terautentikasi, tanpa `hrms_company_id`. Halaman profil tidak menautkan portal SSO.

- [ ] **Step 1: Write the failing test**

Di `Sidebar.test.tsx`, hapus `ssoApi` dari mock `@/lib/api`. Hapus tes `renders dynamically fetched SSO app menus when available`. Tambahkan:

```ts
it('renders the static dashboard link', () => {
  render(<Sidebar {...defaultProps} />);
  expect(screen.getByText('Dashboard')).toBeInTheDocument();
});
```

Di `DashboardLayout.test.tsx`, hapus mock `SelectCompanyScreen` dan `localStorage.setItem('hrms_company_id', ...)`. Ganti tes `asks for a company before showing the app` dengan:

```ts
it('renders the app shell without a company picker', () => {
  localStorage.removeItem('hrms_company_id');
  render(
    <DashboardLayout>
      <div>Page content</div>
    </DashboardLayout>,
  );
  expect(screen.getByText('Page content')).toBeInTheDocument();
  expect(screen.queryByTestId('select-company')).not.toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd frontend && npx jest src/components/layout/Sidebar.test.tsx src/components/layout/DashboardLayout.test.tsx --no-coverage`

Expected: FAIL. `DashboardLayout` masih menampilkan pemilih perusahaan saat `hrms_company_id` kosong.

- [ ] **Step 3: Write minimal implementation**

Di `frontend/src/lib/api.ts`, hapus interface `SsoAppMenuNode`, `SsoAppMenusResponse`, dan export `ssoApi` (blok "SSO APP MENUS API" di akhir file).

Di `Sidebar.tsx`:
- Import hanya `API_URL, api` dari `@/lib/api`.
- Hapus `DynamicIcon`, `ssoApi`, `SsoAppMenuNode`, `transformSsoNodeToNavItem`, dan `transformSsoMenusToSections`.
- Hapus state `dynamicSections` dan `useEffect` yang memanggil `ssoApi.getAppMenus`.
- Ganti `const sections = dynamicSections || staticSections` dengan `const sections = staticSections`.

Di `DashboardLayout.tsx`, hapus import `SelectCompanyScreen` dan `readSelectedCompanyId`, state `companyId`, serta cabang `if (!companyId)`. User terautentikasi langsung melihat `Sidebar`, `Header`, dan `children`.

Di `my-profile/page.tsx`, hapus `ssoPortalUrl` dan blok catatan "Ingin mengubah Nama atau Email akun Anda?" beserta tautan "Buka SSO Portal". Form change request phone dan designation tetap.

Hapus file pada daftar Delete.

Di `frontend/.env.example`, sisakan:

```
NEXT_PUBLIC_API_URL=http://localhost:3001/api

NEXT_PUBLIC_APP_NAME=HRMS
NEXT_PUBLIC_APP_ENV=development
```

Hapus `NEXT_PUBLIC_SSO_*` dan `SSO_OAUTH_CLIENT_SECRET` dari `frontend/.env` lokal. Jangan commit file itu.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd frontend && npx jest src/components/layout/Sidebar.test.tsx src/components/layout/DashboardLayout.test.tsx src/lib/api.test.ts src/contexts/AuthContext.test.tsx src/app/\\(auth\\)/login/page.test.tsx --no-coverage`

Expected: PASS

Lalu pastikan tidak ada impor ke file yang dihapus:

Run: `cd frontend && npx jest --no-coverage`

Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add frontend
git commit -m "$(cat <<'EOF'
feat: open the app shell from the local session

EOF
)"
```

`git add frontend` hanya jika tidak ada `.env` yang ikut ter-stage. Jika `frontend/.env` muncul di `git status`, keluarkan dengan `git restore --staged frontend/.env` sebelum commit.

---

### Task 9: Cek sisa jalur login SSO

**Files:**
- Modify: tidak ada file fitur baru. Perbaiki impor yang gagal kompilasi jika pencarian menemukan sisa.

**Interfaces:**
- Consumes: seluruh task sebelumnya.
- Produces: pencarian di bawah kosong di `backend/src` dan `frontend/src`.

- [ ] **Step 1: Search**

Run dari root repo:

```bash
rg -n "SsoAuthGuard|IdpClient|IdentityProvision|loginWithSso|pkce|SelectCompanyScreen|x-sso-company-id|AUTH_LOCAL_ENABLED|app-menus" backend/src frontend/src
```

Expected: tidak ada hasil. `sso-client` dan `syncFromSso` boleh masih ada.

- [ ] **Step 2: Run both test suites**

```bash
cd backend && npx jest --no-coverage
cd frontend && npx jest --no-coverage
```

Expected: PASS

- [ ] **Step 3: Update the knowledge graph**

```bash
graphify update .
```

- [ ] **Step 4: Commit only if Step 1 forced a code fix**

Jika ada perbaikan sisa impor:

```bash
git add backend/src frontend/src
git commit -m "$(cat <<'EOF'
fix: remove leftover SSO login references

EOF
)"
```

Jika pencarian sudah kosong, jangan buat commit kosong.
