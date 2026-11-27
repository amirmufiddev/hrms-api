import { CardPushStatus } from '@prisma/client';
import { DevicePaceError } from './device-directory.client';
import { DevicePace } from './device-pace';
import { DeviceDirectorySyncService } from './device-directory-sync.service';

function biometricStore() {
  return {
    findMany: jest.fn().mockResolvedValue([]),
    upsert: jest.fn().mockResolvedValue({}),
    deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
  };
}

function snapshotStore() {
  return {
    attendanceDeviceDirectory: {
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      createMany: jest.fn().mockResolvedValue({ count: 0 }),
      upsert: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({ count: 0 }),
      findMany: jest.fn().mockResolvedValue([]),
      findFirst: jest.fn().mockResolvedValue(null),
    },
    attendanceSyncRemoval: {
      findMany: jest.fn().mockResolvedValue([]),
      upsert: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
    },
  };
}

function prismaWithDevice() {
  return {
    attendanceDevice: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'dev-1', tenantId: 'tenant-1', code: '01', host: '10.21.20.24', webPort: 80, webPassword: 'secret' },
      ]),
    },
    attendanceBiometricTemplate: biometricStore(),
    ...snapshotStore(),
    employee: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn() },
  };
}

function prismaWithOneDeviceAndNoTemplates(users: { enrollId: string; name: string; card: string; face: number; fingerprint: number }[]) {
  return {
    attendanceDevice: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'dev-1', tenantId: 'tenant-1', code: '01', host: '10.21.20.24', webPort: 80, webPassword: 'secret' },
      ]),
    },
    attendanceBiometricTemplate: biometricStore(),
    ...snapshotStore(),
    employee: {
      findMany: jest.fn().mockResolvedValue(
        users.map((user, index) => ({
          id: `emp-${index}`,
          employeeCode: user.enrollId,
          firstName: user.name,
          lastName: '',
          cardNumber: null,
          cardPushStatus: null,
        })),
      ),
      updateMany: jest.fn(),
      update: jest.fn(),
    },
  };
}

