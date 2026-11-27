import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtAuthGuard } from './jwt-auth.guard';
import { deviceAppUser, readBearerToken, tokenEquals } from './device-app-token';

@Injectable()
export class DeviceAppAuthGuard implements CanActivate {
  constructor(
    private readonly config: ConfigService,
    private readonly jwtAuth: JwtAuthGuard,
  ) {}

  canActivate(context: ExecutionContext) {
    const request = context.switchToHttp().getRequest<{
      headers: Record<string, string | undefined>;
      user?: ReturnType<typeof deviceAppUser>;
    }>();
    const presented = readBearerToken(request.headers);
    const expected = this.config.get<string>('ATTENDANCE_DEVICE_APP_TOKEN')?.trim();

    if (presented && expected && tokenEquals(presented, expected)) {
      const tenantId = this.config.get<string>('ATTENDANCE_DEVICE_TENANT_ID')?.trim();
      if (!tenantId) {
        throw new UnauthorizedException('DEVICE_APP_TENANT_MISSING');
      }
      request.user = deviceAppUser(tenantId);
      return true;
    }

    return this.jwtAuth.canActivate(context);
  }
}
