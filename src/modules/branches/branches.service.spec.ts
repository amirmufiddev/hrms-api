import { Test, TestingModule } from '@nestjs/testing';
import { NotFoundException, ConflictException } from '@nestjs/common';
import { BranchesService } from './branches.service';
import { PrismaService } from '../../prisma/prisma.service';
import { createMockPrismaService } from '../../test/helpers';

describe('BranchesService', () => {
  let service: BranchesService;
  let prisma: ReturnType<typeof createMockPrismaService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        BranchesService,
        { provide: PrismaService, useValue: createMockPrismaService() },
      ],
    }).compile();

    service = module.get<BranchesService>(BranchesService);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('create', () => {
    it('creates a branch with geofencing coordinates', async () => {
      (prisma.branch.findUnique as jest.Mock).mockResolvedValue(null);
      const created = {
        id: 'branch-1',
        tenantId: 'tenant-1',
        name: 'Bandung Store',
        type: 'STORE',
        latitude: -6.9175,
        longitude: 107.6191,
        radiusMeters: 150,
      };
      (prisma.branch.create as jest.Mock).mockResolvedValue(created);

      const result = await service.create('tenant-1', {
        name: 'Bandung Store',
        type: 'STORE',
        latitude: -6.9175,
        longitude: 107.6191,
        radiusMeters: 150,
      });

      expect(prisma.branch.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          name: 'Bandung Store',
          type: 'STORE',
          latitude: -6.9175,
          longitude: 107.6191,
          radiusMeters: 150,
        }),
        include: { _count: { select: { employees: true } } },
      });
      expect(result).toEqual(created);
    });

    it('throws ConflictException if name already exists', async () => {
      (prisma.branch.findUnique as jest.Mock).mockResolvedValue({ id: 'existing' });

      await expect(
        service.create('tenant-1', { name: 'Bandung Store' }),
      ).rejects.toThrow(ConflictException);
    });
  });

  describe('update', () => {
    it('updates branch geofencing coordinates', async () => {
      (prisma.branch.findFirst as jest.Mock)
        .mockResolvedValueOnce({ id: 'branch-1', tenantId: 'tenant-1', name: 'Store' })
        .mockResolvedValueOnce(null);

      const updated = {
        id: 'branch-1',
        latitude: -6.9,
        longitude: 107.6,
        radiusMeters: 200,
      };
      (prisma.branch.update as jest.Mock).mockResolvedValue(updated);

      const result = await service.update('tenant-1', 'branch-1', {
        latitude: -6.9,
        longitude: 107.6,
        radiusMeters: 200,
      });

      expect(prisma.branch.update).toHaveBeenCalledWith({
        where: { id: 'branch-1' },
        data: expect.objectContaining({
          latitude: -6.9,
          longitude: 107.6,
          radiusMeters: 200,
        }),
        include: { _count: { select: { employees: true } } },
      });
      expect(result).toEqual(updated);
    });
  });

  describe('remove', () => {
    it('throws ConflictException if branch has assigned employees', async () => {
      (prisma.branch.findFirst as jest.Mock).mockResolvedValue({
        id: 'branch-1',
        tenantId: 'tenant-1',
        _count: { employees: 5 },
      });

      await expect(service.remove('tenant-1', 'branch-1')).rejects.toThrow(
        ConflictException,
      );
    });

    it('deletes branch when no employees assigned', async () => {
      (prisma.branch.findFirst as jest.Mock).mockResolvedValue({
        id: 'branch-1',
        tenantId: 'tenant-1',
        _count: { employees: 0 },
      });
      (prisma.branch.delete as jest.Mock).mockResolvedValue({ id: 'branch-1' });

      const result = await service.remove('tenant-1', 'branch-1');
      expect(prisma.branch.delete).toHaveBeenCalledWith({ where: { id: 'branch-1' } });
      expect(result).toEqual({ id: 'branch-1' });
    });
  });
});
