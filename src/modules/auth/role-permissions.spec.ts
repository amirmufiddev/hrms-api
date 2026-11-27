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