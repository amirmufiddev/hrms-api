import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AttendanceSource,
  AttendanceStatus,
  Prisma,
  PunchJobStatus,
  PunchMatchStatus,
  PunchVerifyMode,
} from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { OtCalculationService } from './ot-calculation.service';
import {
  attendanceDateKey,
  buildSessions,
  mapDeviceState,
  PunchDirection,
  punchesForAttendance,
  ShiftWindow,
  summarizeDay,
} from './device/punch-fold';
import { isNumericToken } from './device/nik';

export interface IngestPunchInput {
  nik: string;
  punchedAt: string;
  verifyMode?: PunchVerifyMode;
  deviceState?: number | null;
}

export interface IngestPunchesInput {
  deviceCode: string;
  serialNumber?: string;
  punches: IngestPunchInput[];
}

export type QueuedPunchJob = {
  id: string;
  tenantId: string;
  deviceId: string;
  nik: string;
  punchedAt: Date;
  verifyMode: PunchVerifyMode;
  deviceState: number | null;
};

const OFFSET = /(?:Z|[+-]\d{2}:\d{2})$/;

@Injectable()
export class PunchIngestService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
    private readonly otCalculation: OtCalculationService,
  ) {}

  async ingest(tenantId: string, body: IngestPunchesInput) {
    if (body.punches.length > 500) {
      throw new BadRequestException('BATCH_TOO_LARGE');
    }
    if (body.punches.some((punch) => !OFFSET.test(punch.punchedAt))) {
      throw new BadRequestException('PUNCH_TIME_OFFSET_REQUIRED');
    }

    const device = await this.ensureDevice(tenantId, body.deviceCode, body.serialNumber);
    const results: Array<{ nik: string; punchedAt: string; status: string }> = [];

    await this.prisma.$transaction(async (tx) => {
      for (const punch of body.punches) {
        const punchedAt = truncateToSecond(new Date(punch.punchedAt));
        if (!isNumericToken(punch.nik)) {
          results.push({ nik: punch.nik, punchedAt: punch.punchedAt, status: 'rejected' });
          continue;
        }

        const existing = await tx.attendancePunch.findFirst({
          where: { deviceId: device.id, nik: punch.nik, punchedAt },
        });
        if (existing) {
          results.push({ nik: punch.nik, punchedAt: punch.punchedAt, status: 'duplicate' });
          continue;
        }

        const existingJob = await tx.attendancePunchJob.findUnique({
          where: { deviceId_nik_punchedAt: { deviceId: device.id, nik: punch.nik, punchedAt } },
        });
        if (existingJob) {
          results.push({ nik: punch.nik, punchedAt: punch.punchedAt, status: 'queued' });
          continue;
        }

        await tx.attendancePunchJob.create({
          data: {
            tenantId,
            deviceId: device.id,
            nik: punch.nik,
            punchedAt,
            verifyMode: punch.verifyMode ?? PunchVerifyMode.UNKNOWN,
            deviceState: punch.deviceState ?? null,
            status: PunchJobStatus.PENDING,
            attempts: 0,
          },
        });
        results.push({ nik: punch.nik, punchedAt: punch.punchedAt, status: 'queued' });
      }
    });

    return { results };
  }

  async applyQueuedJob(job: QueuedPunchJob): Promise<void> {
    const existing = await this.prisma.attendancePunch.findFirst({
      where: { deviceId: job.deviceId, nik: job.nik, punchedAt: job.punchedAt },
    });
    let latestPunchAt = job.punchedAt;
    let employeeId = existing?.employeeId ?? null;
    if (!existing) {
      const employee = await this.prisma.employee.findFirst({
        where: { tenantId: job.tenantId, employeeCode: job.nik },
      });
      const matched = Boolean(employee);
      employeeId = employee?.id ?? null;
      await this.prisma.attendancePunch.create({
        data: {
          tenantId: job.tenantId,
          deviceId: job.deviceId,
          nik: job.nik,
          employeeId,
          punchedAt: job.punchedAt,
          verifyMode: job.verifyMode,
          deviceState: job.deviceState,
          direction: mapDeviceState(job.deviceState, false),
          matchStatus: matched ? PunchMatchStatus.MATCHED : PunchMatchStatus.UNMATCHED,
        },
      });
    }
    if (employeeId) {
      const key = await this.affectKey(job.tenantId, employeeId, job.punchedAt);
      const [, dateKey] = key.split('|');
      await this.foldDay(job.tenantId, employeeId, dateKey);
    }

    const device = await this.prisma.attendanceDevice.findUnique({ where: { id: job.deviceId } });
    if (device && (!device.lastPunchAt || latestPunchAt > device.lastPunchAt)) {
      await this.prisma.attendanceDevice.update({
        where: { id: job.deviceId },
        data: { lastPunchAt: latestPunchAt },
      });
    }
  }

  async rematch(tenantId: string, nik: string) {
    if (!isNumericToken(nik)) return { matched: 0 };
    const employee = await this.prisma.employee.findFirst({
      where: { tenantId, employeeCode: nik, status: 'ACTIVE' },
    });
    if (!employee) return { matched: 0 };
    const rows = await this.prisma.attendancePunch.findMany({
      where: { tenantId, nik, matchStatus: PunchMatchStatus.UNMATCHED },
    });
    if (rows.length === 0) return { matched: 0 };
    await this.prisma.attendancePunch.updateMany({
      where: { id: { in: rows.map((row) => row.id) } },
      data: { employeeId: employee.id, matchStatus: PunchMatchStatus.MATCHED },
    });
    const affected = new Set<string>();
    for (const row of rows) {
      affected.add(await this.affectKey(tenantId, employee.id, row.punchedAt));
    }
    for (const key of affected) {
      const [employeeId, dateKey] = key.split('|');
      await this.foldDay(tenantId, employeeId, dateKey);
    }
    return { matched: rows.length };
  }

  async refoldTenant(tenantId: string) {
    const punches = await this.prisma.attendancePunch.findMany({
      where: {
        tenantId,
        matchStatus: PunchMatchStatus.MATCHED,
        employeeId: { not: null },
      },
      select: { employeeId: true, punchedAt: true },
    });
    const keys = new Set<string>();
    for (const punch of punches) {
      if (!punch.employeeId) continue;
      keys.add(await this.affectKey(tenantId, punch.employeeId, punch.punchedAt));
    }
    for (const key of keys) {
      const [employeeId, dateKey] = key.split('|');
      await this.foldDay(tenantId, employeeId, dateKey);
    }
    return { days: keys.size };
  }

  private async affectKey(tenantId: string, employeeId: string, punchedAt: Date) {
    const shift = await this.resolveShift(tenantId, employeeId, punchedAt);
    return `${employeeId}|${attendanceDateKey(punchedAt, shift)}`;
  }

  private async foldDay(tenantId: string, employeeId: string, dateKey: string) {
    const day = new Date(`${dateKey}T00:00:00.000Z`);
    const shift = await this.resolveShift(tenantId, employeeId, day);
    const punches = await this.prisma.attendancePunch.findMany({
      where: {
        tenantId,
        employeeId,
        matchStatus: PunchMatchStatus.MATCHED,
        punchedAt: {
          gte: jakartaStart(addDays(dateKey, -1)),
          lt: jakartaStart(addDays(dateKey, 2)),
        },
      },
      orderBy: { punchedAt: 'asc' },
    });
    const dayPunches = punches.filter(
      (punch) => attendanceDateKey(punch.punchedAt, shift) === dateKey,
    );
    if (dayPunches.length === 0) {
      return;
    }

    const kept = punchesForAttendance(dayPunches);
    for (let index = 0; index < kept.length; index += 1) {
      const punch = kept[index];
      if (!punch.id) continue;
      const direction: PunchDirection = index % 2 === 0 ? 'IN' : 'OUT';
      if (punch.direction === direction) continue;
      await this.prisma.attendancePunch.update({
        where: { id: punch.id },
        data: { direction },
      });
    }
    const sessions = buildSessions(kept);
    const summary = summarizeDay(sessions);
    const employee = await this.prisma.employee.findFirst({
      where: { id: employeeId, tenantId },
    });
    const standardWorkMinutes = shift?.standardWorkMinutes ?? 480;
    const rule = employee
      ? await this.otCalculation.getOtRule(tenantId, employee.employmentType)
      : null;
    const otMinutesCalculated = this.otCalculation.calculateOtMinutes(
      summary.workedMinutes,
      standardWorkMinutes,
      rule,
    );
    const remarks = sessions.some((session) => session.missingOut) ? 'missing_out' : null;
    const data = {
      clockInTime: summary.clockInTime,
      clockOutTime: summary.clockOutTime,
      workedMinutes: summary.workedMinutes,
      otMinutesCalculated,
      standardWorkMinutes,
      status: AttendanceStatus.PRESENT,
      source: AttendanceSource.DEVICE,
      remarks,
      clockInLatitude: null,
      clockInLongitude: null,
      clockOutLatitude: null,
      clockOutLongitude: null,
      clockInPhoto: null,
      clockOutPhoto: null,
      shiftId: shift?.id ?? null,
    };

    const existing = await this.prisma.attendanceRecord.findUnique({
      where: {
        tenantId_employeeId_date: { tenantId, employeeId, date: day },
      },
    });

    if (existing) {
      await this.prisma.attendanceSession.deleteMany({ where: { attendanceId: existing.id } });
      await this.prisma.attendanceRecord.update({
        where: { id: existing.id },
        data: {
          ...data,
          sessions: { create: sessionRows(sessions) },
        },
      });
      return;
    }

    await this.prisma.attendanceRecord.create({
      data: {
        tenantId,
        employeeId,
        date: day,
        ...data,
        sessions: { create: sessionRows(sessions) },
      },
    });
  }

  private async resolveShift(
    tenantId: string,
    employeeId: string,
    instant: Date,
  ): Promise<(ShiftWindow & { id: string; standardWorkMinutes: number }) | null> {
    const dateKey = attendanceDateKey(instant, null);
    const day = new Date(`${dateKey}T00:00:00.000Z`);
    const assignment = await this.prisma.shiftAssignment.findFirst({
      where: {
        tenantId,
        employeeId,
        isActive: true,
        startDate: { lte: day },
        OR: [{ endDate: null }, { endDate: { gte: day } }],
      },
      include: { shift: true },
    });
    if (!assignment?.shift) {
      return null;
    }
    return {
      id: assignment.shift.id,
      startTime: assignment.shift.startTime,
      endTime: assignment.shift.endTime,
      graceMinutes: assignment.shift.graceMinutes,
      standardWorkMinutes: assignment.shift.standardWorkMinutes,
    };
  }

  private async ensureDevice(tenantId: string, deviceCode: string, serialNumber?: string) {
    const existing = await this.prisma.attendanceDevice.findUnique({
      where: { tenantId_code: { tenantId, code: deviceCode } },
    });
    if (existing) {
      return this.prisma.attendanceDevice.update({
        where: { id: existing.id },
        data: { lastSeenAt: new Date() },
      });
    }

    const serial = serialNumber ?? this.config.get<string>('ATTENDANCE_DEVICE_SERIAL');
    const host = this.config.get<string>('ATTENDANCE_DEVICE_HOST');
    if (!serial || !host) {
      throw new BadRequestException('DEVICE_NOT_CONFIGURED');
    }
    return this.prisma.attendanceDevice.create({
      data: {
        tenantId,
        code: deviceCode,
        serialNumber: serial,
        firmware: this.config.get<string>('ATTENDANCE_DEVICE_FIRMWARE') ?? null,
        deviceNumber: Number(this.config.get('ATTENDANCE_DEVICE_NUMBER') ?? 1),
        host,
        lastSeenAt: new Date(),
      },
    });
  }
}

function sessionRows(
  sessions: ReturnType<typeof buildSessions>,
): Prisma.AttendanceSessionCreateWithoutAttendanceInput[] {
  return sessions.map((session) => ({
    inTime: session.inTime,
    outTime: session.outTime,
    sessionMinutes: session.sessionMinutes,
  }));
}

function truncateToSecond(value: Date): Date {
  const copy = new Date(value);
  copy.setMilliseconds(0);
  return copy;
}

function addDays(key: string, days: number): string {
  const [year, month, day] = key.split('-').map(Number);
  const utc = new Date(Date.UTC(year, month - 1, day));
  utc.setUTCDate(utc.getUTCDate() + days);
  return utc.toISOString().slice(0, 10);
}

function jakartaStart(dateKey: string): Date {
  const [year, month, day] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day, -7, 0, 0, 0));
}
