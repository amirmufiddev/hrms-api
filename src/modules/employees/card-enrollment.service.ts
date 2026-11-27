import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CardPushStatus, EmployeeStatus, EmploymentType } from '@prisma/client';
import { matchesNameNik } from '../../common/name-search';
import { parsePageQuery } from '../../common/page-query';
import { PrismaService } from '../../prisma/prisma.service';
import { PunchIngestService } from '../attendance/punch-ingest.service';
import { identityCardCanonical } from '../attendance/device/card-canonical';
import { DeviceDirectorySyncService } from '../attendance/device/device-directory-sync.service';
import { isNumericToken } from '../attendance/device/nik';

export type Page<T> = { items: T[]; total: number; page: number; pageSize: number };

export interface PushResultInput {
  employeeId: string;
  deviceUid: number;
  status: 'pushed';
}

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  PERMANENT: 'Karyawan tetap',
  CONTRACT: 'Kontrak',
  TEMPORARY: 'Sementara',
  INTERN: 'Magang',
  DAILY_WORKER: 'Pekerja harian',
};

@Injectable()
export class CardEnrollmentService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly punches: PunchIngestService,
    private readonly directory: DeviceDirectorySyncService,
  ) {}

  async listDepartments(tenantId: string) {
    return this.prisma.department.findMany({
      where: { tenantId },
      select: { id: true, name: true },
      orderBy: { name: 'asc' },
    });
  }

  async listEmploymentTypes(_tenantId: string) {
    return Object.values(EmploymentType)
      .map((value) => ({ value, label: EMPLOYMENT_TYPE_LABELS[value] }))
      .sort((left, right) => left.label.localeCompare(right.label, 'id'));
  }

  async listUnassigned(
    tenantId: string,
    search?: string,
    departmentId?: string,
    pageInput?: { page?: string; pageSize?: string },
    employmentType?: string,
  ): Promise<Page<ReturnType<CardEnrollmentService['mapUnassignedEmployee']>>> {
    await this.assertDepartment(tenantId, departmentId);
    this.assertEmploymentType(employmentType);
    const page = parsePageQuery(pageInput);
    const where = this.unassignedWhere(
      tenantId,
      departmentId,
      employmentType as EmploymentType | undefined,
    );
    const total = await this.countNumericUnassigned(where, search);
    const items = await this.sliceNumericUnassigned(where, page.pageSize, page.skip, search);
    return { items, total, page: page.page, pageSize: page.pageSize };
  }

  private readonly unassignedSelect = {
    id: true,
    employeeCode: true,
    firstName: true,
    lastName: true,
    ssoUserId: true,
    employmentType: true,
    department: { select: { id: true, name: true } },
  };

  private readonly unassignedOrderBy = [{ employeeCode: 'asc' as const }];

  private unassignedWhere(
    tenantId: string,
    departmentId?: string,
    employmentType?: EmploymentType,
  ) {
    return {
      tenantId,
      status: EmployeeStatus.ACTIVE,
      cardNumber: null,
      ...(departmentId ? { departmentId } : {}),
      ...(employmentType ? { employmentType } : {}),
    };
  }

  private mapUnassignedEmployee(employee: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    ssoUserId: string | null;
    employmentType: EmploymentType;
    department: { id: string; name: string } | null;
  }) {
    return {
      id: employee.id,
      employeeCode: employee.employeeCode,
      firstName: employee.firstName,
      lastName: employee.lastName,
      employmentType: employee.employmentType,
      ssoLinked: Boolean(employee.ssoUserId),
      department: employee.department,
    };
  }

  private async countNumericUnassigned(
    where: ReturnType<CardEnrollmentService['unassignedWhere']>,
    search?: string,
  ): Promise<number> {
    let count = 0;
    let dbSkip = 0;
    const batchSize = 200;
    while (true) {
      const batch = await this.prisma.employee.findMany({
        where,
        select: { employeeCode: true, firstName: true, lastName: true },
        orderBy: [{ employeeCode: 'asc' }],
        skip: dbSkip,
        take: batchSize,
      });
      if (!batch.length) break;
      dbSkip += batch.length;
      for (const row of batch) {
        if (!isNumericToken(row.employeeCode)) continue;
        if (
          !matchesNameNik(
            { code: row.employeeCode, firstName: row.firstName, lastName: row.lastName },
            search,
          )
        ) {
          continue;
        }
        count += 1;
      }
    }
    return count;
  }

  private async sliceNumericUnassigned(
    where: ReturnType<CardEnrollmentService['unassignedWhere']>,
    limit: number,
    offset: number,
    search?: string,
  ) {
    const items: ReturnType<CardEnrollmentService['mapUnassignedEmployee']>[] = [];
    let numericSeen = 0;
    let dbSkip = 0;
    const batchSize = 100;

    while (items.length < limit) {
      const batch = await this.prisma.employee.findMany({
        where,
        select: this.unassignedSelect,
        orderBy: this.unassignedOrderBy,
        skip: dbSkip,
        take: batchSize,
      });
      if (!batch.length) break;
      dbSkip += batch.length;

      for (const employee of batch) {
        if (!isNumericToken(employee.employeeCode)) continue;
        if (
          !matchesNameNik(
            {
              code: employee.employeeCode,
              firstName: employee.firstName,
              lastName: employee.lastName,
            },
            search,
          )
        ) {
          continue;
        }
        if (numericSeen < offset) {
          numericSeen += 1;
          continue;
        }
        items.push(this.mapUnassignedEmployee(employee));
        if (items.length >= limit) break;
      }
    }

    return items;
  }

  async assignCard(tenantId: string, employeeId: string, rawCardNumber: string) {
    const cardNumber = identityCardCanonical(rawCardNumber.trim());
    if (!isNumericToken(cardNumber)) {
      throw new UnprocessableEntityException('CARD_NOT_NUMERIC');
    }

    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
    });
    if (!employee) {
      throw new NotFoundException('EMPLOYEE_NOT_FOUND');
    }
    if (employee.status !== EmployeeStatus.ACTIVE) {
      throw new ConflictException('EMPLOYEE_INACTIVE');
    }
    if (!isNumericToken(employee.employeeCode)) {
      throw new UnprocessableEntityException('NIK_NOT_NUMERIC');
    }
    if (employee.cardNumber) {
      throw new ConflictException('CARD_ALREADY_ASSIGNED');
    }

    const taken = await this.prisma.employee.findFirst({
      where: {
        tenantId,
        cardNumber,
        id: { not: employeeId },
      },
      select: { id: true },
    });
    if (taken) {
      throw new ConflictException('CARD_IN_USE');
    }

    const updated = await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        cardNumber,
        cardAssignedAt: new Date(),
        cardPushStatus: CardPushStatus.PENDING,
        deviceUid: null,
      },
    });
    try {
      await this.punches.rematch(tenantId, updated.employeeCode);
    } catch {
      // Kartu tetap tersimpan. Tap lama dicocokkan lagi saat karyawan disimpan.
    }
    let cardPushStatus = updated.cardPushStatus;
    if (updated.cardNumber) {
      try {
        cardPushStatus = await this.directory.pushAssignedCard(tenantId, {
          id: updated.id,
          employeeCode: updated.employeeCode,
          firstName: employee.firstName,
          lastName: employee.lastName,
          cardNumber: updated.cardNumber,
        });
      } catch {
        cardPushStatus = CardPushStatus.PENDING;
      }
    }

    return {
      id: updated.id,
      employeeCode: updated.employeeCode,
      cardNumber: updated.cardNumber,
      cardPushStatus,
      ssoLinked: Boolean(updated.ssoUserId),
    };
  }

  async listPendingPush(
    tenantId: string,
    departmentId?: string,
    search?: string,
    pageInput?: { page?: string; pageSize?: string },
  ) {
    await this.assertDepartment(tenantId, departmentId);
    const page = parsePageQuery(pageInput);
    const rows = await this.prisma.employee.findMany({
      where: {
        tenantId,
        status: EmployeeStatus.ACTIVE,
        cardPushStatus: CardPushStatus.PENDING,
        ...(departmentId ? { departmentId } : {}),
      },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        cardNumber: true,
        department: { select: { id: true, name: true } },
      },
      orderBy: [{ employeeCode: 'asc' }],
    });
    const matched = rows.filter((row) =>
      matchesNameNik({ code: row.employeeCode, firstName: row.firstName, lastName: row.lastName }, search),
    );
    return {
      items: matched.slice(page.skip, page.skip + page.pageSize),
      total: matched.length,
      page: page.page,
      pageSize: page.pageSize,
    };
  }

  async listAssigned(tenantId: string, departmentId?: string, search?: string) {
    await this.assertDepartment(tenantId, departmentId);
    const rows = await this.prisma.employee.findMany({
      where: {
        tenantId,
        status: EmployeeStatus.ACTIVE,
        cardNumber: { not: null },
        ...(departmentId ? { departmentId } : {}),
        ...(search
          ? {
              OR: [
                { firstName: { contains: search, mode: 'insensitive' as const } },
                { lastName: { contains: search, mode: 'insensitive' as const } },
                { employeeCode: { contains: search, mode: 'insensitive' as const } },
              ],
            }
          : {}),
      },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        cardNumber: true,
        cardPushStatus: true,
        department: { select: { id: true, name: true } },
      },
      orderBy: [{ employeeCode: 'asc' }],
    });
    return rows.map((row) => ({
      id: row.id,
      employeeCode: row.employeeCode,
      firstName: row.firstName,
      lastName: row.lastName,
      cardNumber: row.cardNumber,
      cardPushStatus: row.cardPushStatus,
      department: row.department,
    }));
  }

  private assertEmploymentType(employmentType?: string): asserts employmentType is EmploymentType | undefined {
    if (!employmentType) return;
    if (!Object.values(EmploymentType).includes(employmentType as EmploymentType)) {
      throw new BadRequestException('EMPLOYMENT_TYPE_INVALID');
    }
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

  async markPushResults(tenantId: string, deviceCode: string, results: PushResultInput[]) {
    await this.ensureDevice(tenantId, deviceCode);

    let pushed = 0;
    for (const result of results) {
      if (result.status !== 'pushed') {
        continue;
      }
      const updated = await this.prisma.employee.updateMany({
        where: {
          id: result.employeeId,
          tenantId,
          cardPushStatus: CardPushStatus.PENDING,
        },
        data: {
          cardPushStatus: CardPushStatus.PUSHED,
          deviceUid: result.deviceUid,
        },
      });
      pushed += updated.count;
    }

    return { pushed };
  }

  async revokeCard(tenantId: string, employeeId: string, _deviceCleared: boolean) {
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
    });
    if (!employee) {
      throw new NotFoundException('EMPLOYEE_NOT_FOUND');
    }
    if (!employee.cardNumber) {
      throw new ConflictException('CARD_NOT_ASSIGNED');
    }
    await this.prisma.employee.update({
      where: { id: employeeId },
      data: {
        cardNumber: null,
        cardAssignedAt: null,
        cardPushStatus: null,
        deviceUid: null,
      },
    });

    return { id: employeeId, cleared: true };
  }

  private async ensureDevice(tenantId: string, deviceCode: string) {
    const existing = await this.prisma.attendanceDevice.findUnique({
      where: { tenantId_code: { tenantId, code: deviceCode } },
    });
    if (existing) {
      return this.prisma.attendanceDevice.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date() },
      });
    }

    const serialNumber = this.config.get<string>('ATTENDANCE_DEVICE_SERIAL');
    const host = this.config.get<string>('ATTENDANCE_DEVICE_HOST');
    if (!serialNumber || !host) {
      throw new ConflictException('DEVICE_NOT_CONFIGURED');
    }
    const firmware = this.config.get<string>('ATTENDANCE_DEVICE_FIRMWARE');
    const deviceNumber = Number(this.config.get<number>('ATTENDANCE_DEVICE_NUMBER') ?? 1);

    return this.prisma.attendanceDevice.upsert({
      where: {
        tenantId_code: { tenantId, code: deviceCode },
      },
      update: { lastSeenAt: new Date() },
      create: {
        tenantId,
        code: deviceCode,
        serialNumber,
        firmware: firmware ?? null,
        deviceNumber: Number.isFinite(deviceNumber) ? deviceNumber : 1,
        host,
        lastSeenAt: new Date(),
      },
    });
  }
}
