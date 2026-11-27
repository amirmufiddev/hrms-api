import { timingSafeEqual } from 'crypto';
import { UserRole } from '@prisma/client';
import { AuthenticatedUser } from '../../../common/types/jwt-payload.type';

export const DEVICE_APP_PERMISSION = 'employees:assign-card';

export function tokenEquals(presented: string, expected: string): boolean {
  const left = Buffer.from(presented);
  const right = Buffer.from(expected);
  if (left.length === 0 || left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}

export function deviceAppUser(tenantId: string): AuthenticatedUser {
  return {
    userId: 'attendance-device',
    email: 'attendance-device@local',
    tenantId,
    role: UserRole.EMPLOYEE,
    permissions: [DEVICE_APP_PERMISSION, 'attendance:ingest'],
  };
}

export function readBearerToken(headers: Record<string, string | undefined>): string | null {
  const header = headers.authorization ?? headers.Authorization;
  if (!header?.startsWith('Bearer ')) {
    return null;
  }
  const token = header.slice('Bearer '.length).trim();
  return token.length > 0 ? token : null;
}
