import { Test, TestingModule } from '@nestjs/testing';
import { UserRole } from '@prisma/client';
import { PunchIngestController } from './punch-ingest.controller';
import { PunchIngestService } from './punch-ingest.service';
import { PunchQueueService } from './punch-queue.service';
import { DeviceAppAuthGuard } from '../auth/guards/device-app-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { PERMISSIONS_KEY } from '../../common/decorators/permissions.decorator';
import { AuthenticatedUser } from '../../common/types/jwt-payload.type';

describe('PunchIngestController', () => {
  let controller: PunchIngestController;
  let punches: { ingest: jest.Mock };
  let queue: { processOnce: jest.Mock };

  const deviceUser: AuthenticatedUser = {
    userId: 'attendance-device',
    email: 'attendance-device@local',
    tenantId: 'tenant-1',
    role: UserRole.EMPLOYEE,
    permissions: ['employees:assign-card', 'attendance:ingest'],
  };

  beforeEach(async () => {
    punches = { ingest: jest.fn() };
    queue = { processOnce: jest.fn().mockResolvedValue(undefined) };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [PunchIngestController],
      providers: [
        { provide: PunchIngestService, useValue: punches },
        { provide: PunchQueueService, useValue: queue },
      ],
    })
      .overrideGuard(DeviceAppAuthGuard)
      .useValue({ canActivate: () => true })
      .overrideGuard(PermissionsGuard)
      .useValue({ canActivate: () => true })
      .compile();

    controller = module.get(PunchIngestController);
  });

  it('menerima token mesin atau sesi meja yang mendaftarkan kartu', () => {
    expect(Reflect.getMetadata(PERMISSIONS_KEY, PunchIngestController.prototype.ingest)).toEqual([
      'attendance:ingest',
      'employees:assign-card',
    ]);
  });

  it('meneruskan batch tap ke PunchIngestService tanpa fold di controller', async () => {
    const body = {
      deviceCode: 'GATE-01',
      punches: [{ nik: '012345', punchedAt: '2026-10-16T01:00:00.000Z' }],
    };
    punches.ingest.mockResolvedValue({ results: [{ nik: '012345', status: 'queued' }] });

    const result = await controller.ingest(deviceUser, body as any);

    expect(punches.ingest).toHaveBeenCalledWith('tenant-1', body);
    expect(queue.processOnce).toHaveBeenCalledTimes(1);
    expect(result).toEqual({ results: [{ nik: '012345', status: 'queued' }] });
  });
});
