import { SetMetadata } from '@nestjs/common';

export const PERMISSIONS_KEY = 'permissions';

/**
 * Decorator to specify required permissions for an endpoint.
 * Supports exact match (e.g. 'leave:approve') and module wildcards (e.g. 'leave:*').
 * 
 * Usage:
 * @RequirePermissions('leave:approve', 'leave:manage')
 */
export const RequirePermissions = (...permissions: string[]) =>
  SetMetadata(PERMISSIONS_KEY, permissions);
