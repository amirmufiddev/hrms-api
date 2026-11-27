import {
  ConflictException,
  UnprocessableEntityException,
} from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import { ConfigService } from "@nestjs/config";
import { CardEnrollmentService } from "./card-enrollment.service";
import { PrismaService } from "../../prisma/prisma.service";
import { PunchIngestService } from "../attendance/punch-ingest.service";
import { DeviceDirectorySyncService } from "../attendance/device/device-directory-sync.service";
import { createMockPrismaService } from "../../test/helpers";

describe("CardEnrollmentService", () => {
  let service: CardEnrollmentService;
  let prisma: any;

  const tenantId = "tenant-1";

  beforeEach(async () => {
    prisma = createMockPrismaService();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CardEnrollmentService,
        { provide: PrismaService, useValue: prisma },
        { provide: PunchIngestService, useValue: { rematch: jest.fn().mockResolvedValue({ matched: 0 }) } },
        { provide: DeviceDirectorySyncService, useValue: { pushAssignedCard: jest.fn().mockResolvedValue("PENDING") } },
        {
          provide: ConfigService,
          useValue: {
            get: (key: string) => {
              if (key === "ATTENDANCE_DEVICE_SERIAL") return "AXUD28053046";
              if (key === "ATTENDANCE_DEVICE_HOST") return "192.168.1.224";
              if (key === "ATTENDANCE_DEVICE_FIRMWARE")
                return "ai518_fp26v_v2.29";
              if (key === "ATTENDANCE_DEVICE_NUMBER") return 1;
              return undefined;
            },
          },
        },
      ],
    }).compile();

    service = module.get(CardEnrollmentService);
  });

  function employeesThenEmpty(rows: unknown[]) {
    prisma.employee.findMany.mockImplementation(async (args: { skip?: number }) =>
      (args.skip ?? 0) > 0 ? [] : rows,
    );
  }

  it("menyimpan NIK 012345 tanpa SSO sebagai PENDING", async () => {
    prisma.employee.findFirst
      .mockResolvedValueOnce({
        id: "emp-1",
        employeeCode: "012345",
        firstName: "Siti",
        lastName: "Aminah",
        status: "ACTIVE",
        cardNumber: null,
        ssoUserId: null,
      })
      .mockResolvedValueOnce(null);
    prisma.employee.update.mockResolvedValue({
      id: "emp-1",
      employeeCode: "012345",
      cardNumber: "0011223344",
      cardPushStatus: "PENDING",
      ssoUserId: null,
    });

    const result = await service.assignCard(tenantId, "emp-1", "0011223344");

    expect(result).toEqual({
      id: "emp-1",
      employeeCode: "012345",
      cardNumber: "0011223344",
      cardPushStatus: "PENDING",
      ssoLinked: false,
    });
    expect(prisma.employee.update).toHaveBeenCalledWith({
      where: { id: "emp-1" },
      data: expect.objectContaining({
        cardNumber: "809609984",
        cardPushStatus: "PENDING",
        deviceUid: null,
      }),
    });
  });

  it("menolak employeeCode EMP001", async () => {
    prisma.employee.findFirst.mockResolvedValue({
      id: "emp-2",
      employeeCode: "EMP001",
      status: "ACTIVE",
      cardNumber: null,
      ssoUserId: "sso-1",
    });

    await expect(
      service.assignCard(tenantId, "emp-2", "0011223344"),
    ).rejects.toBeInstanceOf(UnprocessableEntityException);
  });

  it("menolak nomor kartu yang sudah dipakai karyawan lain", async () => {
    prisma.employee.findFirst
      .mockResolvedValueOnce({
        id: "emp-1",
        employeeCode: "909212",
        status: "ACTIVE",
        cardNumber: null,
        ssoUserId: "sso-1",
      })
      .mockResolvedValueOnce({ id: "emp-lain" });

    await expect(
      service.assignCard(tenantId, "emp-1", "0011223344"),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it("menampilkan karyawan tanpa SSO dan menyembunyikan NIK bukan angka", async () => {
    employeesThenEmpty([
      {
        id: "emp-1",
        employeeCode: "012345",
        firstName: "Siti",
        lastName: "Aminah",
        ssoUserId: null,
        employmentType: "PERMANENT",
        department: null,
      },
      {
        id: "emp-2",
        employeeCode: "EMP001",
        firstName: "Budi",
        lastName: "Santoso",
        ssoUserId: "sso-2",
        employmentType: "CONTRACT",
        department: null,
      },
      {
        id: "emp-3",
        employeeCode: "909212",
        firstName: "Andi",
        lastName: "Wijaya",
        ssoUserId: "sso-3",
        employmentType: "DAILY_WORKER",
        department: null,
      },
    ]);

    const result = await service.listUnassigned(tenantId, undefined, undefined, {
      page: "1",
      pageSize: "40",
    });

    expect(result.items).toEqual([
      {
        id: "emp-1",
        employeeCode: "012345",
        firstName: "Siti",
        lastName: "Aminah",
        employmentType: "PERMANENT",
        ssoLinked: false,
        department: null,
      },
      {
        id: "emp-3",
        employeeCode: "909212",
        firstName: "Andi",
        lastName: "Wijaya",
        employmentType: "DAILY_WORKER",
        ssoLinked: true,
        department: null,
      },
    ]);
    expect(result.total).toBe(2);
  });

  it("mengembalikan halaman NIK angka dan mencocokkan nama gabungan", async () => {
    employeesThenEmpty([
      {
        id: "emp-1",
        employeeCode: "1001",
        firstName: "Budi",
        lastName: "Santoso",
        ssoUserId: null,
        employmentType: "PERMANENT",
        department: null,
      },
      {
        id: "emp-2",
        employeeCode: "EMP001",
        firstName: "Budi",
        lastName: "Santoso",
        ssoUserId: null,
        employmentType: "PERMANENT",
        department: null,
      },
      {
        id: "emp-3",
        employeeCode: "1002",
        firstName: "Siti",
        lastName: "Aminah",
        ssoUserId: null,
        employmentType: "PERMANENT",
        department: null,
      },
    ]);

    const page = await service.listUnassigned(tenantId, "Budi Santoso", undefined, {
      page: "1",
      pageSize: "40",
    });

    expect(page).toEqual({
      items: [expect.objectContaining({ id: "emp-1", employeeCode: "1001" })],
      total: 1,
      page: 1,
      pageSize: 40,
    });
    expect(page.items.some((row) => row.employeeCode === "EMP001")).toBe(false);
  });

  it("mencabut kartu PENDING tanpa membersihkan mesin", async () => {
    prisma.employee.findFirst.mockResolvedValue({
      id: "emp-1",
      cardNumber: "0011223344",
      cardPushStatus: "PENDING",
    });
    prisma.employee.update.mockResolvedValue({});

    await service.revokeCard(tenantId, "emp-1", false);

    expect(prisma.employee.update).toHaveBeenCalledWith({
      where: { id: "emp-1" },
      data: {
        cardNumber: null,
        cardAssignedAt: null,
        cardPushStatus: null,
        deviceUid: null,
      },
    });
  });

  it("mencabut kartu PUSHED dan menyerahkan penghapusan di mesin ke server", async () => {
    prisma.employee.findFirst.mockResolvedValue({
      id: "emp-1",
      cardNumber: "0011223344",
      cardPushStatus: "PUSHED",
    });
    prisma.employee.update.mockResolvedValue({});

    await service.revokeCard(tenantId, "emp-1", false);

    expect(prisma.employee.update).toHaveBeenCalledWith({
      where: { id: "emp-1" },
      data: {
        cardNumber: null,
        cardAssignedAt: null,
        cardPushStatus: null,
        deviceUid: null,
      },
    });
  });

  it("menyertakan department dan menyaring departmentId", async () => {
    prisma.department = { findFirst: jest.fn().mockResolvedValue({ id: "dept-1" }) };
    employeesThenEmpty([
      {
        id: "emp-1",
        employeeCode: "206901",
        firstName: "Amir",
        lastName: "Mufid",
        ssoUserId: "sso-1",
        employmentType: "PERMANENT",
        department: { id: "dept-1", name: "Operasional" },
      },
    ]);

    const result = await service.listUnassigned(tenantId, undefined, "dept-1", {
      page: "1",
      pageSize: "40",
    });

    expect(result.items[0].department).toEqual({ id: "dept-1", name: "Operasional" });
    expect(prisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId, departmentId: "dept-1" }),
      }),
    );
  });

  it("menyaring employmentType", async () => {
    employeesThenEmpty([]);
    await service.listUnassigned(
      tenantId,
      undefined,
      undefined,
      { page: "1", pageSize: "40" },
      "DAILY_WORKER",
    );
    expect(prisma.employee.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId, employmentType: "DAILY_WORKER" }),
      }),
    );
  });

  it("mengembalikan daftar jenis karyawan", async () => {
    const rows = await service.listEmploymentTypes(tenantId);
    expect(rows.some((row) => row.value === "DAILY_WORKER" && row.label === "Pekerja harian")).toBe(true);
    expect(rows.some((row) => row.value === "PERMANENT")).toBe(true);
  });

  it("menolak department di luar tenant", async () => {
    prisma.department = { findFirst: jest.fn().mockResolvedValue(null) };
    await expect(service.listUnassigned(tenantId, undefined, "dept-x")).rejects.toThrow(
      "DEPARTMENT_NOT_IN_COMPANY",
    );
  });

  it("mendaftar karyawan yang sudah punya kartu", async () => {
    prisma.employee.findMany.mockResolvedValue([
      {
        id: "emp-1",
        employeeCode: "260061",
        firstName: "Reinato",
        lastName: "Priantama",
        cardNumber: "4037168326",
        cardPushStatus: "PUSHED",
        department: { id: "dept-1", name: "Operasional" },
      },
    ]);

    const rows = await service.listAssigned(tenantId);
    expect(rows).toEqual([
      {
        id: "emp-1",
        employeeCode: "260061",
        firstName: "Reinato",
        lastName: "Priantama",
        cardNumber: "4037168326",
        cardPushStatus: "PUSHED",
        department: { id: "dept-1", name: "Operasional" },
      },
    ]);
  });

  it("memotong antrian dan menghitung cari nama", async () => {
    prisma.department = { findFirst: jest.fn().mockResolvedValue({ id: "dept-1" }) };
    prisma.employee.findMany.mockResolvedValue([
      {
        id: "emp-1",
        employeeCode: "1001",
        firstName: "Budi",
        lastName: "Santoso",
        cardNumber: "111",
        department: { id: "dept-1", name: "Ops" },
      },
      {
        id: "emp-2",
        employeeCode: "1002",
        firstName: "Siti",
        lastName: "Aminah",
        cardNumber: "222",
        department: { id: "dept-1", name: "Ops" },
      },
    ]);

    const page = await service.listPendingPush(tenantId, "dept-1", "Santoso", {
      page: "1",
      pageSize: "1",
    });

    expect(page.total).toBe(1);
    expect(page.items).toEqual([
      expect.objectContaining({ id: "emp-1", employeeCode: "1001" }),
    ]);
    expect(page.page).toBe(1);
    expect(page.pageSize).toBe(1);
  });

  it("menandai hasil push sebagai PUSHED", async () => {
    prisma.attendanceDevice.upsert.mockResolvedValue({ id: "dev-1" });
    prisma.employee.updateMany.mockResolvedValue({ count: 1 });

    const result = await service.markPushResults(tenantId, "GATE-01", [
      { employeeId: "emp-1", deviceUid: 17, status: "pushed" },
    ]);

    expect(result).toEqual({ pushed: 1 });
    expect(prisma.employee.updateMany).toHaveBeenCalledWith({
      where: {
        id: "emp-1",
        tenantId,
        cardPushStatus: "PENDING",
      },
      data: {
        cardPushStatus: "PUSHED",
        deviceUid: 17,
      },
    });
  });
});
