import { DeviceDirectorySyncService } from './device-directory-sync.service';
import { matchesBioStatus } from './directory-bio-status';

const row = {
  serverCard: '55',
  serverSlots: [51],
  devices: {
    'dev-1': { present: true, card: '55', face: 1, fingerprint: 0 },
  },
};

describe('matchesBioStatus', () => {
  it('meloloskan semua baris bila tidak ada parameter 1', () => {
    expect(matchesBioStatus(row, { missingFace: '0', missingFinger: 'true' })).toBe(true);
    expect(matchesBioStatus(row, { missingFinger: '1' })).toBe(true);
    expect(matchesBioStatus(row)).toBe(true);
  });

  it('mengenali wajah yang belum ada di server', () => {
    expect(matchesBioStatus(row, { missingFace: '1' })).toBe(false);
    expect(matchesBioStatus({ ...row, serverSlots: [0, 20] }, { missingFace: '1' })).toBe(false);
    expect(matchesBioStatus({ ...row, serverSlots: [] }, { missingFace: '1' })).toBe(true);
    expect(matchesBioStatus({ ...row, serverSlots: [50] }, { missingFace: '1' })).toBe(false);
  });

  it('menganggap berbeda hanya pada kartu atau wajah', () => {
    const absent = {
      serverCard: '55',
      serverSlots: [51, 0],
      devices: { 'dev-1': { present: false, card: '', face: 0, fingerprint: 0 } },
    };
    const cardDiffers = {
      ...row,
      devices: { 'dev-1': { present: true, card: '0', face: 1, fingerprint: 0 } },
    };
    const fingerOnly = {
      serverCard: '55',
      serverSlots: [51, 0],
      devices: { 'dev-1': { present: true, card: '55', face: 1, fingerprint: 0 } },
    };
    const faceOnlyOnDevice = {
      serverCard: '55',
      serverSlots: [],
      devices: { 'dev-1': { present: true, card: '55', face: 2, fingerprint: 0 } },
    };
    const faceMissingOnDevice = {
      serverCard: '55',
      serverSlots: [51],
      devices: { 'dev-1': { present: true, card: '55', face: 0, fingerprint: 0 } },
    };
    expect(matchesBioStatus(absent, { differs: '1' })).toBe(false);
    expect(matchesBioStatus(cardDiffers, { differs: '1' })).toBe(true);
    expect(matchesBioStatus(fingerOnly, { differs: '1' })).toBe(false);
    expect(matchesBioStatus(faceOnlyOnDevice, { differs: '1' })).toBe(false);
    expect(matchesBioStatus(faceMissingOnDevice, { differs: '1' })).toBe(true);
  });

  it('menggabungkan centang dengan atau', () => {
    expect(matchesBioStatus(row, { missingFace: '1', differs: '1' })).toBe(false);
    expect(matchesBioStatus({ ...row, serverSlots: [] }, { missingFace: '1', differs: '1' })).toBe(true);
  });
});

function directoryPrisma() {
  return {
    department: { findFirst: jest.fn().mockResolvedValue({ id: 'dept-1' }) },
    attendanceDevice: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'dev-1', code: '01', host: '10.0.0.2', active: true },
      ]),
    },
    attendanceDeviceDirectory: {
      findMany: jest.fn().mockResolvedValue([
        { deviceId: 'dev-1', nik: '1002', name: 'Sari', card: '55', face: 0, fingerprint: 1, slots: '0', slotsRead: true, seenAt: new Date('2026-11-06T00:00:00.000Z') },
        { deviceId: 'dev-1', nik: '1003', name: 'Beda', card: '99', face: 1, fingerprint: 1, slots: '0,51', slotsRead: true, seenAt: new Date('2026-11-06T00:00:00.000Z') },
      ]),
    },
    attendanceBiometricTemplate: {
      findMany: jest.fn().mockResolvedValue([
        { nik: '1001', slot: 51 },
        { nik: '1002', slot: 0 },
        { nik: '1003', slot: 51 },
        { nik: '1003', slot: 0 },
        { nik: '1004', slot: 51 },
      ]),
    },
    attendanceSyncRemoval: { findMany: jest.fn().mockResolvedValue([]) },
    employee: {
      findMany: jest.fn().mockResolvedValue([
        { id: 'emp-1', employeeCode: '1001', firstName: 'Ada', lastName: 'Wajah', cardNumber: '55', department: { id: 'dept-1', name: 'Ops' } },
        { id: 'emp-2', employeeCode: '1002', firstName: 'Ada', lastName: 'Sidik', cardNumber: '55', department: { id: 'dept-1', name: 'Ops' } },
        { id: 'emp-3', employeeCode: '1003', firstName: 'Data', lastName: 'Beda', cardNumber: '55', department: { id: 'dept-1', name: 'Ops' } },
        { id: 'emp-4', employeeCode: '1004', firstName: 'Tanpa', lastName: 'Mesin', cardNumber: '55', department: null },
      ]),
    },
  };
}

describe('directory bio status', () => {
  it('mengiris gabungan centang sebelum memotong halaman', async () => {
    const prisma = directoryPrisma();
    const service = new DeviceDirectorySyncService(prisma as never, {} as never);

    const faces = await service.directory('tenant-1', { missingFace: '1', page: '1', pageSize: '40' });
    expect(faces.items.map((row) => row.nik)).toEqual(['1002']);

    const fingers = await service.directory('tenant-1', { missingFinger: '1', page: '1', pageSize: '1' });
    expect(fingers.total).toBe(4);
    expect(fingers.items.map((row) => row.nik)).toEqual(['1001']);

    const both = await service.directory('tenant-1', { missingFace: '1', differs: '1', page: '1', pageSize: '40' });
    expect(both.items.map((row) => row.nik)).toEqual(['1002', '1003']);

    const dept = await service.directory('tenant-1', { departmentId: 'dept-1', missingFinger: '1', page: '1', pageSize: '40' });
    expect(dept.items.map((row) => row.nik)).toEqual(['1001', '1002', '1003']);

    const ignored = await service.directory('tenant-1', { missingFace: 'yes', page: '1', pageSize: '40' });
    expect(ignored.total).toBe(4);
    expect(ignored.devices).toHaveLength(1);
    expect(ignored.quiet).toEqual([]);
  });
});
