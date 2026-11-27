import { Injectable, CanActivate, ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole } from '@prisma/client';
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { AuthenticatedUser } from '../types/jwt-payload.type';

/**
 * Guard permission dari SSO.
 * Cocokkan persis ('leave:read') atau wildcard ('leave:*', '*:*').
 * SUPER_ADMIN melewati cek.
 */
@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
    );

    if (!requiredPermissions || requiredPermissions.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser;

    if (!user) {
      return false;
    }

    if (user.role === UserRole.SUPER_ADMIN) {
      return true;
    }

    const userPermissions = user.permissions || [];
    if (userPermissions.length === 0) {
      return false;
    }

    return this.hasMatchingPermission(userPermissions, requiredPermissions);
  }

  private hasMatchingPermission(
    userPermissions: string[],
    requiredPermissions: string[],
  ): boolean {
    return requiredPermissions.some((required) => {
      const [reqModule, reqAction] = required.split(':');

      return userPermissions.some((userPerm) => {
        if (userPerm === required) {
          return true;
        }

        const [userModule, userAction] = userPerm.split(':');
        if (userModule === reqModule && userAction === '*') {
          return true;
        }

        if (userModule === '*' && userAction === '*') {
          return true;
        }

        return false;
      });
    });
  }
}
