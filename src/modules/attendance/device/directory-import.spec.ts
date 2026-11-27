import { DeviceDirectorySyncService } from './device-directory-sync.service';

describe('importDeviceUsers', () => {
  it('menyimpan kartu dan wajah dari daftar mesin tanpa menulis sidik', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const deleteMany = jest.fn().mockResolvedValue({ count: 0 });
    const prisma = {
      attendanceDevice: { findMany: jest.fn().mockResolvedValue([{ id: 'dev-1', code: '01' }]) },
      attendanceDeviceDirectory: { upsert, deleteMany },
    };
    const service = new DeviceDirectorySyncService(prisma as never, {} as never);
    const result = await service.importDeviceUsers('tenant-1', [
      { deviceCode: '01', users: [{ nik: '900150', name: 'A', card: '123', face: 1 }] },
      { deviceCode: '99', users: [{ nik: '1' }] },
    ]);

    expect(result.devices).toEqual([
      { deviceCode: '01', stored: 1, error: null },
      { deviceCode: '99', stored: 0, error: 'DEVICE_UNKNOWN' },
    ]);
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ nik: '900150', card: '123', face: 1, fingerprint: 0 }),
        update: expect.objectContaining({ face: 1, fingerprint: 0 }),
      }),
    );
    expect(deleteMany).toHaveBeenCalledWith({ where: { deviceId: 'dev-1', nik: { notIn: ['900150'] } } });
  });
});
