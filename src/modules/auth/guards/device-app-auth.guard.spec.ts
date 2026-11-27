import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { UserRole } from '@prisma/client';
import { DeviceAppAuthGuard } from './device-app-auth.guard';
import { JwtAuthGuard } from './jwt-auth.guard';

const APP_TOKEN = 'a'.repeat(64);

function contextFor(authorization?: string) {
  const request: { headers: Record<string, string | undefined>; user?: unknown } = {
    headers: authorization ? { authorization } : {},
  };
  const context = {
    switchToHttp: () => ({ getRequest: () => request }),
  } as ExecutionContext;
  return { context, request };
}

describe('DeviceAppAuthGuard', () => {
  const jwtAuth = { canActivate: jest.fn().mockReturnValue(true) };
  const config = {
    get: jest.fn((key: string) => {
      if (key === 'ATTENDANCE_DEVICE_APP_TOKEN') return APP_TOKEN;
      if (key === 'ATTENDANCE_DEVICE_TENANT_ID') return '45f39972-f027-440c-ae15-59341f13d33e';
      return undefined;
    }),
  };

  const guard = new DeviceAppAuthGuard(config as unknown as ConfigService, jwtAuth as unknown as JwtAuthGuard);

  beforeEach(() => {
    jwtAuth.canActivate.mockClear();
  });

  it('menerima app token dan mengunci izin ke daftar kartu serta ingest tap', () => {
    const { context, request } = contextFor(`Bearer ${APP_TOKEN}`);
    expect(guard.canActivate(context)).toBe(true);
    expect(jwtAuth.canActivate).not.toHaveBeenCalled();
    expect(request.user).toMatchObject({
      tenantId: '45f39972-f027-440c-ae15-59341f13d33e',
      role: UserRole.EMPLOYEE,
      permissions: ['employees:assign-card', 'attendance:ingest'],
    });
  });

  it('token SSO tetap diteruskan ke penjaga biasa', () => {
    const { context } = contextFor('Bearer token-sso-pengguna');
    expect(guard.canActivate(context)).toBe(true);
    expect(jwtAuth.canActivate).toHaveBeenCalledTimes(1);
  });

  it('menolak app token bila tenant belum diisi', () => {
    config.get.mockImplementation((key: string) => {
      if (key === 'ATTENDANCE_DEVICE_APP_TOKEN') return APP_TOKEN;
      return undefined;
    });
    const { context } = contextFor(`Bearer ${APP_TOKEN}`);
    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
    config.get.mockImplementation((key: string) => {
      if (key === 'ATTENDANCE_DEVICE_APP_TOKEN') return APP_TOKEN;
      if (key === 'ATTENDANCE_DEVICE_TENANT_ID') return '45f39972-f027-440c-ae15-59341f13d33e';
      return undefined;
    });
  });
});
