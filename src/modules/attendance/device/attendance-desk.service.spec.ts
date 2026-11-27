import { Test } from '@nestjs/testing';
import { AttendanceDeskService } from './attendance-desk.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { createMockPrismaService } from '../../../test/helpers';

describe('AttendanceDeskService device CRUD', () => {
  it('menyimpan password dan tidak mengembalikannya', async () => {
    const prisma = createMockPrismaService() as any;
    prisma.attendanceDevice.create.mockResolvedValue({
      id: 'dev-1',
      code: 'GATE-01',
      serialNumber: 'AX1',
      firmware: null,
      host: '10.21.20.174',
      webPort: 80,
      softwarePort: 5005,
      deviceNumber: 1,
      active: true,
      webPassword: 'secret',
      lastSeenAt: null,
      lastPunchAt: null,
    });

    const moduleRef = await Test.createTestingModule({
      providers: [AttendanceDeskService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const service = moduleRef.get(AttendanceDeskService);
    const created = await service.createDevice('tenant-1', {
      code: 'GATE-01',
      serialNumber: 'AX1',
      host: '10.21.20.174',
      webPort: 80,
      softwarePort: 5005,
      password: 'secret',
    });

    expect(created).toEqual(expect.objectContaining({ passwordSet: true, code: 'GATE-01' }));
    expect(created).not.toHaveProperty('webPassword');
    expect(created).not.toHaveProperty('password');
    expect(prisma.attendanceDevice.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ webPassword: 'secret', active: true }),
      }),
    );
    expect(prisma.attendanceDevice.updateMany).not.toHaveBeenCalled();
  });

  it('menyimpan mesin kedua tanpa mematikan mesin yang sudah aktif', async () => {
    const prisma = createMockPrismaService() as any;
    prisma.attendanceDevice.findFirst.mockResolvedValue({ id: 'dev-2', webPassword: 'secret' });
    prisma.attendanceDevice.update.mockResolvedValue({
      id: 'dev-2',
      code: '02',
      serialNumber: 'AX2',
      firmware: null,
      host: '10.21.22.3',
      webPort: 80,
      softwarePort: 5005,
      deviceNumber: 2,
      active: true,
      webPassword: 'secret',
      lastSeenAt: null,
      lastPunchAt: null,
    });

    const moduleRef = await Test.createTestingModule({
      providers: [AttendanceDeskService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const service = moduleRef.get(AttendanceDeskService);
    await service.updateDevice('tenant-1', 'dev-2', {
      code: '02',
      serialNumber: 'AX2',
      host: '10.21.22.3',
      webPort: 80,
      softwarePort: 5005,
    });

    expect(prisma.attendanceDevice.updateMany).not.toHaveBeenCalled();
    expect(prisma.attendanceDevice.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: 'dev-2' },
        data: expect.objectContaining({ active: true }),
      }),
    );
  });

  it('menghapus mesin tanpa menghapus baris absen', async () => {
    const prisma = createMockPrismaService() as any;
    prisma.attendanceDevice.findFirst.mockResolvedValue({ id: 'dev-1' });
    prisma.attendanceDevice.update.mockResolvedValue({ id: 'dev-1' });

    const moduleRef = await Test.createTestingModule({
      providers: [AttendanceDeskService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    const service = moduleRef.get(AttendanceDeskService);
    await expect(service.deleteDevice('tenant-1', 'dev-1')).resolves.toEqual({ id: 'dev-1', deleted: true });

    expect(prisma.attendanceDevice.delete).not.toHaveBeenCalled();
    expect(prisma.attendancePunch.deleteMany).not.toHaveBeenCalled();
    expect(prisma.attendanceDevice.update).toHaveBeenCalledWith({
      where: { id: 'dev-1' },
      data: { active: false, deletedAt: expect.any(Date) },
    });
  });
});

describe('AttendanceDeskService punches page', () => {
  async function serviceWith(prisma: ReturnType<typeof createMockPrismaService>) {
    const moduleRef = await Test.createTestingModule({
      providers: [AttendanceDeskService, { provide: PrismaService, useValue: prisma }],
    }).compile();
    return moduleRef.get(AttendanceDeskService);
  }

  it('mengembalikan satu halaman tap dan mengabaikan page pada recent', async () => {
    const prisma = createMockPrismaService() as any;
    prisma.attendancePunch.findMany.mockResolvedValue([
      { id: 'p-2', nik: '1002', punchedAt: new Date('2026-10-16T02:00:00.000Z'), direction: 'IN', verifyMode: 'CARD', matchStatus: 'MATCHED', employee: { firstName: 'Siti', lastName: 'Aminah', department: null } },
      { id: 'p-1', nik: '1001', punchedAt: new Date('2026-10-16T01:00:00.000Z'), direction: 'IN', verifyMode: 'CARD', matchStatus: 'MATCHED', employee: { firstName: 'Budi', lastName: 'Santoso', department: null } },
    ]);
    const service = await serviceWith(prisma);

    const page = await service.punches('tenant-1', {
      date: '2026-10-16',
      search: 'Budi Santoso',
      page: '1',
      pageSize: '40',
    });

    expect(page).toEqual(expect.objectContaining({
      total: 1,
      page: 1,
      pageSize: 40,
      items: [expect.objectContaining({ id: 'p-1', nik: '1001', employeeName: 'Budi Santoso' })],
    }));

    prisma.attendancePunch.findMany.mockResolvedValue([
      { id: 'p-1', nik: '1001', punchedAt: new Date('2026-10-16T01:00:00.000Z'), direction: 'IN', verifyMode: 'CARD', matchStatus: 'MATCHED', employee: null },
    ]);
    const recent = await service.punches('tenant-1', { recent: '8', page: '2', search: 'tidak-dipakai' });
    expect(Array.isArray(recent)).toBe(true);
    expect(prisma.attendancePunch.findMany).toHaveBeenLastCalledWith(
      expect.objectContaining({ take: 8 }),
    );
  });
});
