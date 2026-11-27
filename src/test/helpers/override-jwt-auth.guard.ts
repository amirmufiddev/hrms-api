import { CanActivate } from '@nestjs/common';
import { TestingModuleBuilder } from '@nestjs/testing';
import { JwtAuthGuard } from '../../modules/auth/guards/jwt-auth.guard';

/** No-op guard for controller unit tests that do not exercise auth. */
export const passthroughJwtAuthGuard: CanActivate = {
  canActivate: () => true,
};

export function overrideJwtAuthGuard(
  builder: TestingModuleBuilder,
): TestingModuleBuilder {
  return builder.overrideGuard(JwtAuthGuard).useValue(passthroughJwtAuthGuard);
}
