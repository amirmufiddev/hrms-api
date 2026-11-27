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