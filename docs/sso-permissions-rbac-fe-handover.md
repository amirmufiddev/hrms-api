# Frontend Handover: SSO Permission Catalog & RBAC Granular HRMS

Dokumen ini menjelaskan integrasi dan penggunaan permission catalog granular (`permissions: string[]`) dari SSO ke HRMS Frontend.

---

## 1. Overview Arsitektur
SSO `eal-rbac-api` menyediakan otorisasi granular berbasis permission. Setiap user yang login membawa daftar permission aktif (`permissions: string[]`) sesuai peran dan assignment perusahaannya di SSO.

Contoh daftar permission:
- `employees:read`, `employees:create`, `employees:update`, `employees:delete`
- `leave:read`, `leave:create`, `leave:approve`, `leave:manage`
- `expenses:read`, `expenses:create`, `expenses:approve`, `expenses:reimburse`
- `payroll:read`, `payroll:process`, `payroll:manage`
- `attendance:read`, `attendance:record`, `attendance:approve`

---

## 2. Struktur Data User di Frontend (`AuthContext`)

Di `frontend/src/types/index.ts`:

```typescript
export interface User {
  id: string;
  email: string;
  role: UserRole;
  tenantId: string;
  ssoUserId?: string;
  ssoCompanyId?: string;
  permissions?: string[]; // Array permission key dari SSO
  company?: {
    id: string;
    name: string;
    code: string;
  };
  employeeId?: string;
  employee?: Employee;
}
```

---

## 3. Helper Rekomendasi Frontend (`usePermission` Hook & `<Can>` Component)

### 3.1 Hook `usePermission`
```typescript
// frontend/src/hooks/usePermission.ts
import { useAuth } from '@/contexts/AuthContext';
import { UserRole } from '@/types';

export function usePermission(requiredPermission: string): boolean {
  const { user } = useAuth();
  if (!user) return false;

  // Super Admin bypass
  if (user.role === UserRole.SUPER_ADMIN) return true;

  const permissions = user.permissions || [];
  const [reqModule, reqAction] = requiredPermission.split(':');

  return permissions.some((perm) => {
    if (perm === requiredPermission || perm === '*:*') return true;
    const [mod, act] = perm.split(':');
    return mod === reqModule && act === '*';
  });
}
```

### 3.2 Komponen Otorisasi Bersyarat `<Can>`
```tsx
// frontend/src/components/common/Can.tsx
import React from 'react';
import { usePermission } from '@/hooks/usePermission';

interface CanProps {
  I: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function Can({ I, children, fallback = null }: CanProps) {
  const isAllowed = usePermission(I);
  return isAllowed ? <>{children}</> : <>{fallback}</>;
}
```

### 3.3 Contoh Penggunaan di UI
```tsx
<Can I="leave:approve">
  <Button onClick={handleApprove}>Approve Cuti</Button>
</Can>

<Can I="expenses:reimburse">
  <Button onClick={handleReimburse}>Cairkan Dana</Button>
</Can>
```

---

## 4. API Endpoints
Endpoint `GET /api/auth/me` secara otomatis menyematkan field `permissions: string[]` pada object user yang dikembalikan.
