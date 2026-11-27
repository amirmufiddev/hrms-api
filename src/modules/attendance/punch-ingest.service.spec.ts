import { Test, TestingModule } from '@nestjs/testing';
import { ConfigService } from '@nestjs/config';
import { PunchIngestService } from './punch-ingest.service';
import { PrismaService } from '../../prisma/prisma.service';
import { OtCalculationService } from './ot-calculation.service';
import { createMockPrismaService } from '../../test/helpers';

describe('PunchIngestService', () => {
  let service: PunchIngestService;
  let prisma: any;

  const tenantId = 'tenant-1';
  const punch = {
    nik: '012345',
    punchedAt: '2026-10-16T01:00:00.000Z',
    verifyMode: 'CARD' as const,
    deviceState: 0,
  };

  beforeEach(async () => {
    prisma = createMockPrismaService();
    prisma.attendanceDevice.findUnique.mockResolvedValue(null);
    prisma.attendanceDevice.create.mockResolvedValue({ id: 'dev-1', lastPunchAt: null });
    prisma.attendanceDevice.upsert.mockResolvedValue({ id: 'dev-1', lastPunchAt: null });
    prisma.shiftAssignment.findFirst.mockResolvedValue(null);
    prisma.attendanceRecord.findUnique.mockResolvedValue(null);
    prisma.attendanceRecord.create.mockResolvedValue({ id: 'att-1' });
    prisma.attendancePunch.findMany.mockResolvedValue([]);
    prisma.attendancePunchJob.findUnique.mockResolvedValue(null);
    prisma.attendancePunchJob.create.mockResolvedValue({ id: 'job-1' });

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PunchIngestService,
        { provide: PrismaService, useValue: prisma },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === 'ATTENDANCE_DEVICE_SERIAL') return 'AXUD28053046';
              if (key === 'ATTENDANCE_DEVICE_HOST') return '192.168.1.224';
              return undefined;
            },
          },
        },
        {
          provide: OtCalculationService,
          useValue: {
            getOtRule: jest.fn().mockResolvedValue(null),
            calculateOtMinutes: jest.fn().mockReturnValue(0),
          },
        },
      ],
    }).compile();

    service = module.get(PunchIngestService);
  });

  it('mengantre tap baru dan tidak mengantre ulang tap yang sama', async () => {
    prisma.attendancePunch.findFirst.mockResolvedValue(null);
    prisma.attendancePunchJob.findUnique
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'job-1', status: 'PENDING' });

    const body = { deviceCode: 'GATE-01', punches: [punch] };
    const first = await service.ingest(tenantId, body);
    const second = await service.ingest(tenantId, body);

    expect(first.results[0].status).toBe('queued');
    expect(second.results[0].status).toBe('queued');
    expect(prisma.attendancePunchJob.create).toHaveBeenCalledTimes(1);
    expect(prisma.attendancePunch.create).not.toHaveBeenCalled();
    expect(prisma.attendanceRecord.create).not.toHaveBeenCalled();
  });

  it('menyimpan NIK yang tidak dikenal ke antrean tanpa membuat absensi', async () => {
    prisma.attendancePunch.findFirst.mockResolvedValue(null);

    const result = await service.ingest(tenantId, {
      deviceCode: 'GATE-01',
      punches: [{ nik: '999999', punchedAt: '2026-10-16T01:00:00.000Z', deviceState: 0 }],
    });

    expect(result.results[0].status).toBe('queued');
    expect(prisma.attendancePunchJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ nik: '999999' }),
    });
    expect(prisma.attendancePunch.create).not.toHaveBeenCalled();
  });

  it('menolak NIK bukan angka tanpa membuat pekerjaan', async () => {
    const result = await service.ingest(tenantId, {
      deviceCode: 'GATE-01',
      punches: [{ nik: 'EMP001', punchedAt: '2026-10-16T01:00:00.000Z', deviceState: 0 }],
    });

    expect(result.results[0].status).toBe('rejected');
    expect(prisma.attendancePunchJob.create).not.toHaveBeenCalled();
  });

  it('menjawab duplicate bila punch sudah tersimpan', async () => {
    prisma.attendancePunch.findFirst.mockResolvedValue({ id: 'p1', employeeId: 'emp-1' });

    const result = await service.ingest(tenantId, { deviceCode: 'GATE-01', punches: [punch] });

    expect(result.results[0].status).toBe('duplicate');
    expect(prisma.attendancePunchJob.create).not.toHaveBeenCalled();
  });

  it('menyimpan mode verifikasi komposit ke antrean', async () => {
    prisma.attendancePunch.findFirst.mockResolvedValue(null);

    const result = await service.ingest(tenantId, {
      deviceCode: 'GATE-01',
      punches: [
        {
          nik: '012345',
          punchedAt: '2026-10-16T01:00:00.000Z',
          verifyMode: 'CARD_FACE',
          deviceState: 0,
        },
      ],
    });

    expect(result.results[0].status).toBe('queued');
    expect(prisma.attendancePunchJob.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ nik: '012345', verifyMode: 'CARD_FACE' }),
    });
  });

  it('melipat masuk dan keluar setelah pekerjaan diproses', async () => {
    prisma.employee.findFirst.mockResolvedValue({
      id: 'emp-1',
      employeeCode: '012345',
      employmentType: 'PERMANENT',
    });
    prisma.attendancePunch.findFirst.mockResolvedValue(null);
    let created = 0;
    prisma.attendancePunch.create.mockImplementation(async () => {
      created += 1;
      return { id: `p${created}` };
    });
    prisma.attendanceDevice.findUnique.mockResolvedValue({ id: 'dev-1', lastPunchAt: null });
    prisma.attendancePunch.findMany.mockImplementation(async () => {
      if (created < 2) {
        return [{ id: 'p1', punchedAt: new Date('2026-10-16T01:00:00.000Z'), deviceState: 0, direction: 'IN' }];
      }
      return [
        { id: 'p1', punchedAt: new Date('2026-10-16T01:00:00.000Z'), deviceState: 0, direction: 'IN' },
        { id: 'p2', punchedAt: new Date('2026-10-16T09:00:00.000Z'), deviceState: 1, direction: 'OUT' },
      ];
    });

    await service.applyQueuedJob({
      id: 'job-1',
      tenantId,
      deviceId: 'dev-1',
      nik: '012345',
      punchedAt: new Date('2026-10-16T01:00:00.000Z'),
      verifyMode: 'CARD',
      deviceState: 0,
    });
    await service.applyQueuedJob({
      id: 'job-2',
      tenantId,
      deviceId: 'dev-1',
      nik: '012345',
      punchedAt: new Date('2026-10-16T09:00:00.000Z'),
      verifyMode: 'CARD',
      deviceState: 1,
    });

    expect(prisma.attendanceRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        employeeId: 'emp-1',
        source: 'DEVICE',
        clockInTime: new Date('2026-10-16T01:00:00.000Z'),
        clockOutTime: new Date('2026-10-16T09:00:00.000Z'),
        workedMinutes: 8 * 60,
      }),
    });
  });

  it('tetap melipat hari jika punch sudah ada setelah gagal parsial', async () => {
    prisma.employee.findFirst.mockResolvedValue({
      id: 'emp-1',
      employeeCode: '012345',
      employmentType: 'PERMANENT',
    });
    prisma.attendancePunch.findFirst.mockResolvedValue({
      id: 'p1',
      employeeId: 'emp-1',
      punchedAt: new Date('2026-10-16T01:00:00.000Z'),
    });
    prisma.attendanceDevice.findUnique.mockResolvedValue({ id: 'dev-1', lastPunchAt: null });
    prisma.attendancePunch.findMany.mockResolvedValue([
      {
        id: 'p1',
        punchedAt: new Date('2026-10-16T01:00:00.000Z'),
        deviceState: 0,
        direction: 'IN',
      },
    ]);

    await service.applyQueuedJob({
      id: 'job-1',
      tenantId,
      deviceId: 'dev-1',
      nik: '012345',
      punchedAt: new Date('2026-10-16T01:00:00.000Z'),
      verifyMode: 'CARD',
      deviceState: 0,
    });

    expect(prisma.attendancePunch.create).not.toHaveBeenCalled();
    expect(prisma.attendanceRecord.create).toHaveBeenCalledWith({
      data: expect.objectContaining({
        employeeId: 'emp-1',
        source: 'DEVICE',
        clockInTime: new Date('2026-10-16T01:00:00.000Z'),
      }),
    });
  });
});
