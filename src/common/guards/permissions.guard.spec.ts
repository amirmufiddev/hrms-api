import { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PermissionsGuard } from './permissions.guard';
import { AuthenticatedUser } from '../types/jwt-payload.type';

describe('PermissionsGuard', () => {
  let guard: PermissionsGuard;
  let reflector: Reflector;

  beforeEach(() => {
    reflector = new Reflector();
    guard = new PermissionsGuard(reflector);
  });

  function createMockContext(
    user?: Partial<AuthenticatedUser> | null,
  ): ExecutionContext {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: () => ({
        getRequest: () => ({
          user,
        }),
      }),
    } as unknown as ExecutionContext;
  }

  it('allows access if no permissions are required', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(null);
    const context = createMockContext({ role: UserRole.EMPLOYEE });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access if required permissions array is empty', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue([]);
    const context = createMockContext({ role: UserRole.EMPLOYEE });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access if user is not attached to request', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['leave:approve']);
    const context = createMockContext(null);

    expect(guard.canActivate(context)).toBe(false);
  });

  it('denies HR_ADMIN when permissions are empty', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['onboarding:read']);
    const context = createMockContext({
      role: UserRole.HR_ADMIN,
      permissions: [],
    });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('allows HR_ADMIN when they have matching permission', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['onboarding:read']);
    const context = createMockContext({
      role: UserRole.HR_ADMIN,
      permissions: ['onboarding:read'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access if user has SUPER_ADMIN role (bypass)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['leave:approve']);
    const context = createMockContext({
      role: UserRole.SUPER_ADMIN,
      permissions: [],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when user has exact matching permission', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['leave:approve']);
    const context = createMockContext({
      role: UserRole.EMPLOYEE,
      permissions: ['leave:read', 'leave:approve'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when user has module wildcard permission (leave:*)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['leave:approve']);
    const context = createMockContext({
      role: UserRole.EMPLOYEE,
      permissions: ['leave:*'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('allows access when user has global wildcard permission (*:*)', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['expenses:reimburse']);
    const context = createMockContext({
      role: UserRole.EMPLOYEE,
      permissions: ['*:*'],
    });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('denies access when the SSO permission is missing', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['leave:approve']);
    const context = createMockContext({
      role: UserRole.EMPLOYEE,
      permissions: ['leave:read', 'expenses:read'],
    });

    expect(guard.canActivate(context)).toBe(false);
  });

  it('denies access when user permissions list is empty', () => {
    jest.spyOn(reflector, 'getAllAndOverride').mockReturnValue(['leave:approve']);
    const context = createMockContext({
      role: UserRole.EMPLOYEE,
      permissions: [],
    });

    expect(guard.canActivate(context)).toBe(false);
  });
});
