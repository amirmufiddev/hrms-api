import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../../prisma/prisma.service';
import { matchesNameNik } from '../../../common/name-search';
import { parsePageQuery } from '../../../common/page-query';
import { jakartaDayWindow } from './jakarta-day';
import { parsePunchQuery } from './punch-query';

export interface PunchRow {
  id: string;
  nik: string;
  employeeName: string | null;
  department: { id: string; name: string } | null;
  punchedAt: Date;
  direction: string;
  verifyMode: string;
  matchStatus: string;
}

export interface DeviceRow {
  id: string;
  code: string;
  serialNumber: string;
  firmware: string | null;
  host: string;
  webPort: number;
  softwarePort: number;
  deviceNumber: number;
  active: boolean;
  passwordSet: boolean;
  lastSeenAt: Date | null;
  lastPunchAt: Date | null;
}

export type DeviceWrite = {
  code: string;
  serialNumber: string;
  host: string;
  webPort: number;
  softwarePort: number;
  firmware?: string;
  deviceNumber?: number;
  password?: string;
  active?: boolean;
};

@Injectable()
export class AttendanceDeskService {
  constructor(private readonly prisma: PrismaService) {}

  async summary(tenantId: string, departmentId?: string) {
    await this.assertDepartment(tenantId, departmentId);
    const today = jakartaDayWindow(jakartaTodayKey(new Date()));
    const day = { gte: today!.start, lte: today!.end };
    const employeeFilter = departmentId ? { departmentId } : {};
    const punchEmployeeFilter = departmentId ? { employee: { departmentId } } : {};
    const [pendingPush, punchesToday, unmatchedToday] = await Promise.all([
      this.prisma.employee.count({
        where: { tenantId, cardPushStatus: 'PENDING', ...employeeFilter },
      }),
      this.prisma.attendancePunch.count({
        where: { tenantId, punchedAt: day, ...punchEmployeeFilter },
      }),
      departmentId
        ? Promise.resolve(0)
        : this.prisma.attendancePunch.count({
            where: { tenantId, punchedAt: day, matchStatus: 'UNMATCHED' },
          }),
    ]);
    return { pendingPush, punchesToday, unmatchedToday };
  }

  async punches(
    tenantId: string,
    input: {
      date?: string;
      recent?: string;
      departmentId?: string;
      search?: string;
      page?: string;
      pageSize?: string;
    },
  ): Promise<PunchRow[] | { items: PunchRow[]; total: number; page: number; pageSize: number }> {
    await this.assertDepartment(tenantId, input.departmentId);
    const query = parsePunchQuery(input);
    const departmentFilter = input.departmentId
      ? { employee: { departmentId: input.departmentId } }
      : {};
    const rows = await this.prisma.attendancePunch.findMany({
      where:
        query.kind === 'day'
          ? { tenantId, punchedAt: { gte: query.start, lte: query.end }, ...departmentFilter }
          : { tenantId, ...departmentFilter },
      include: {
        employee: {
          select: {
            firstName: true,
            lastName: true,
            department: { select: { id: true, name: true } },
          },
        },
      },
      orderBy: { punchedAt: 'desc' },
      ...(query.kind === 'recent' ? { take: query.limit } : {}),
    });
    if (query.kind === 'recent') {
      return rows.map((row) => ({
        id: row.id,
        nik: row.nik,
        employeeName: row.employee
          ? [row.employee.firstName, row.employee.lastName].filter(Boolean).join(' ')
          : null,
        department: row.employee?.department ?? null,
        punchedAt: row.punchedAt,
        direction: row.direction,
        verifyMode: row.verifyMode,
        matchStatus: row.matchStatus,
      }));
    }
    const page = parsePageQuery(input);
    const matched = rows.filter((row) =>
      matchesNameNik(
        {
          code: row.nik,
          firstName: row.employee?.firstName,
          lastName: row.employee?.lastName,
        },
        input.search,
      ),
    );
    const items = matched.slice(page.skip, page.skip + page.pageSize).map((row) => ({
      id: row.id,
      nik: row.nik,
      employeeName: row.employee
        ? [row.employee.firstName, row.employee.lastName].filter(Boolean).join(' ')
        : null,
      department: row.employee?.department ?? null,
      punchedAt: row.punchedAt,
      direction: row.direction,
      verifyMode: row.verifyMode,
      matchStatus: row.matchStatus,
    }));
    return { items, total: matched.length, page: page.page, pageSize: page.pageSize };
  }

  private async assertDepartment(tenantId: string, departmentId?: string): Promise<void> {
    if (!departmentId) {
      return;
    }
    const row = await this.prisma.department.findFirst({
      where: { id: departmentId, tenantId },
      select: { id: true },
    });
    if (!row) {
      throw new BadRequestException('DEPARTMENT_NOT_IN_COMPANY');
    }
  }

