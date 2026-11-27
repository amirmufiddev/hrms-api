import { AttendanceController } from './attendance.controller';

describe('AttendanceController.listDevicePulls', () => {
  it('mengembalikan daftar tarikan tenant pengguna', async () => {
    const list = jest.fn().mockResolvedValue({ devices: [] });
    const controller = new AttendanceController({} as never, {} as never, {} as never, {} as never, { list } as never);
    await expect(controller.listDevicePulls({ tenantId: 'tenant-1' } as never)).resolves.toEqual({ devices: [] });
    expect(list).toHaveBeenCalledWith('tenant-1');
  });
});