describe('DeviceDirectorySyncService', () => {

  it('foto baru disalin ke mesin yang wajahnya kosong, bukan ke mesin asal', async () => {
    const setUser = jest.fn().mockResolvedValue(undefined);
    const setBackup = jest.fn().mockResolvedValue(true);
    const listUsers = jest.fn();
    const prisma = {
      attendanceDevice: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'dev-1', tenantId: 'tenant-1', code: '01', host: '10.21.22.17', webPort: 80, webPassword: 'secret' },
          { id: 'dev-2', tenantId: 'tenant-1', code: '02', host: '10.21.22.3', webPort: 80, webPassword: 'secret' },
        ]),
      },
      attendanceBiometricTemplate: {
        findMany: jest.fn().mockResolvedValue([{ slot: 50, record: '/9j/foto-wajah' }]),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      attendanceDeviceDirectory: {
        findMany: jest.fn().mockResolvedValue([{ deviceId: 'dev-1', name: 'Mukhlisan', card: '', face: 1 }]),
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn(),
      },
      employee: {
        findMany: jest.fn().mockResolvedValue([
          { employeeCode: '900084', firstName: 'Mukhlisan', lastName: '', cardNumber: '1001' },
        ]),
      },
    };
    const getUser = jest.fn().mockResolvedValue({ enrollId: '900084', name: 'Mukhlisan', card: '1001', face: 1 });
    const service = new DeviceDirectorySyncService(prisma as never, { setUser, setBackup, listUsers, getUser } as never, new DevicePace());
    const written = await service.shareNewFace('tenant-1', '900084', 'dev-1');
    expect(written).toEqual(['02']);
    expect(listUsers).not.toHaveBeenCalled();
    expect(setUser).toHaveBeenCalledTimes(1);
    expect(setUser).toHaveBeenCalledWith('dev-2', 'auto', expect.objectContaining({ host: '10.21.22.3' }), expect.objectContaining({ enrollid: '900084', card: 1001 }));
    expect(setBackup).toHaveBeenCalledTimes(1);
    expect(setBackup).toHaveBeenCalledWith(
      'dev-2',
      'auto',
      expect.objectContaining({ host: '10.21.22.3' }),
      expect.objectContaining({ enrollid: '900084', backupnum: 50, record: '/9j/foto-wajah' }),
    );
    expect(prisma.attendanceDeviceDirectory.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { deviceId_nik: { deviceId: 'dev-2', nik: '900084' } },
        create: expect.objectContaining({ face: 1, card: '1001' }),
      }),
    );
  });

  it('menulis kartu pending ke mesin yang menjawab dan menandai PUSHED', async () => {
    const setUser = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      attendanceDevice: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'dev-2',
            tenantId: 'tenant-1',
            code: '02',
            host: '10.21.20.80',
            webPort: 80,
            webPassword: 'secret',
          },
        ]),
      },
      attendanceBiometricTemplate: biometricStore(),
      ...snapshotStore(),
      employee: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'emp-1',
            employeeCode: '900094',
            firstName: 'Adelita',
            lastName: 'Safira',
            cardNumber: '3690193579',
            cardPushStatus: CardPushStatus.PENDING,
          },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const client = {
      listUsers: jest.fn().mockResolvedValue([]),
      setUser,
      getUser: jest.fn().mockResolvedValue({ enrollId: '900094', name: 'Adelita Safira', card: '3690193579' }),
      deleteUsers: jest.fn(),
      getBackup: jest.fn(),
      setBackup: jest.fn(),
    };
    const service = new DeviceDirectorySyncService(prisma as never, client as never);

    await service.syncOnce();

    expect(setUser).toHaveBeenCalledWith(
      'dev-2',
      'auto',
      { host: '10.21.20.80', webPort: 80, password: 'secret' },
      { enrollid: '900094', name: 'Adelita Safira', card: 3690193579 },
    );
    expect(prisma.employee.updateMany).toHaveBeenCalledWith({
      where: { id: 'emp-1', tenantId: 'tenant-1', cardPushStatus: CardPushStatus.PENDING },
      data: { cardPushStatus: CardPushStatus.PUSHED, deviceUid: 900094 },
    });
  });

  it('tidak menimpa kartu yang sudah terisi di mesin', async () => {
    const setUser = jest.fn().mockResolvedValue(undefined);
    const prisma = {
      attendanceDevice: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'dev-2', tenantId: 'tenant-1', code: '02', host: '10.21.20.80', webPort: 80, webPassword: 'secret' },
        ]),
      },
      attendanceBiometricTemplate: biometricStore(),
      ...snapshotStore(),
      employee: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'emp-1',
            employeeCode: '900094',
            firstName: 'Adelita',
            lastName: 'Safira',
            cardNumber: '3690193579',
            cardPushStatus: CardPushStatus.PENDING,
          },
        ]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const client = {
      listUsers: jest.fn().mockResolvedValue([
        { enrollId: '900094', name: 'Adelita', card: '0' },
        { enrollId: '8', name: 'Lama', card: '3690193579' },
      ]),
      setUser,
      getUser: jest.fn(async (_deviceId: unknown, _kind: unknown, _endpoint: unknown, enrollId: string) => ({
        enrollId,
        name: enrollId === '8' ? 'Lama' : 'Adelita Safira',
        card: enrollId === '8' ? '0' : '3690193579',
      })),
      deleteUsers: jest.fn().mockResolvedValue(true),
      getBackup: jest.fn(),
      setBackup: jest.fn(),
    };
    const service = new DeviceDirectorySyncService(prisma as never, client as never);
    await service.syncOnce();
    expect(setUser).not.toHaveBeenCalled();
    expect(client.deleteUsers).not.toHaveBeenCalled();
  });

  it('tidak menghapus user yang hanya ada di mesin', async () => {
    const deleteUsers = jest.fn().mockResolvedValue(true);
    const prisma = {
      attendanceDevice: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'dev-2', tenantId: 'tenant-1', code: '02', host: '10.21.20.80', webPort: 80, webPassword: 'secret' },
        ]),
      },
      attendanceBiometricTemplate: biometricStore(),
      ...snapshotStore(),
      employee: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn() },
    };
    const client = {
      listUsers: jest.fn().mockResolvedValue([{ enrollId: '1', name: 'Baru', card: '0' }]),
      setUser: jest.fn(),
      getUser: jest.fn(),
      deleteUsers,
      getBackup: jest.fn(),
      setBackup: jest.fn(),
    };
    const service = new DeviceDirectorySyncService(prisma as never, client as never);
    await service.syncOnce();
    expect(deleteUsers).not.toHaveBeenCalled();
  });

  it('menyimpan template yang terbaca dan mengisi slot kosong dari cadangan HRMS', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const setBackup = jest.fn().mockResolvedValue(true);
    const prisma = {
      attendanceDevice: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'dev-1', tenantId: 'tenant-1', code: '01', host: '10.21.20.24', webPort: 80, webPassword: 'secret' },
        ]),
      },
      attendanceBiometricTemplate: {
        findMany: jest.fn().mockResolvedValue([{ nik: '900094', slot: 51, record: 'wajah-lama' }]),
        upsert,
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      ...snapshotStore(),
      employee: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'emp-1',
            employeeCode: '900094',
            firstName: 'Adelita',
            lastName: 'Safira',
            cardNumber: '3690193579',
            cardPushStatus: CardPushStatus.PUSHED,
          },
        ]),
        updateMany: jest.fn(),
      },
    };
    const client = {
      listUsers: jest.fn().mockResolvedValue([
        { enrollId: '900094', name: 'Adelita Safira', card: '3690193579', face: 0, fingerprint: 1 },
      ]),
      setUser: jest.fn(),
      getUser: jest.fn(),
      deleteUsers: jest.fn(),
      getBackup: jest.fn(async (_deviceId: unknown, _kind: unknown, _endpoint: unknown, _enrollId: string, slot: number) => {
        if (slot === 0) return 'sidik-baru';
        if (slot === 51 && setBackup.mock.calls.length > 0) return 'wajah-lama';
        return null;
      }),
      setBackup,
    };
    const service = new DeviceDirectorySyncService(prisma as never, client as never);
    await service.syncOnce();
    expect(setBackup).not.toHaveBeenCalled();
    await service.syncOnce();

    expect(upsert).not.toHaveBeenCalled();
    expect(client.getBackup).not.toHaveBeenCalled();
  });

  it('salinan otomatis hanya menulis satu slot kosong dan tidak membaca ulang', async () => {
    const setBackup = jest.fn().mockResolvedValue(true);
    const getBackup = jest.fn();
    const prisma = {
      attendanceDevice: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'dev-1', tenantId: 'tenant-1', code: '01', host: '10.21.20.24', webPort: 80, webPassword: 'secret' },
          { id: 'dev-2', tenantId: 'tenant-1', code: '02', host: '10.21.20.80', webPort: 80, webPassword: 'secret' },
        ]),
      },
      attendanceBiometricTemplate: {
        findMany: jest.fn().mockResolvedValue([
          { nik: '900002', slot: 0, record: 'c51b71(1)abcd' },
          { nik: '900002', slot: 51, record: 'wajah' },
        ]),
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn(),
      },
      ...snapshotStore(),
      employee: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'emp-1',
            employeeCode: '900002',
            firstName: 'Aditia',
            lastName: '',
            cardNumber: '1',
            cardPushStatus: CardPushStatus.PUSHED,
          },
        ]),
        updateMany: jest.fn(),
      },
    };
    const snapshot = [
      { nik: '900002', name: 'Aditia', card: '1', face: 0, fingerprint: 0, deviceId: 'dev-1' },
      { nik: '900002', name: 'Aditia', card: '1', face: 1, fingerprint: 1, deviceId: 'dev-2' },
    ];
    prisma.attendanceDeviceDirectory.findFirst.mockResolvedValue({ seenAt: new Date() });
    prisma.attendanceDeviceDirectory.findMany.mockImplementation(async (args?: { where?: { deviceId?: string } }) =>
      snapshot.filter((row) => row.deviceId === args?.where?.deviceId),
    );
    const service = new DeviceDirectorySyncService(prisma as never, {
      listUsers: jest.fn(),
      setUser: jest.fn(),
      getUser: jest.fn(),
      deleteUsers: jest.fn(),
      getBackup,
      setBackup,
    } as never);
    await service.syncOnce();
    expect(getBackup).not.toHaveBeenCalled();
    expect(setBackup).toHaveBeenCalledTimes(1);
    expect(setBackup).toHaveBeenCalledWith(
      'dev-1',
      'auto',
      { host: '10.21.20.24', webPort: 80, password: 'secret' },
      expect.objectContaining({ enrollid: '900002', backupnum: 51, record: 'wajah' }),
    );
  });

  it('mengisi kartu kosong di HRMS tanpa menulis mesin yang sudah punya kartu', async () => {
    const update = jest.fn().mockResolvedValue({});
    const upsert = jest.fn().mockResolvedValue({});
    const setUser = jest.fn();
    const deleteUsers = jest.fn();
    const setBackup = jest.fn();
    const prisma = {
      attendanceDevice: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'dev-1', tenantId: 'tenant-1', code: '01', host: '10.21.22.17', webPort: 80, webPassword: 'secret' },
        ]),
      },
      attendanceBiometricTemplate: {
        findMany: jest.fn().mockResolvedValue([]),
        upsert,
        deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
      },
      ...snapshotStore(),
      employee: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'emp-1', employeeCode: '900094', cardNumber: null },
        ]),
        update,
        updateMany: jest.fn(),
      },
    };
    const client = {
      listUsers: jest.fn().mockResolvedValue([
        { enrollId: '900094', name: 'Adelita', card: '3690193579', face: 1, fingerprint: 0 },
      ]),
      setUser,
      getUser: jest.fn(),
      deleteUsers,
      getBackup: jest.fn(async (_deviceId: unknown, _kind: unknown, _endpoint: unknown, _enrollId: string, slot: number) => (slot === 51 ? 'wajah' : null)),
      setBackup,
    };
    const service = new DeviceDirectorySyncService(prisma as never, client as never);
    await service.syncOnce();
    expect(update).toHaveBeenCalledWith({
      where: { id: 'emp-1' },
      data: expect.objectContaining({
        cardNumber: '3690193579',
        cardPushStatus: CardPushStatus.PUSHED,
        deviceUid: 900094,
      }),
    });
    expect(upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ nik: '900094', slot: 51, record: 'wajah' }),
      }),
    );
    expect(setUser).not.toHaveBeenCalled();
    expect(deleteUsers).not.toHaveBeenCalled();
    expect(setBackup).not.toHaveBeenCalled();
  });

  it('tidak menimpa template yang sudah tersimpan di HRMS', async () => {
    const upsert = jest.fn().mockResolvedValue({});
    const prisma = {
      attendanceDevice: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'dev-1', tenantId: 'tenant-1', code: '01', host: '10.21.22.17', webPort: 80, webPassword: 'secret' },
        ]),
      },
      attendanceBiometricTemplate: {
        findMany: jest.fn().mockResolvedValue([{ nik: '900094', slot: 51, record: 'wajah-lama' }]),
        upsert,
        deleteMany: jest.fn(),
      },
      ...snapshotStore(),
      employee: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'emp-1',
            employeeCode: '900094',
            firstName: 'Adelita',
            lastName: 'Safira',
            cardNumber: '3690193579',
            cardPushStatus: CardPushStatus.PUSHED,
          },
        ]),
        updateMany: jest.fn(),
      },
    };
    const client = {
      listUsers: jest.fn().mockResolvedValue([
        { enrollId: '900094', name: 'Adelita', card: '3690193579', face: 1, fingerprint: 0 },
      ]),
      setUser: jest.fn(),
      getUser: jest.fn(),
      deleteUsers: jest.fn(),
      getBackup: jest.fn(async (_deviceId: unknown, _kind: unknown, _endpoint: unknown, _enrollId: string, slot: number) => (slot === 51 ? 'wajah-baru' : null)),
      setBackup: jest.fn(),
    };
    const service = new DeviceDirectorySyncService(prisma as never, client as never);
    await service.syncOnce();
    expect(upsert).not.toHaveBeenCalled();
    expect(client.setBackup).not.toHaveBeenCalled();
  });

  it('hapus manual hanya mengirim satu NIK', async () => {
    const deleteUsers = jest.fn().mockResolvedValue(true);
    const prisma = {
      attendanceDevice: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'dev-1', tenantId: 'tenant-1', code: '01', host: '10.21.22.17', webPort: 80, webPassword: 'secret' },
        ]),
      },
      attendanceBiometricTemplate: biometricStore(),
      ...snapshotStore(),
      employee: {
        findMany: jest.fn().mockResolvedValue([{ id: 'emp-1', employeeCode: '900094' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const client = {
      listUsers: jest.fn(),
      setUser: jest.fn(),
      getUser: jest.fn(),
      deleteUsers,
      getBackup: jest.fn(),
      setBackup: jest.fn(),
    };
    const service = new DeviceDirectorySyncService(prisma as never, client as never);
    const result = await service.removeOne('tenant-1', '900094');
    expect(result).toEqual({ nik: '900094', pending: false });
    expect(deleteUsers).toHaveBeenCalledTimes(1);
    expect(deleteUsers).toHaveBeenCalledWith(
      'dev-1',
      'auto',
      { host: '10.21.22.17', webPort: 80, password: 'secret' },
      ['900094'],
    );
    expect(prisma.employee.updateMany).toHaveBeenCalledWith({
      where: { id: { in: ['emp-1'] }, tenantId: 'tenant-1' },
      data: { cardNumber: null, cardAssignedAt: null, cardPushStatus: null, deviceUid: null },
    });
    expect(prisma.attendanceDeviceDirectory.deleteMany).toHaveBeenCalledWith({
      where: { deviceId: 'dev-1', nik: '900094' },
    });
  });

  it('hapus yang sudah selesai di mesin tidak menghubungi mesin lagi', async () => {
    const deleteUsers = jest.fn();
    const prisma = {
      attendanceDevice: { findMany: jest.fn() },
      attendanceBiometricTemplate: biometricStore(),
      ...snapshotStore(),
      employee: {
        findMany: jest.fn().mockResolvedValue([{ id: 'emp-1', employeeCode: '900094' }]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    };
    const service = new DeviceDirectorySyncService(prisma as never, { deleteUsers } as never);
    const result = await service.removeOne('tenant-1', '900094', true);
    expect(result).toEqual({ nik: '900094', pending: false });
    expect(deleteUsers).not.toHaveBeenCalled();
    expect(prisma.attendanceDevice.findMany).not.toHaveBeenCalled();
    expect(prisma.attendanceDeviceDirectory.deleteMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', nik: '900094' },
    });
    expect(prisma.attendanceSyncRemoval.deleteMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', nik: '900094' },
    });
  });

  it('sync satu baris hanya menulis slot kosong, tanpa membaca sebelas slot', async () => {
    const setBackup = jest.fn().mockResolvedValue(true);
    const getBackup = jest.fn();
    const prisma = {
      attendanceDevice: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'dev-1', tenantId: 'tenant-1', code: '01', host: '10.21.20.24', webPort: 80, webPassword: 'secret' },
          { id: 'dev-2', tenantId: 'tenant-1', code: '02', host: '10.21.20.80', webPort: 80, webPassword: 'secret' },
        ]),
      },
      attendanceBiometricTemplate: {
        findMany: jest.fn().mockResolvedValue([
          { nik: '900235', slot: 0, record: 'c51b71(1)abcd' },
          { nik: '900235', slot: 50, record: '/9j/wajah' },
        ]),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      ...snapshotStore(),
      employee: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'emp-1',
            employeeCode: '900235',
            firstName: 'Abilla',
            lastName: 'Chuzinah',
            cardNumber: '3676597083',
            cardPushStatus: CardPushStatus.PUSHED,
          },
        ]),
        updateMany: jest.fn(),
      },
    };
    const client = {
      listUsers: jest.fn(),
      setUser: jest.fn(),
      getUser: jest.fn(async (_deviceId: unknown, _kind: unknown, endpoint: { host: string }) =>
        endpoint.host.endsWith('.24')
          ? { enrollId: '900235', name: 'Abilla Chuzinah', card: '3676597083', face: 0, fingerprint: 0 }
          : { enrollId: '900235', name: 'Abilla Chuzinah', card: '3676597083', face: 1, fingerprint: 1 },
      ),
      deleteUsers: jest.fn(),
      getBackup,
      setBackup,
    };
    prisma.attendanceDeviceDirectory.findMany.mockResolvedValue([
      { deviceId: 'dev-1', name: 'Abilla Chuzinah', card: '3676597083', face: 0, fingerprint: 0 },
      { deviceId: 'dev-2', name: 'Abilla Chuzinah', card: '3676597083', face: 1, fingerprint: 1 },
    ]);
    const service = new DeviceDirectorySyncService(prisma as never, client as never);
    const result = await service.syncRow('tenant-1', '900235');

    expect(client.listUsers).not.toHaveBeenCalled();
    expect(getBackup).not.toHaveBeenCalled();
    expect(client.setUser).not.toHaveBeenCalled();
    expect(setBackup).toHaveBeenCalledTimes(1);
    expect(setBackup).toHaveBeenCalledWith(
      'dev-1',
      'manual',
      { host: '10.21.20.24', webPort: 80, password: 'secret' },
      expect.objectContaining({ enrollid: '900235', backupnum: 50, record: '/9j/wajah' }),
    );
    expect(result.reason).toBeNull();
  });

  it('klik sync saat pembacaan massal dikerjakan sebelum slot berikutnya', async () => {
    const order: string[] = [];
    let row: Promise<unknown> | null = null;
    const prisma = {
      attendanceDevice: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'dev-1', tenantId: 'tenant-1', code: '01', host: '10.21.20.24', webPort: 80, webPassword: 'secret' },
        ]),
      },
      attendanceBiometricTemplate: {
        findMany: jest.fn(async (args?: { where?: { nik?: string } }) =>
          args?.where?.nik ? [{ nik: '900235', slot: 50, record: '/9j/wajah' }] : [],
        ),
        upsert: jest.fn().mockResolvedValue({}),
        deleteMany: jest.fn(),
      },
      ...snapshotStore(),
      employee: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 'emp-1',
            employeeCode: '900235',
            firstName: 'Abilla',
            lastName: 'Chuzinah',
            cardNumber: '3676597083',
            cardPushStatus: CardPushStatus.PUSHED,
          },
        ]),
        updateMany: jest.fn(),
      },
    };
    const service = new DeviceDirectorySyncService(prisma as never, {
      listUsers: jest.fn(async () => {
        return [{ enrollId: '900235', name: 'Abilla Chuzinah', card: '3676597083', face: 1, fingerprint: 0 }];
      }),
      setUser: jest.fn(),
      getUser: jest.fn(async () => ({ enrollId: '900235', name: 'Abilla Chuzinah', card: '3676597083', face: 0, fingerprint: 0 })),
      deleteUsers: jest.fn(),
      getBackup: jest.fn(async (_deviceId: unknown, _kind: unknown, _endpoint: unknown, _enrollId: string, slot: number) => {
        order.push(`read-${slot}`);
        if (slot === 51 && !row) row = service.syncRow('tenant-1', '900235');
        return null;
      }),
      setBackup: jest.fn(async (_deviceId: unknown, _kind: unknown, _endpoint: unknown, body: { backupnum: number }) => {
        order.push(`write-${body.backupnum}`);
        return true;
      }),
    } as never);

    const done = service.syncOnce();
    await done;
    await row;

    expect(order.indexOf('write-50')).toBeGreaterThan(order.indexOf('read-51'));
    expect(order.filter((item) => item.startsWith('read-'))).toEqual(['read-51']);
  });

  it('siklus berikutnya melanjutkan NIK sesudah anggaran habis', async () => {
    let now = 0;
    const pace = new DevicePace({
      now: () => now,
      wait: async (ms: number) => {
        now += ms;
      },
    });
    const listed: string[][] = [];
    const users = Array.from({ length: 12 }, (_item, index) => {
      const enrollId = String(900001 + index);
      return { enrollId, name: enrollId, card: '1', face: 1, fingerprint: 0 };
    });
    const client = {
      listUsers: jest.fn(async (deviceId: string, kind: 'auto' | 'manual') => {
        const decision = await pace.allow(deviceId, kind);
        if (!decision.ok) throw new DevicePaceError(decision.reason, decision.quietUntil);
        listed.push(['list']);
        return users;
      }),
      getUser: jest.fn(),
      setUser: jest.fn(),
      deleteUsers: jest.fn(),
      getBackup: jest.fn(async (deviceId: string, kind: 'auto' | 'manual', _endpoint: unknown, enrollId: string, slot: number) => {
        if (slot !== 51) return null;
        const decision = await pace.allow(deviceId, kind);
        if (!decision.ok) throw new DevicePaceError(decision.reason, decision.quietUntil);
        listed.push([enrollId]);
        return 'sidik';
      }),
      setBackup: jest.fn(),
    };
    const prisma = prismaWithOneDeviceAndNoTemplates(users);
    const service = new DeviceDirectorySyncService(prisma as never, client as never, pace);
    await service.syncOnce();
    const firstReads = listed.filter((row) => row[0] !== 'list').map((row) => row[0]);
    listed.length = 0;
    now += 120_000;
    await service.syncOnce();
    expect(listed.some((row) => row[0] === 'list')).toBe(false);
    const secondReads = listed.filter((row) => row[0] !== 'list').map((row) => row[0]);
    const lastFirst = firstReads[firstReads.length - 1];
    expect(secondReads[0]).toBe(String(Number(lastFirst) + 1));
    expect(secondReads[0]).not.toBe('900001');
  });

  it('daftar user yang lambat tidak dilanjutkan dengan baca template', async () => {
    let now = 1_000;
    const pace = new DevicePace({
      now: () => now,
      wait: async () => undefined,
    });
    const client = {
      listUsers: jest.fn(async () => {
        now += 8_000;
        return [{ enrollId: '900001', name: '900001', card: '1', face: 0, fingerprint: 1 }];
      }),
      getUser: jest.fn(),
      setUser: jest.fn(),
      deleteUsers: jest.fn(),
      getBackup: jest.fn(),
      setBackup: jest.fn(),
    };
    const service = new DeviceDirectorySyncService(prismaWithOneDeviceAndNoTemplates([]) as never, client as never, pace);
    await service.syncOnce();
    expect(client.getBackup).not.toHaveBeenCalled();
    expect(pace.preview('dev-1', 'auto')).toMatchObject({ ok: false, reason: 'QUIET' });
  });

  it('sync satu baris tetap menulis template sesudah daftar user yang lambat', async () => {
    let now = 1_000;
    const pace = new DevicePace({ now: () => now, wait: async () => undefined });
    const written: number[] = [];
    const prisma = prismaWithDevice();
    prisma.attendanceBiometricTemplate.findMany.mockResolvedValue([
      { slot: 0, record: 'c51b71(1)abcd' },
      { slot: 50, record: '/9j/wajah' },
    ]);
    prisma.employee.findMany.mockResolvedValue([
      { id: 'emp-1', employeeCode: '900037', firstName: 'A', lastName: '', cardNumber: '1', cardPushStatus: null },
    ]);
    prisma.attendanceDeviceDirectory.findMany.mockResolvedValue([
      { deviceId: 'dev-1', name: 'A', card: '1', face: 0, fingerprint: 0 },
    ]);
    const client = {
      listUsers: jest.fn(),
      getUser: jest.fn(),
      setUser: jest.fn(),
      deleteUsers: jest.fn(),
      getBackup: jest.fn(),
      setBackup: jest.fn(async (deviceId: string, kind: 'auto' | 'manual', _endpoint: unknown, body: { backupnum: number }) => {
        const decision = await pace.allow(deviceId, kind);
        if (!decision.ok) throw new DevicePaceError(decision.reason, decision.quietUntil);
        written.push(body.backupnum);
        return true;
      }),
    };
    const service = new DeviceDirectorySyncService(prisma as never, client as never, pace);
    const result = await service.syncRow('tenant-1', '900037');
    expect(client.listUsers).not.toHaveBeenCalled();
    expect(client.getUser).toHaveBeenCalled();
    expect(written).toEqual([50]);
    expect(result.reason).toBeNull();
    expect(pace.preview('dev-1', 'auto')).toMatchObject({ ok: true });
  });

  it('jumlah sidik yang tidak dikirim mesin tidak dianggap kosong', async () => {
    const setBackup = jest.fn().mockResolvedValue(true);
    const getBackup = jest.fn().mockResolvedValue('sidik-yang-sudah-ada');
    const prisma = {
      attendanceDevice: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'dev-2', tenantId: 'tenant-1', code: '02', host: '10.21.22.3', webPort: 80, webPassword: 'secret' },
        ]),
      },
      attendanceBiometricTemplate: {
        findMany: jest.fn().mockResolvedValue([{ nik: '900172', slot: 0, record: 'c51b71(1)abcd' }]),
        upsert: jest.fn(),
        deleteMany: jest.fn(),
      },
      ...snapshotStore(),
      employee: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn() },
    };
    prisma.attendanceDeviceDirectory.findMany.mockResolvedValue([
      { deviceId: 'dev-2', name: 'Pirman', card: '1', face: 1, fingerprint: 1 },
    ]);
    const service = new DeviceDirectorySyncService(prisma as never, {
      listUsers: jest.fn(),
      getUser: jest.fn(),
      setUser: jest.fn(),
      deleteUsers: jest.fn(),
      getBackup,
      setBackup,
    } as never);
    const result = await service.syncRow('tenant-1', '900172');
    expect(getBackup).not.toHaveBeenCalled();
    expect(setBackup).not.toHaveBeenCalled();
    expect(result.reason).toBeNull();
  });

  it('sync satu baris tetap memanggil mesin yang sedang didiamkan', async () => {
    const pace = new DevicePace({ now: () => 1_000, wait: async () => undefined });
    pace.markOffline('dev-1');
    const setBackup = jest.fn().mockResolvedValue(true);
    const prisma = prismaWithDevice();
    prisma.attendanceBiometricTemplate.findMany.mockResolvedValue([{ nik: '900021', slot: 50, record: '/9j/wajah' }]);
    const client = {
      listUsers: jest.fn(),
      getUser: jest.fn(),
      setUser: jest.fn(),
      deleteUsers: jest.fn(),
      getBackup: jest.fn(),
      setBackup,
    };
    const service = new DeviceDirectorySyncService(prisma as never, client as never, pace);
    const result = await service.syncRow('tenant-1', '900021');
    expect(client.getUser).toHaveBeenCalled();
    expect(setBackup).toHaveBeenCalledWith(
      'dev-1',
      'manual',
      expect.any(Object),
      expect.objectContaining({ enrollid: '900021', backupnum: 50, record: '/9j/wajah' }),
    );
    expect(result.reason).toBeNull();
    expect(pace.preview('dev-1', 'auto')).toMatchObject({ ok: false, reason: 'QUIET' });
  });

  it('sync satu baris tetap ke mesin yang didiamkan dan mesin yang sehat', async () => {
    const pace = new DevicePace({ now: () => 1_000, wait: async () => undefined });
    pace.markOffline('dev-1');
    const prisma = {
      attendanceDevice: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'dev-1', tenantId: 'tenant-1', code: '01', host: '10.0.0.1', webPort: 80, webPassword: 'secret' },
          { id: 'dev-2', tenantId: 'tenant-1', code: '02', host: '10.0.0.2', webPort: 80, webPassword: 'secret' },
        ]),
      },
      attendanceBiometricTemplate: biometricStore(),
      ...snapshotStore(),
      employee: { findMany: jest.fn().mockResolvedValue([]), updateMany: jest.fn() },
    };
    prisma.attendanceBiometricTemplate.findMany.mockResolvedValue([{ nik: '900021', slot: 0, record: 'c51b71(1)abcd' }]);
    prisma.attendanceDeviceDirectory.findMany.mockResolvedValue([
      { deviceId: 'dev-1', name: '', card: '', face: 0, fingerprint: 0 },
      { deviceId: 'dev-2', name: '', card: '', face: 1, fingerprint: 1 },
    ]);
    const setBackup = jest.fn().mockResolvedValue(true);
    const client = {
      listUsers: jest.fn(),
      getUser: jest.fn(),
      setUser: jest.fn(),
      deleteUsers: jest.fn(),
      getBackup: jest.fn(),
      setBackup,
    };
    const service = new DeviceDirectorySyncService(prisma as never, client as never, pace);
    await service.syncRow('tenant-1', '900021');
    expect(client.getUser).not.toHaveBeenCalled();
    expect(setBackup).not.toHaveBeenCalled();
  });

  it('tidak mengirim sidik yang bentuknya membuat mesin restart', async () => {
    const setBackup = jest.fn().mockResolvedValue(true);
    const prisma = prismaWithDevice();
    prisma.attendanceBiometricTemplate.findMany.mockResolvedValue([
      { nik: '900030', slot: 0, record: 'c51d6babcd(1)aa' },
    ]);
    prisma.attendanceDeviceDirectory.findMany.mockResolvedValue([
      { deviceId: 'dev-1', name: 'Muhamad Said Kosim Soleh', card: '1', face: 0, fingerprint: 0 },
    ]);
    const service = new DeviceDirectorySyncService(prisma as never, {
      listUsers: jest.fn(),
      getUser: jest.fn(),
      setUser: jest.fn(),
      deleteUsers: jest.fn(),
      getBackup: jest.fn(),
      setBackup,
    } as never);
    const result = await service.syncRow('tenant-1', '900030');
    expect(setBackup).not.toHaveBeenCalled();
    expect(result.reason).toBeNull();
  });

  it('tidak mengirim sidik utuh bila nol pertama tidak di byte keempat', async () => {
    const setBackup = jest.fn().mockResolvedValue(true);
    const prisma = prismaWithDevice();
    const record = `c51d6b${'ab'.repeat(37)}(770)`;
    prisma.attendanceBiometricTemplate.findMany.mockResolvedValue([{ nik: '900030', slot: 0, record }]);
    prisma.attendanceDeviceDirectory.findMany.mockResolvedValue([
      { deviceId: 'dev-1', name: 'Muhamad Said Kosim Soleh', card: '1', face: 1, fingerprint: 0 },
    ]);
    const service = new DeviceDirectorySyncService(prisma as never, {
      listUsers: jest.fn(),
      getUser: jest.fn(),
      setUser: jest.fn(),
      deleteUsers: jest.fn(),
      getBackup: jest.fn(),
      setBackup,
    } as never);
    await service.syncRow('tenant-1', '900030');
    expect(record.indexOf('(')).toBe(80);
    expect(setBackup).not.toHaveBeenCalled();
  });

  it('wajah diisi lebih dulu bila sidik belum aman untuk mesin', async () => {
    const setBackup = jest.fn().mockResolvedValue(true);
    const prisma = prismaWithDevice();
    const face = 'A'.repeat(120);
    prisma.attendanceBiometricTemplate.findMany.mockResolvedValue([
      { nik: '900030', slot: 0, record: 'c51d6babcd(1)aa' },
      { nik: '900030', slot: 50, record: `/9j/${face}` },
    ]);
    prisma.attendanceDeviceDirectory.findMany.mockResolvedValue([
      { deviceId: 'dev-1', name: 'Muhamad Said Kosim Soleh', card: '1', face: 0, fingerprint: 0 },
    ]);
    const service = new DeviceDirectorySyncService(prisma as never, {
      listUsers: jest.fn(),
      getUser: jest.fn(),
      setUser: jest.fn(),
      deleteUsers: jest.fn(),
      getBackup: jest.fn(),
      setBackup,
    } as never);
    await service.syncRow('tenant-1', '900030');
    expect(setBackup).toHaveBeenCalledTimes(1);
    expect(setBackup).toHaveBeenCalledWith(
      'dev-1',
      'manual',
      expect.any(Object),
      expect.objectContaining({ enrollid: '900030', backupnum: 50, record: `/9j/${face}` }),
    );
  });

  it('sync user berikutnya tetap memanggil mesin', async () => {
    const pace = new DevicePace({ now: () => 0, wait: async () => undefined });
    const client = {
      listUsers: jest.fn(),
      getUser: jest.fn(),
      setUser: jest.fn(),
      deleteUsers: jest.fn(),
      getBackup: jest.fn(),
      setBackup: jest.fn(),
    };
    const service = new DeviceDirectorySyncService(prismaWithDevice() as never, client as never, pace);
    await service.syncRow('tenant-1', '900021');
    const second = await service.syncRow('tenant-1', '900003');
    expect(second.reason).toBeNull();
    expect(client.getUser).not.toHaveBeenCalled();
    expect(client.setBackup).not.toHaveBeenCalled();
  });

  it('mengiris direktori sesudah cari nama mesin dan departemen', async () => {
    const prisma = {
      department: { findFirst: jest.fn().mockResolvedValue({ id: 'dept-1' }) },
      attendanceDevice: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'dev-1', code: '01', host: '10.0.0.2', active: true },
        ]),
      },
      attendanceDeviceDirectory: {
        findMany: jest.fn().mockResolvedValue([
          { deviceId: 'dev-1', nik: '2002', name: 'Mesin Saja', card: '', face: 0, fingerprint: 0, slots: '', slotsRead: false, seenAt: new Date('2026-11-06T00:00:00.000Z') },
        ]),
      },
      attendanceBiometricTemplate: { findMany: jest.fn().mockResolvedValue([]) },
      attendanceSyncRemoval: { findMany: jest.fn().mockResolvedValue([]) },
      employee: {
        findMany: jest.fn().mockResolvedValue([
          { id: 'emp-1', employeeCode: '1001', firstName: 'Budi', lastName: 'Santoso', cardNumber: '55', department: { id: 'dept-1', name: 'Ops' } },
          { id: 'emp-2', employeeCode: '1003', firstName: 'Tanpa', lastName: 'Dept', cardNumber: '66', department: null },
        ]),
      },
    };
    const service = new DeviceDirectorySyncService(prisma as never, {} as never);

    const named = await service.directory('tenant-1', { search: 'mesin saja', page: '1', pageSize: '40' });
    expect(named.total).toBe(1);
    expect(named.items.map((row) => row.nik)).toEqual(['2002']);
    expect(named.devices).toHaveLength(1);

    const dept = await service.directory('tenant-1', { departmentId: 'dept-1', page: '1', pageSize: '1' });
    expect(dept.total).toBe(1);
    expect(dept.items).toHaveLength(1);
    expect(dept.items[0].nik).toBe('1001');

    const past = await service.directory('tenant-1', { page: '9', pageSize: '40' });
    expect(past.items).toEqual([]);
    expect(past.total).toBe(3);

    prisma.department.findFirst.mockResolvedValue(null);
    await expect(service.directory('tenant-1', { departmentId: 'missing' })).rejects.toThrow('DEPARTMENT_NOT_IN_COMPANY');
  });

  it('pendaftaran kartu menulis satu user ke tiap mesin tanpa membaca daftar', async () => {
    const setUser = jest.fn().mockResolvedValue(undefined);
    const prisma = prismaWithDevice();
    prisma.attendanceDevice.findMany.mockResolvedValue([
      { id: 'dev-1', tenantId: 'tenant-1', code: '01', host: '10.21.22.17', webPort: 80, webPassword: 'secret' },
      { id: 'dev-2', tenantId: 'tenant-1', code: '02', host: '10.21.22.3', webPort: 80, webPassword: 'secret' },
    ]);
    prisma.employee.updateMany.mockResolvedValue({ count: 1 });
    const service = new DeviceDirectorySyncService(prisma as never, { setUser, listUsers: jest.fn(), getUser: jest.fn() } as never);
    const status = await service.pushAssignedCard('tenant-1', {
      id: 'emp-1',
      employeeCode: '900074',
      firstName: 'Fajar',
      lastName: 'Aulia Rahman',
      cardNumber: '3007517485',
    });
    expect(status).toBe('PUSHED');
    expect(setUser).toHaveBeenCalledTimes(2);
    expect(setUser).toHaveBeenCalledWith('dev-1', 'manual', expect.any(Object), expect.objectContaining({ enrollid: '900074', card: 3007517485 }));
    expect(prisma.attendanceDeviceDirectory.upsert).toHaveBeenCalledTimes(2);
  });
});