  async devices(tenantId: string): Promise<DeviceRow[]> {
    const rows = await this.prisma.attendanceDevice.findMany({
      where: { tenantId, deletedAt: null },
      select: deviceSelect,
      orderBy: { code: 'asc' },
    });
    return rows.map(toPublicDevice);
  }

  async createDevice(tenantId: string, input: DeviceWrite): Promise<DeviceRow> {
    const password = input.password?.trim() ?? '';
    if (!password) {
      throw new BadRequestException('DEVICE_PASSWORD_REQUIRED');
    }
    const retired = await this.prisma.attendanceDevice.findFirst({
      where: {
        tenantId,
        deletedAt: { not: null },
        OR: [{ code: input.code.trim() }, { serialNumber: input.serialNumber.trim() }],
      },
    });
    if (retired) {
      try {
        const revived = await this.prisma.attendanceDevice.update({
          where: { id: retired.id },
          data: {
            ...deviceData(input),
            webPassword: password,
            active: input.active !== false,
            deletedAt: null,
          },
          select: deviceSelect,
        });
        return toPublicDevice(revived);
      } catch (error) {
        throw mapDeviceWriteError(error);
      }
    }
    try {
      const created = await this.prisma.attendanceDevice.create({
        data: {
          tenantId,
          ...deviceData(input),
          webPassword: password,
          active: input.active !== false,
        },
        select: deviceSelect,
      });
      return toPublicDevice(created);
    } catch (error) {
      throw mapDeviceWriteError(error);
    }
  }

  async updateDevice(tenantId: string, id: string, input: DeviceWrite): Promise<DeviceRow> {
    const current = await this.prisma.attendanceDevice.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true, webPassword: true },
    });
    if (!current) {
      throw new NotFoundException('DEVICE_NOT_FOUND');
    }
    const password = input.password?.trim() || current.webPassword;
    if (!password) {
      throw new BadRequestException('DEVICE_PASSWORD_REQUIRED');
    }
    try {
      const updated = await this.prisma.attendanceDevice.update({
        where: { id },
        data: {
          ...deviceData(input),
          webPassword: password,
          active: input.active !== false,
        },
        select: deviceSelect,
      });
      return toPublicDevice(updated);
    } catch (error) {
      throw mapDeviceWriteError(error);
    }
  }

  async deleteDevice(tenantId: string, id: string) {
    const current = await this.prisma.attendanceDevice.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: { id: true },
    });
    if (!current) {
      throw new NotFoundException('DEVICE_NOT_FOUND');
    }
    await this.prisma.attendanceDevice.update({
      where: { id },
      data: { active: false, deletedAt: new Date() },
    });
    return { id, deleted: true };
  }

  async credentials(tenantId: string, id: string) {
    const row = await this.prisma.attendanceDevice.findFirst({
      where: { id, tenantId, deletedAt: null },
      select: {
        id: true,
        code: true,
        host: true,
        webPort: true,
        softwarePort: true,
        webPassword: true,
      },
    });
    if (!row) {
      throw new NotFoundException('DEVICE_NOT_FOUND');
    }
    if (!row.webPassword) {
      throw new ConflictException('DEVICE_PASSWORD_REQUIRED');
    }
    return {
      id: row.id,
      code: row.code,
      host: row.host,
      webPort: row.webPort,
      softwarePort: row.softwarePort,
      password: row.webPassword,
    };
  }
}

const deviceSelect = {
  id: true,
  code: true,
  serialNumber: true,
  firmware: true,
  host: true,
  webPort: true,
  softwarePort: true,
  deviceNumber: true,
  active: true,
  webPassword: true,
  lastSeenAt: true,
  lastPunchAt: true,
} satisfies Prisma.AttendanceDeviceSelect;

function deviceData(input: DeviceWrite) {
  return {
    code: input.code.trim(),
    serialNumber: input.serialNumber.trim(),
    host: input.host.trim(),
    webPort: input.webPort,
    softwarePort: input.softwarePort,
    firmware: input.firmware?.trim() || null,
    deviceNumber: input.deviceNumber ?? 1,
  };
}

function toPublicDevice(row: Prisma.AttendanceDeviceGetPayload<{ select: typeof deviceSelect }>): DeviceRow {
  const { webPassword, ...rest } = row;
  return { ...rest, passwordSet: Boolean(webPassword) };
}

function mapDeviceWriteError(error: unknown): Error {
  if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
    const target = Array.isArray(error.meta?.target) ? error.meta.target.join(',') : '';
    if (target.includes('serial')) {
      return new ConflictException('DEVICE_SERIAL_TAKEN');
    }
    return new ConflictException('DEVICE_CODE_TAKEN');
  }
  return error instanceof Error ? error : new Error('DEVICE_WRITE_FAILED');
}

function jakartaTodayKey(now: Date): string {
  return new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(now);
}
