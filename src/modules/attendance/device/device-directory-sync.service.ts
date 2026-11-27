import {
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from "@nestjs/common";
import { CardPushStatus, EmployeeStatus } from "@prisma/client";
import { matchesNameNik } from "../../../common/name-search";
import { faceSlot, matchesBioStatus } from "./directory-bio-status";
import { parsePageQuery } from "../../../common/page-query";
import { PrismaService } from "../../../prisma/prisma.service";
import {
  DeviceDirectoryClient,
  DeviceEndpoint,
  DevicePaceError,
  DeviceUserRow,
} from "./device-directory.client";
import { DevicePace, PaceKind } from "./device-pace";

const BIO_SLOTS = [51] as const;
const FACE_SLOTS = [20, 21, 22, 23, 24, 25, 26, 27, 50, 51];
const FULL_SCAN_EVERY = 3;

type LiveDevice = {
  id: string;
  tenantId: string;
  code: string;
  host: string;
  webPort: number;
  webPassword: string;
};

type OnlineDevice = {
  device: LiveDevice;
  endpoint: DeviceEndpoint;
  users: DeviceUserRow[];
};

@Injectable()
export class DeviceDirectorySyncService {
  private readonly logger = new Logger(DeviceDirectorySyncService.name);
  private chain: Promise<void> = Promise.resolve();
  private cycles = 0;
  private manualRowSync: {
    succeeded: boolean;
    paceBlock: DevicePaceError | null;
  } | null = null;
  private readonly slotPresent = new Set<string>();
  private readonly slotAbsent = new Set<string>();
  private readonly knownSlots = new Map<string, Set<number>>();
  private readonly scannedSlots = new Set<string>();
  private progress: DirectoryProgress = idleProgress();
  private insideBulk = false;
  private readonly urgent: Array<() => Promise<void>> = [];
  private haltedDevices = new Set<string>();
  private readonly listedUsers = new Map<string, DeviceUserRow[]>();
  private readonly filledThisCycle = new Set<string>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly devices: DeviceDirectoryClient,
    private readonly pace: DevicePace = new DevicePace(),
  ) {}

  async pushAssignedCard(
    tenantId: string,
    employee: {
      id: string;
      employeeCode: string;
      firstName: string;
      lastName: string;
      cardNumber: string;
    },
  ): Promise<"PUSHED" | "PENDING"> {
    const enrollId = enrollIdFromNik(employee.employeeCode);
    const card = employee.cardNumber.trim();
    if (!enrollId || !/^[0-9]+$/.test(card) || card === "0") return "PENDING";
    const devices = (await this.prisma.attendanceDevice.findMany({
      where: {
        tenantId,
        active: true,
        deletedAt: null,
        NOT: { webPassword: null },
      },
    })) as LiveDevice[];
    const live = devices.filter(
      (device) =>
        device.host.trim() && device.webPassword.trim() && device.webPort > 0,
    );
    if (live.length === 0) return "PENDING";
    const snapshots = await this.prisma.attendanceDeviceDirectory.findMany({
      where: { tenantId, nik: enrollId },
      select: { deviceId: true, card: true },
    });
    const cardByDevice = new Map(
      snapshots.map((row) => [row.deviceId, row.card.trim()]),
    );
    const name = deviceName(employee.firstName, employee.lastName) || enrollId;
    let wrote = 0;
    for (const device of live) {
      const current = cardByDevice.get(device.id) ?? "";
      if (current && current !== "0" && current !== card) continue;
      if (current === card) {
        wrote += 1;
        continue;
      }
      try {
        await this.devices.setUser(
          device.id,
          "manual",
          {
            host: device.host,
            webPort: device.webPort,
            password: device.webPassword,
          },
          {
            enrollid: enrollId,
            name,
            card: cardValue(card),
          },
        );
        await this.prisma.attendanceDeviceDirectory.upsert({
          where: { deviceId_nik: { deviceId: device.id, nik: enrollId } },
          create: {
            tenantId,
            deviceId: device.id,
            nik: enrollId,
            name,
            card,
            face: 0,
            fingerprint: 0,
            slots: "",
            seenAt: new Date(),
          },
          update: { name, card, seenAt: new Date() },
        });
        wrote += 1;
      } catch (error) {
        this.logger.warn(
          `Kartu ${enrollId} tidak tertulis di ${device.code}: ${error instanceof Error ? error.message : "DEVICE_OFFLINE"}`,
        );
      }
    }
    if (wrote !== live.length) return "PENDING";
    await this.prisma.employee.updateMany({
      where: {
        id: employee.id,
        tenantId,
        cardPushStatus: CardPushStatus.PENDING,
      },
      data: {
        cardPushStatus: CardPushStatus.PUSHED,
        deviceUid: deviceUid(enrollId),
      },
    });
    return "PUSHED";
  }

  async shareNewFace(
    tenantId: string,
    enrollId: string,
    sourceDeviceId: string,
  ): Promise<string[]> {
    const templates = await this.prisma.attendanceBiometricTemplate.findMany({
      where: { tenantId, nik: enrollId, slot: { in: FACE_SLOTS } },
      select: { slot: true, record: true },
    });
    const photo = templates.find(
      (row) => row.slot === 50 && isFacePhoto(row.record),
    );
    if (!photo) return [];
    const devices = (await this.prisma.attendanceDevice.findMany({
      where: {
        tenantId,
        active: true,
        deletedAt: null,
        NOT: { webPassword: null },
      },
    })) as LiveDevice[];
    const snapshots = await this.prisma.attendanceDeviceDirectory.findMany({
      where: { tenantId, nik: enrollId },
      select: { deviceId: true, name: true, card: true, face: true },
    });
    const snapByDevice = new Map(snapshots.map((row) => [row.deviceId, row]));
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: EmployeeStatus.ACTIVE },
      select: {
        employeeCode: true,
        firstName: true,
        lastName: true,
        cardNumber: true,
      },
    });
    const employee = employees.find(
      (row) => enrollIdFromNik(row.employeeCode) === enrollId,
    );
    const card = employee?.cardNumber?.trim() ?? "";
    const name =
      (employee ? deviceName(employee.firstName, employee.lastName) : "") ||
      enrollId;
    const written: string[] = [];
    for (const device of devices) {
      if (device.id === sourceDeviceId) continue;
      if (
        !device.host.trim() ||
        !device.webPassword.trim() ||
        device.webPort < 1
      )
        continue;
      const snap = snapByDevice.get(device.id);
      if ((snap?.face ?? 0) > 0) continue;
      const endpoint = {
        host: device.host,
        webPort: device.webPort,
        password: device.webPassword,
      };
      const currentCard = snap?.card?.trim() ?? "";
      const canWriteCard =
        /^[0-9]+$/.test(card) &&
        card !== "0" &&
        currentCard !== card &&
        (!currentCard || currentCard === "0");
      if (canWriteCard) {
        try {
          await this.devices.setUser(device.id, "auto", endpoint, {
            enrollid: enrollId,
            name,
            card: cardValue(card),
          });
        } catch (error) {
          this.logger.warn(
            `Wajah ${enrollId} tidak disalin ke ${device.code}: ${error instanceof Error ? error.message : "DEVICE_OFFLINE"}`,
          );
          continue;
        }
      }
      try {
        const stored = await this.devices.setBackup(
          device.id,
          "auto",
          endpoint,
          {
            enrollid: enrollId,
            name: snap?.name || name,
            backupnum: 50,
            record: photo.record,
          },
        );
        if (!stored) {
          this.logger.warn(`Wajah ${enrollId} ditolak mesin ${device.code}`);
          continue;
        }
        const checked = await this.devices.getUser(
          device.id,
          "auto",
          endpoint,
          enrollId,
        );
        if ((checked.face ?? 0) !== 1) {
          this.logger.warn(
            `Wajah ${enrollId} belum terdaftar di ${device.code}`,
          );
          continue;
        }
        await this.prisma.attendanceDeviceDirectory.upsert({
          where: { deviceId_nik: { deviceId: device.id, nik: enrollId } },
          create: {
            tenantId,
            deviceId: device.id,
            nik: enrollId,
            name,
            card: currentCard && currentCard !== "0" ? currentCard : card,
            face: 1,
            fingerprint: 0,
            slots: "50",
            seenAt: new Date(),
          },
          update: {
            name,
            face: 1,
            fingerprint: 0,
            slots: "50",
            seenAt: new Date(),
            ...(currentCard && currentCard !== "0" ? {} : { card }),
          },
        });
        written.push(device.code);
      } catch (error) {
        this.logger.warn(
          `Wajah ${enrollId} tidak disalin ke ${device.code}: ${error instanceof Error ? error.message : "DEVICE_OFFLINE"}`,
        );
      }
    }
    return written;
  }

  syncOnce(): Promise<void> {
    const run = this.chain.then(() => this.syncAll());
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async syncAll() {
    const rows = (await this.prisma.attendanceDevice.findMany({
      where: { active: true, deletedAt: null, NOT: { webPassword: null } },
    })) as LiveDevice[];
    const byTenant = new Map<string, LiveDevice[]>();
    for (const row of rows) {
      if (!row.host.trim() || !row.webPassword.trim() || row.webPort < 1)
        continue;
      const list = byTenant.get(row.tenantId) ?? [];
      list.push(row);
      byTenant.set(row.tenantId, list);
    }
    for (const [tenantId, devices] of byTenant) {
      try {
        await this.syncTenant(tenantId, devices);
      } catch (error) {
        this.logger.warn(
          error instanceof Error ? error.message : "DIRECTORY_SYNC_FAILED",
        );
      }
    }
  }

  private async syncTenant(tenantId: string, devices: LiveDevice[]) {
    this.insideBulk = true;
    this.progress = { ...idleProgress(), running: true, phase: "listing" };
    try {
      await this.syncTenantBody(tenantId, devices);
    } finally {
      await this.drainUrgent();
      this.insideBulk = false;
      this.progress = idleProgress();
    }
  }

  private async syncTenantBody(tenantId: string, devices: LiveDevice[]) {
    this.haltedDevices = new Set<string>();
    this.filledThisCycle.clear();
    const online: OnlineDevice[] = [];
    let listedThisCycle = false;
    for (const device of devices) {
      if (this.haltedDevices.has(device.id)) continue;
      if (this.isPaceBlocked(device.id, "auto")) continue;
      const endpoint = {
        host: device.host,
        webPort: device.webPort,
        password: device.webPassword,
      };
      if (await this.recentlyListed(device.id)) {
        const users =
          this.listedUsers.get(device.id) ??
          (await this.usersFromSnapshot(device.id));
        if (users.length > 0) online.push({ device, endpoint, users });
        continue;
      }
      try {
        const started = this.pace.now();
        const users = await this.devices.listUsers(device.id, "auto", endpoint);
        this.pace.noteListed(device.id);
        this.listedUsers.set(device.id, users);
        if (this.pace.markIfSlow(device.id, started)) {
          this.haltedDevices.add(device.id);
          continue;
        }
        listedThisCycle = true;
        online.push({ device, endpoint, users });
      } catch (error) {
        if (this.handleDeviceFault(device.id, error)) continue;
      }
    }
    if (online.length === 0) return;
    await this.rememberDirectory(tenantId, online);
    await this.ingestFromDevices(tenantId, online);

    const employees = await this.prisma.employee.findMany({
      where: {
        tenantId,
        status: EmployeeStatus.ACTIVE,
        cardNumber: { not: null },
      },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        cardNumber: true,
        cardPushStatus: true,
      },
    });
    const allowed = new Set<string>();
    for (const employee of employees) {
      const enrollId = enrollIdFromNik(employee.employeeCode);
      const card = employee.cardNumber?.trim() ?? "";
      if (!enrollId || !/^[0-9]+$/.test(card) || card === "0") continue;
      allowed.add(enrollId);
      await this.drainUrgent();
      let wroteAll = true;
      for (const link of online) {
        if (this.haltedDevices.has(link.device.id)) continue;
        try {
          const existing = link.users.find(
            (user) => user.enrollId === enrollId,
          );
          if (existing && existing.card === card) continue;
          const occupied = link.users.some(
            (user) =>
              user.enrollId !== enrollId &&
              user.card === card &&
              user.card !== "0" &&
              user.card !== "",
          );
          const filled = Boolean(
            existing && existing.card && existing.card !== "0",
          );
          if (occupied || filled) {
            wroteAll = false;
            continue;
          }
          const name =
            deviceName(employee.firstName, employee.lastName) || enrollId;
          await this.devices.setUser(link.device.id, "auto", link.endpoint, {
            enrollid: enrollId,
            name,
            card: cardValue(card),
          });
          const written = await this.devices.getUser(
            link.device.id,
            "auto",
            link.endpoint,
            enrollId,
          );
          if (written.card !== card) {
            wroteAll = false;
            continue;
          }
          if (existing) existing.card = card;
          else
            link.users.push({ enrollId, name, card, face: 0, fingerprint: 0 });
        } catch {
          wroteAll = false;
        }
      }
      if (wroteAll && employee.cardPushStatus === CardPushStatus.PENDING) {
        await this.prisma.employee.updateMany({
          where: {
            id: employee.id,
            tenantId,
            cardPushStatus: CardPushStatus.PENDING,
          },
          data: {
            cardPushStatus: CardPushStatus.PUSHED,
            deviceUid: deviceUid(enrollId),
          },
        });
      }
    }

    const mirror = new Set(allowed);
    for (const link of online) {
      for (const user of link.users) {
        const enrollId = user.enrollId.trim();
        if (/^[0-9]+$/.test(enrollId)) mirror.add(enrollId);
      }
    }
    const storedNiks = await this.prisma.attendanceBiometricTemplate.findMany({
      where: { tenantId, slot: { in: FACE_SLOTS } },
      select: { nik: true },
      distinct: ["nik"],
    });
    for (const row of storedNiks) mirror.add(row.nik);
    if (listedThisCycle) return;
    await this.copyBiometrics(tenantId, online, mirror);
    await this.rememberDirectory(tenantId, online);
    await this.saveDeviceSlots(online);
    await this.applyManualRemovals(tenantId);
  }

  private async ingestFromDevices(tenantId: string, online: OnlineDevice[]) {
    this.cycles += 1;
    const full = this.cycles % FULL_SCAN_EVERY === 1;
    if (full) {
      this.slotPresent.clear();
      this.slotAbsent.clear();
    }
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: EmployeeStatus.ACTIVE },
      select: { id: true, employeeCode: true, cardNumber: true },
    });
    const byNik = new Map<string, { id: string; cardNumber: string | null }>();
    const cardsInUse = new Set<string>();
    for (const employee of employees) {
      const enrollId = enrollIdFromNik(employee.employeeCode);
      const card = employee.cardNumber?.trim() ?? "";
      if (enrollId)
        byNik.set(enrollId, { id: employee.id, cardNumber: card || null });
      if (/^[0-9]+$/.test(card) && card !== "0") cardsInUse.add(card);
    }
    const stored = await this.prisma.attendanceBiometricTemplate.findMany({
      where: { tenantId },
      select: { nik: true, slot: true, record: true },
    });
    const backup = new Map(
      stored.map((row) => [`${row.nik}:${row.slot}`, row.record]),
    );

    for (const link of online) {
      const resumeAfter = this.pace.resumeAfter(link.device.id);
      const cycleUsers = this.usersAfterResume(link.users, resumeAfter);
      let finishedAll = cycleUsers.length > 0;
      let checked = 0;
      for (const user of cycleUsers) {
        const enrollId = user.enrollId.trim();
        if (!/^[0-9]+$/.test(enrollId)) continue;
        if (this.haltedDevices.has(link.device.id)) {
          finishedAll = false;
          break;
        }
        checked += 1;
        this.progress = {
          running: true,
          phase: "templates",
          deviceCode: link.device.code,
          users: link.users.length,
          checked,
        };
        await this.importCard(
          link,
          enrollId,
          user.card.trim(),
          byNik,
          cardsInUse,
        );
        this.markListedSlots(link, enrollId, user, backup);
        let deviceDown = false;
        for (const slot of this.slotsToRead(user, enrollId, backup)) {
          await this.drainUrgent();
          if (this.haltedDevices.has(link.device.id)) {
            deviceDown = true;
            finishedAll = false;
            break;
          }
          const key = this.slotKey(link.device.id, enrollId, slot);
          if (
            !full &&
            (this.slotPresent.has(key) || this.slotAbsent.has(key)) &&
            backup.has(`${enrollId}:${slot}`)
          )
            continue;
          try {
            const template = await this.devices.getBackup(
              link.device.id,
              "auto",
              link.endpoint,
              enrollId,
              slot,
            );
            this.rememberSlot(
              link.device.id,
              enrollId,
              slot,
              Boolean(template),
            );
            if (template)
              await this.saveTemplate(
                tenantId,
                enrollId,
                slot,
                template,
                link.device.id,
                backup,
              );
          } catch (error) {
            if (this.handleDeviceFault(link.device.id, error)) {
              deviceDown = true;
              finishedAll = false;
              break;
            }
          }
        }
        if (deviceDown) break;
        this.pace.setResumeAfter(link.device.id, enrollId);
        this.scannedSlots.add(`${link.device.id}:${enrollId}`);
      }
      if (
        finishedAll &&
        cycleUsers.length > 0 &&
        !this.haltedDevices.has(link.device.id)
      ) {
        this.pace.setResumeAfter(link.device.id, "");
      }
    }
  }

  private async recentlyListed(deviceId: string): Promise<boolean> {
    if (this.pace.listBlocked(deviceId)) return true;
    const latest = await this.prisma.attendanceDeviceDirectory.findFirst({
      where: { deviceId },
      orderBy: { seenAt: "desc" },
      select: { seenAt: true },
    });
    if (!latest || Date.now() - latest.seenAt.getTime() >= 10 * 60 * 1000)
      return false;
    this.pace.noteListed(deviceId);
    return true;
  }

  private async usersFromSnapshot(deviceId: string): Promise<DeviceUserRow[]> {
    const rows = await this.prisma.attendanceDeviceDirectory.findMany({
      where: { deviceId },
      select: { nik: true, name: true, card: true, face: true },
    });
    const users = rows
      .filter((row) => row.nik.trim())
      .map((row) => ({
        enrollId: row.nik.trim(),
        name: row.name,
        card: row.card,
        face: row.face,
        fingerprint: 0,
      }));
    this.listedUsers.set(deviceId, users);
    return users;
  }

  private async importCard(
    link: OnlineDevice,
    enrollId: string,
    card: string,
    byNik: Map<string, { id: string; cardNumber: string | null }>,
    cardsInUse: Set<string>,
  ) {
    if (!/^[0-9]+$/.test(card) || card === "0") return;
    const employee = byNik.get(enrollId);
    if (!employee || employee.cardNumber) return;
    if (cardsInUse.has(card)) return;
    await this.prisma.employee.update({
      where: { id: employee.id },
      data: {
        cardNumber: card,
        cardAssignedAt: new Date(),
        cardPushStatus: CardPushStatus.PUSHED,
        deviceUid: deviceUid(enrollId),
      },
    });
    if (employee.cardNumber) cardsInUse.delete(employee.cardNumber);
    cardsInUse.add(card);
    employee.cardNumber = card;
  }

  private async copyBiometrics(
    tenantId: string,
    online: OnlineDevice[],
    allowed: Set<string>,
  ) {
    const full = false;
    const rows = await this.prisma.attendanceBiometricTemplate.findMany({
      where: { tenantId, nik: { in: [...allowed] }, slot: { in: FACE_SLOTS } },
      select: { nik: true, slot: true, record: true },
    });
    const backup = new Map(
      rows.map((row) => [`${row.nik}:${row.slot}`, row.record]),
    );
    const enrollIds = [...allowed];
    let copied = 0;
    for (const enrollId of enrollIds) {
      copied += 1;
      this.progress = {
        running: true,
        phase: "filling",
        deviceCode: "",
        users: enrollIds.length,
        checked: copied,
      };
      await this.drainUrgent();
      const holders = online.filter((link) =>
        link.users.some((user) => user.enrollId === enrollId),
      );
      if (holders.length === 0 && !this.hasStoredTemplate(backup, enrollId))
        continue;
      for (const target of online) {
        if (this.haltedDevices.has(target.device.id)) continue;
        if (holders.some((link) => link.device.id === target.device.id))
          continue;
        try {
          const profile =
            holders.length > 0
              ? await this.devices.getUser(
                  holders[0].device.id,
                  "auto",
                  holders[0].endpoint,
                  enrollId,
                )
              : null;
          const profileCard =
            profile?.card && profile.card !== "0" ? profile.card : "";
          const occupied = profileCard
            ? target.users.some(
                (user) =>
                  user.card === profileCard &&
                  user.card !== "0" &&
                  user.card !== "",
              )
            : false;
          if (occupied) continue;
          await this.devices.setUser(
            target.device.id,
            "auto",
            target.endpoint,
            {
              enrollid: enrollId,
              name: profile?.name || enrollId,
              card: profileCard ? cardValue(profileCard) : 0,
            },
          );
          target.users.push({
            enrollId,
            name: profile?.name || enrollId,
            card: profile?.card || "0",
            face: profile?.face ?? 0,
            fingerprint: 0,
          });
        } catch {
          // User tujuan gagal dibuat. Slot biometrik dilewati pada putaran ini.
        }
      }
      for (const slot of BIO_SLOTS) {
        await this.copySlot(tenantId, online, enrollId, slot, full, backup);
      }
      for (const link of online)
        this.scannedSlots.add(`${link.device.id}:${enrollId}`);
    }
  }

  private async copySlot(
    tenantId: string,
    online: OnlineDevice[],
    enrollId: string,
    slot: number,
    full: boolean,
    backup: Map<string, string>,
  ) {
    const saved = backup.get(`${enrollId}:${slot}`) ?? "";
    if (full) {
      await this.discoverSlot(tenantId, online, enrollId, slot, backup);
      return;
    }
    if (!saved) return;
    const targets = online.filter(
      (link) =>
        this.slotAbsent.has(this.slotKey(link.device.id, enrollId, slot)) &&
        !this.haltedDevices.has(link.device.id) &&
        !this.filledThisCycle.has(link.device.id),
    );
    if (targets.length === 0) return;
    const wrote = await this.writeTemplate(
      targets,
      enrollId,
      slot,
      saved,
      null,
      false,
    );
    for (const link of targets) {
      if (!wrote.includes(link.device.id)) continue;
      this.filledThisCycle.add(link.device.id);
      const user = link.users.find((row) => row.enrollId.trim() === enrollId);
      if (!user) continue;
      if (slot === 51) user.face = Math.max(user.face ?? 0, 1);
    }
  }

  private async discoverSlot(
    tenantId: string,
    online: OnlineDevice[],
    enrollId: string,
    slot: number,
    backup: Map<string, string>,
  ) {
    let record = backup.get(`${enrollId}:${slot}`) ?? "";
    let source: OnlineDevice | null = null;
    const missing: OnlineDevice[] = [];
    for (const link of online) {
      await this.drainUrgent();
      if (this.haltedDevices.has(link.device.id)) continue;
      try {
        const template = await this.devices.getBackup(
          link.device.id,
          "auto",
          link.endpoint,
          enrollId,
          slot,
        );
        this.rememberSlot(link.device.id, enrollId, slot, Boolean(template));
        if (template) {
          await this.saveTemplate(
            tenantId,
            enrollId,
            slot,
            template,
            link.device.id,
            backup,
          );
          if (!record) {
            record = template;
            source = link;
          }
        } else {
          missing.push(link);
        }
      } catch (error) {
        if (this.handleDeviceFault(link.device.id, error)) continue;
      }
    }
    if (!record) return;
    await this.writeTemplate(missing, enrollId, slot, record, source, false);
  }

  private async saveTemplate(
    tenantId: string,
    nik: string,
    slot: number,
    record: string,
    sourceDeviceId: string,
    backup: Map<string, string>,
  ) {
    const key = `${nik}:${slot}`;
    if (backup.has(key)) return;
    await this.prisma.attendanceBiometricTemplate.upsert({
      where: { tenantId_nik_slot: { tenantId, nik, slot } },
      create: { tenantId, nik, slot, record, sourceDeviceId },
      update: { record, sourceDeviceId },
    });
    backup.set(key, record);
  }

  private async writeTemplate(
    targets: OnlineDevice[],
    enrollId: string,
    slot: number,
    record: string,
    source: OnlineDevice | null,
    verify = true,
    touched?: Set<string>,
    kind: PaceKind = "auto",
  ): Promise<string[]> {
    const written: string[] = [];
    for (const target of targets) {
      if (this.haltedDevices.has(target.device.id)) continue;
      if (source && target.device.id === source.device.id) continue;
      const name =
        source?.users.find((user) => user.enrollId === enrollId)?.name ||
        target.users.find((user) => user.enrollId === enrollId)?.name ||
        enrollId;
      try {
        if (kind === "manual") this.pace.armManual(target.device.id);
        if (slot <= 9) continue;
        const stored = await this.devices.setBackup(
          target.device.id,
          kind,
          target.endpoint,
          {
            enrollid: enrollId,
            name,
            backupnum: slot,
            record,
          },
        );
        if (kind === "manual" && stored) this.noteManualSuccess();
        if (!stored) continue;
        touched?.add(target.device.id);
        if (!verify) {
          this.rememberSlot(target.device.id, enrollId, slot, true);
          written.push(target.device.id);
          continue;
        }
        if (kind === "manual") this.pace.armManual(target.device.id);
        const check = await this.devices.getBackup(
          target.device.id,
          kind,
          target.endpoint,
          enrollId,
          slot,
        );
        if (kind === "manual") this.noteManualSuccess();
        touched?.add(target.device.id);
        this.rememberSlot(target.device.id, enrollId, slot, Boolean(check));
        if (!check)
          this.logger.warn(
            `Template ${enrollId} slot ${slot} tidak menetap di ${target.device.code}`,
          );
        else written.push(target.device.id);
      } catch (error) {
        this.noteManualPaceError(error);
        this.logger.warn(
          error instanceof Error ? error.message : "BIO_COPY_FAILED",
        );
      }
    }
    return written;
  }

  private hasStoredTemplate(backup: Map<string, string>, enrollId: string) {
    const prefix = `${enrollId}:`;
    for (const key of backup.keys()) {
      if (key.startsWith(prefix)) return true;
    }
    return false;
  }

  private rememberSlot(
    deviceId: string,
    enrollId: string,
    slot: number,
    filled: boolean,
  ) {
    const key = this.slotKey(deviceId, enrollId, slot);
    const id = `${deviceId}:${enrollId}`;
    const present = this.knownSlots.get(id) ?? new Set<number>();
    if (filled) present.add(slot);
    else present.delete(slot);
    this.knownSlots.set(id, present);
    if (filled) {
      this.slotPresent.add(key);
      this.slotAbsent.delete(key);
      return;
    }
    this.slotAbsent.add(key);
    this.slotPresent.delete(key);
  }

  private slotKey(deviceId: string, enrollId: string, slot: number) {
    return `${deviceId}:${enrollId}:${slot}`;
  }

  async importFacePhoto(
    tenantId: string,
    nik: string,
    record: string,
  ): Promise<{ nik: string; stored: boolean }> {
    const enrollId = enrollIdFromNik(nik);
    if (!enrollId) throw new BadRequestException("NIK_INVALID");
    const photo = record.trim();
    if (!isFacePhoto(photo) || photo.length > 180_000)
      throw new BadRequestException("FACE_PHOTO_INVALID");
    await this.prisma.attendanceBiometricTemplate.upsert({
      where: { tenantId_nik_slot: { tenantId, nik: enrollId, slot: 50 } },
      create: { tenantId, nik: enrollId, slot: 50, record: photo },
      update: { record: photo },
    });
    return { nik: enrollId, stored: true };
  }

  async importDeviceUsers(
    tenantId: string,
    entries: Array<{
      deviceCode: string;
      users: Array<{
        nik: string;
        name?: string;
        card?: string;
        face?: number;
      }>;
    }>,
  ): Promise<{
    devices: Array<{
      deviceCode: string;
      stored: number;
      error: string | null;
    }>;
  }> {
    const known = await this.prisma.attendanceDevice.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, code: true },
    });
    const byCode = new Map(known.map((device) => [device.code, device]));
    const seenAt = new Date();
    const devices: Array<{
      deviceCode: string;
      stored: number;
      error: string | null;
    }> = [];
    for (const entry of entries) {
      const code = entry.deviceCode.trim();
      const device = byCode.get(code);
      if (!device) {
        devices.push({ deviceCode: code, stored: 0, error: "DEVICE_UNKNOWN" });
        continue;
      }
      const niks: string[] = [];
      for (const user of entry.users) {
        const nik = user.nik.trim();
        if (!nik) continue;
        niks.push(nik);
        const face =
          user.face === undefined
            ? undefined
            : Math.max(0, Math.floor(user.face));
        await this.prisma.attendanceDeviceDirectory.upsert({
          where: { deviceId_nik: { deviceId: device.id, nik } },
          create: {
            tenantId,
            deviceId: device.id,
            nik,
            name: user.name?.trim() ?? "",
            card: user.card?.trim() ?? "",
            face: face ?? 0,
            fingerprint: 0,
            seenAt,
          },
          update: {
            name: user.name?.trim() ?? "",
            card: user.card?.trim() ?? "",
            ...(face === undefined ? {} : { face }),
            fingerprint: 0,
            seenAt,
          },
        });
      }
      await this.prisma.attendanceDeviceDirectory.deleteMany({
        where: {
          deviceId: device.id,
          ...(niks.length > 0 ? { nik: { notIn: niks } } : {}),
        },
      });
      devices.push({
        deviceCode: device.code,
        stored: niks.length,
        error: null,
      });
    }
    return { devices };
  }

  async renameDirectoryUsers(
    tenantId: string,
    updates: Array<{ deviceCode: string; nik: string; name: string }>,
  ): Promise<{ stored: number }> {
    const known = await this.prisma.attendanceDevice.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, code: true },
    });
    const byCode = new Map(known.map((device) => [device.code, device]));
    let stored = 0;
    for (const update of updates) {
      const device = byCode.get(update.deviceCode.trim());
      const nik = update.nik.trim();
      const name = update.name.trim().slice(0, 24);
      if (!device || !nik || !name) continue;
      const result = await this.prisma.attendanceDeviceDirectory.updateMany({
        where: { deviceId: device.id, nik },
        data: { name },
      });
      stored += result.count;
    }
    return { stored };
  }

  async directory(
    tenantId: string,
    query?: {
      search?: string;
      departmentId?: string;
      page?: string;
      pageSize?: string;
      missingFace?: string;
      missingFinger?: string;
      differs?: string;
      probe?: string;
    },
  ) {
    if (query?.probe === "1") {
      const latest = await this.prisma.attendanceDeviceDirectory.findFirst({
        where: { tenantId },
        orderBy: { seenAt: "desc" },
        select: { seenAt: true },
      });
      return {
        devices: [],
        items: [],
        total: 0,
        page: 1,
        pageSize: 1,
        seenAt: latest?.seenAt ?? null,
        progress: this.progress,
        quiet: [],
      };
    }
    if (query?.departmentId) {
      const department = await this.prisma.department.findFirst({
        where: { id: query.departmentId, tenantId },
        select: { id: true },
      });
      if (!department)
        throw new BadRequestException("DEPARTMENT_NOT_IN_COMPANY");
    }
    const devices = await this.prisma.attendanceDevice.findMany({
      where: { tenantId, deletedAt: null },
      select: { id: true, code: true, host: true, active: true },
      orderBy: { code: "asc" },
    });
    const snapshots = await this.prisma.attendanceDeviceDirectory.findMany({
      where: { tenantId },
    });
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: EmployeeStatus.ACTIVE },
      select: {
        id: true,
        employeeCode: true,
        firstName: true,
        lastName: true,
        cardNumber: true,
        department: { select: { id: true, name: true } },
      },
    });
    const templates = await this.prisma.attendanceBiometricTemplate.findMany({
      where: { tenantId, slot: { in: FACE_SLOTS } },
      select: { nik: true, slot: true },
    });
    const removals = await this.prisma.attendanceSyncRemoval.findMany({
      where: { tenantId },
      select: { nik: true },
    });
    const slotsByNik = new Map<string, number[]>();
    for (const row of templates) {
      const list = slotsByNik.get(row.nik) ?? [];
      list.push(row.slot);
      slotsByNik.set(row.nik, list);
    }
    const removalNiks = new Set(removals.map((row) => row.nik));
    type Cell = {
      present: boolean;
      name: string;
      card: string;
      face: number;
      fingerprint: number;
      slots: number[];
      slotsRead: boolean;
    };
    type Row = {
      nik: string;
      employeeId: string | null;
      department: { id: string; name: string } | null;
      serverName: string;
      serverCard: string;
      serverSlots: number[];
      pendingRemoval: boolean;
      devices: Record<string, Cell>;
    };
    const byNik = new Map<string, Row>();
    const ensure = (nik: string) => {
      let row = byNik.get(nik);
      if (!row) {
        row = {
          nik,
          employeeId: null,
          department: null,
          serverName: "",
          serverCard: "",
          serverSlots: [...(slotsByNik.get(nik) ?? [])].sort((a, b) => a - b),
          pendingRemoval: removalNiks.has(nik),
          devices: {},
        };
        byNik.set(nik, row);
      }
      return row;
    };
    for (const employee of employees) {
      const enrollId = enrollIdFromNik(employee.employeeCode);
      const card = employee.cardNumber?.trim() ?? "";
      const slots = slotsByNik.get(enrollId ?? "") ?? [];
      if (!enrollId || (!card && slots.length === 0)) continue;
      const row = ensure(enrollId);
      row.employeeId = employee.id;
      row.department = employee.department;
      row.serverName = deviceName(employee.firstName, employee.lastName);
      row.serverCard = card;
    }
    let seenAt: Date | null = null;
    for (const snap of snapshots) {
      const nik = snap.nik.trim();
      if (!nik) continue;
      const row = ensure(nik);
      row.devices[snap.deviceId] = {
        present: true,
        name: snap.name,
        card: snap.card,
        face: snap.face,
        fingerprint: 0,
        slots: parseSlots(snap.slots).filter(faceSlot),
        slotsRead: snap.slotsRead,
      };
      if (!seenAt || snap.seenAt > seenAt) seenAt = snap.seenAt;
    }
    const rows = [...byNik.values()].sort((left, right) =>
      left.nik.localeCompare(right.nik, "en", { numeric: true }),
    );
    const page = parsePageQuery(query);
    const filtered = rows.filter((row) => {
      if (query?.departmentId && row.department?.id !== query.departmentId)
        return false;
      if (
        !matchesBioStatus(
          {
            serverCard: row.serverCard,
            serverSlots: row.serverSlots,
            devices: row.devices,
          },
          query,
        )
      ) {
        return false;
      }
      return matchesNameNik(
        {
          code: row.nik,
          names: [
            row.serverName,
            ...Object.values(row.devices).map((cell) => cell.name),
          ],
        },
        query?.search,
      );
    });
    return {
      devices,
      items: filtered.slice(page.skip, page.skip + page.pageSize),
      total: filtered.length,
      page: page.page,
      pageSize: page.pageSize,
      seenAt,
      progress: this.progress,
      quiet: [],
    };
  }

  async syncRow(
    tenantId: string,
    nik: string,
  ): Promise<{
    nik: string;
    pausedUntil: string | null;
    reason: "QUIET" | "MANUAL_USED" | "NOT_COPIED" | null;
  }> {
    const enrollId = enrollIdFromNik(nik);
    if (!enrollId) throw new BadRequestException("NIK_INVALID");
    if (this.insideBulk) {
      return new Promise((resolve, reject) => {
        this.urgent.push(async () => {
          try {
            const blocked = await this.previewSyncRow(tenantId);
            if (blocked) {
              resolve({ nik: enrollId, ...blocked });
              return;
            }
            resolve(await this.syncRowNow(tenantId, enrollId));
          } catch (error) {
            reject(error);
          }
        });
      });
    }
    const blocked = await this.previewSyncRow(tenantId);
    if (blocked) return { nik: enrollId, ...blocked };
    const run = this.chain.then(() => this.syncRowNow(tenantId, enrollId));
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  removeOne(
    tenantId: string,
    nik: string,
    devicesCleared = false,
  ): Promise<{ nik: string; pending: boolean }> {
    const enrollId = enrollIdFromNik(nik);
    if (!enrollId) throw new BadRequestException("NIK_INVALID");
    const run = this.chain.then(() =>
      this.removeNow(tenantId, enrollId, devicesCleared),
    );
    this.chain = run.then(
      () => undefined,
      () => undefined,
    );
    return run;
  }

  private async syncRowNow(
    tenantId: string,
    enrollId: string,
  ): Promise<{
    nik: string;
    pausedUntil: string | null;
    reason: "QUIET" | "MANUAL_USED" | "NOT_COPIED" | null;
  }> {
    const nested = this.insideBulk;
    const previous = this.progress;
    const touched = new Set<string>();
    this.manualRowSync = { succeeded: false, paceBlock: null };
    this.progress = {
      running: true,
      phase: "listing",
      deviceCode: enrollId,
      users: 1,
      checked: 0,
    };
    let result: {
      nik: string;
      pausedUntil: string | null;
      reason: "QUIET" | "MANUAL_USED" | "NOT_COPIED" | null;
    } = {
      nik: enrollId,
      pausedUntil: null,
      reason: null,
    };
    let tracker: {
      succeeded: boolean;
      paceBlock: DevicePaceError | null;
    } | null = null;
    try {
      const devices = (await this.prisma.attendanceDevice.findMany({
        where: {
          tenantId,
          active: true,
          deletedAt: null,
          NOT: { webPassword: null },
        },
      })) as LiveDevice[];
      const snapshots = await this.prisma.attendanceDeviceDirectory.findMany({
        where: { tenantId, nik: enrollId },
        select: { deviceId: true, name: true, card: true, face: true },
      });
      const snapByDevice = new Map(snapshots.map((row) => [row.deviceId, row]));
      const online: OnlineDevice[] = [];
      for (const device of devices) {
        if (
          !device.host.trim() ||
          !device.webPassword.trim() ||
          device.webPort < 1
        )
          continue;
        if (this.isPaceBlocked(device.id, "manual")) continue;
        const snap = snapByDevice.get(device.id);
        online.push({
          device,
          endpoint: {
            host: device.host,
            webPort: device.webPort,
            password: device.webPassword,
          },
          users: [
            {
              enrollId,
              name: snap?.name ?? "",
              card: snap?.card ?? "",
              face: snap?.face ?? 0,
              fingerprint: 0,
            },
          ],
        });
      }
      await this.rememberOne(tenantId, enrollId, online);
      await this.importListedCard(tenantId, enrollId, online);
      const employees = await this.prisma.employee.findMany({
        where: {
          tenantId,
          status: EmployeeStatus.ACTIVE,
          cardNumber: { not: null },
        },
        select: {
          id: true,
          employeeCode: true,
          firstName: true,
          lastName: true,
          cardNumber: true,
          cardPushStatus: true,
        },
      });
      const employee = employees.find(
        (row) => enrollIdFromNik(row.employeeCode) === enrollId,
      );
      if (employee) {
        const card = employee.cardNumber?.trim() ?? "";
        if (/^[0-9]+$/.test(card) && card !== "0") {
          const wantedName = deviceName(employee.firstName, employee.lastName);
          for (const link of online) {
            const existing = link.users.find(
              (user) => user.enrollId.trim() === enrollId,
            );
            if (existing && wantedName && existing.name.trim() !== wantedName) {
              const kept =
                existing.card && existing.card !== "0" ? existing.card : card;
              if (/^[0-9]+$/.test(kept) && kept !== "0") {
                try {
                  const live = await this.devices.getUser(
                    link.device.id,
                    "manual",
                    link.endpoint,
                    enrollId,
                  );
                  const liveCard =
                    live.card && live.card !== "0" ? live.card : kept;
                  if (live.name.trim() === wantedName) {
                    existing.name = wantedName;
                    await this.prisma.attendanceDeviceDirectory.updateMany({
                      where: { deviceId: link.device.id, nik: enrollId },
                      data: { name: wantedName },
                    });
                  } else if (/^[0-9]+$/.test(liveCard) && liveCard !== "0") {
                    this.pace.armManual(link.device.id);
                    await this.devices.setUser(
                      link.device.id,
                      "manual",
                      link.endpoint,
                      {
                        enrollid: enrollId,
                        name: wantedName,
                        card: cardValue(liveCard),
                        verifymode: live.verifymode,
                      },
                    );
                    this.noteManualSuccess();
                    existing.name = wantedName;
                    await this.prisma.attendanceDeviceDirectory.updateMany({
                      where: { deviceId: link.device.id, nik: enrollId },
                      data: { name: wantedName },
                    });
                  }
                } catch (error) {
                  this.noteManualPaceError(error);
                }
              }
            }
            if (existing && existing.card === card) continue;
            const occupied = link.users.some(
              (user) =>
                user.enrollId.trim() !== enrollId &&
                user.card === card &&
                user.card !== "0" &&
                user.card !== "",
            );
            const filled = Boolean(
              existing && existing.card && existing.card !== "0",
            );
            if (occupied || filled) continue;
            try {
              const name =
                deviceName(employee.firstName, employee.lastName) || enrollId;
              this.pace.armManual(link.device.id);
              await this.devices.setUser(
                link.device.id,
                "manual",
                link.endpoint,
                { enrollid: enrollId, name, card: cardValue(card) },
              );
              this.noteManualSuccess();
              if (existing) {
                existing.card = card;
                if (!existing.name) existing.name = name;
              } else {
                link.users.push({
                  enrollId,
                  name,
                  card,
                  face: 0,
                  fingerprint: 0,
                });
              }
              touched.add(link.device.id);
            } catch (error) {
              this.noteManualPaceError(error);
              // Slot kartu NIK ini tidak kosong. NIK lain tidak diubah.
            }
          }
        }
      }
      this.progress = {
        running: true,
        phase: "templates",
        deviceCode: enrollId,
        users: 1,
        checked: 0,
      };
      await this.fillOne(tenantId, enrollId, online, touched, "manual");
      this.progress = {
        running: true,
        phase: "templates",
        deviceCode: enrollId,
        users: 1,
        checked: 1,
      };
      await this.rememberOne(tenantId, enrollId, online);
      result = { nik: enrollId, pausedUntil: null, reason: null };
    } finally {
      this.pace.finishManualClick();
      tracker = this.manualRowSync;
      this.manualRowSync = null;
      this.progress = nested ? previous : idleProgress();
    }
    if (
      !tracker?.succeeded &&
      tracker?.paceBlock &&
      tracker.paceBlock.reason !== "QUIET"
    ) {
      return { nik: enrollId, pausedUntil: null, reason: "MANUAL_USED" };
    }
    return result;
  }

  private async drainUrgent() {
    while (this.urgent.length > 0) {
      const job = this.urgent.shift();
      if (job) await job();
    }
  }

  private async importListedCard(
    tenantId: string,
    enrollId: string,
    online: OnlineDevice[],
  ) {
    const employees = await this.prisma.employee.findMany({
      where: { tenantId, status: EmployeeStatus.ACTIVE },
      select: { id: true, employeeCode: true, cardNumber: true },
    });
    const byNik = new Map<string, { id: string; cardNumber: string | null }>();
    const cardsInUse = new Set<string>();
    for (const employee of employees) {
      const code = enrollIdFromNik(employee.employeeCode);
      const card = employee.cardNumber?.trim() ?? "";
      if (code) byNik.set(code, { id: employee.id, cardNumber: card || null });
      if (/^[0-9]+$/.test(card) && card !== "0") cardsInUse.add(card);
    }
    for (const link of online) {
      const user = link.users.find((row) => row.enrollId.trim() === enrollId);
      if (!user) continue;
      await this.importCard(
        link,
        enrollId,
        user.card.trim(),
        byNik,
        cardsInUse,
      );
    }
  }

  private async fillOne(
    tenantId: string,
    enrollId: string,
    online: OnlineDevice[],
    touched?: Set<string>,
    kind: PaceKind = "auto",
  ): Promise<boolean> {
    const rows = await this.prisma.attendanceBiometricTemplate.findMany({
      where: { tenantId, nik: enrollId, slot: { in: FACE_SLOTS } },
      select: { slot: true, record: true },
    });
    const backup = new Map(
      rows.map((row) => [`${enrollId}:${row.slot}`, row.record]),
    );
    if (kind !== "manual") {
      for (const link of online) {
        await this.pullMissing(tenantId, link, enrollId, backup, touched, kind);
      }
    }
    for (const link of online) {
      await this.pushEmpty(link, enrollId, backup, touched, kind);
    }
    return online.some((link) => {
      const user = link.users.find((row) => row.enrollId.trim() === enrollId);
      if (!user) return false;
      const faceMissing =
        (user.face ?? 0) === 0 && backup.has(`${enrollId}:51`);
      return faceMissing;
    });
  }

  private async pullMissing(
    tenantId: string,
    link: OnlineDevice,
    enrollId: string,
    backup: Map<string, string>,
    touched?: Set<string>,
    kind: PaceKind = "auto",
  ) {
    const user = link.users.find((row) => row.enrollId.trim() === enrollId);
    if (!user) return;
    if ((user.face ?? 0) > 0 && !backup.has(`${enrollId}:51`)) {
      await this.readIntoBackup(
        tenantId,
        link,
        enrollId,
        51,
        backup,
        touched,
        kind,
      );
    }
  }

  private async readIntoBackup(
    tenantId: string,
    link: OnlineDevice,
    enrollId: string,
    slot: number,
    backup: Map<string, string>,
    touched?: Set<string>,
    kind: PaceKind = "auto",
  ): Promise<boolean> {
    try {
      if (kind === "manual") this.pace.armManual(link.device.id);
      const template = await this.devices.getBackup(
        link.device.id,
        kind,
        link.endpoint,
        enrollId,
        slot,
      );
      if (kind === "manual") this.noteManualSuccess();
      touched?.add(link.device.id);
      this.rememberSlot(link.device.id, enrollId, slot, Boolean(template));
      if (!template) return false;
      await this.saveTemplate(
        tenantId,
        enrollId,
        slot,
        template,
        link.device.id,
        backup,
      );
      return backup.has(`${enrollId}:${slot}`);
    } catch (error) {
      this.noteManualPaceError(error);
      return false;
    }
  }

  private async pushEmpty(
    link: OnlineDevice,
    enrollId: string,
    backup: Map<string, string>,
    touched?: Set<string>,
    kind: PaceKind = "auto",
  ) {
    const user = link.users.find((row) => row.enrollId.trim() === enrollId);
    if (!user) return;
    if ((user.face ?? 0) === 0) {
      const record = backup.get(`${enrollId}:50`) ?? "";
      if (!isFacePhoto(record)) {
        this.logger.warn(
          `Wajah ${enrollId} tidak dikirim ke ${link.device.code}. Foto pendaftaran belum ada.`,
        );
        return;
      }
      const wrote = await this.writeTemplate(
        [link],
        enrollId,
        50,
        record,
        null,
        false,
        touched,
        kind,
      );
      if (!wrote.includes(link.device.id)) return;
      try {
        const checked = await this.devices.getUser(
          link.device.id,
          kind,
          link.endpoint,
          enrollId,
        );
        if ((checked.face ?? 0) === 1) user.face = 1;
      } catch (error) {
        this.noteManualPaceError(error);
      }
    }
  }

  private markListedSlots(
    link: OnlineDevice,
    enrollId: string,
    user: DeviceUserRow,
    backup: Map<string, string>,
  ) {
    if ((user.face ?? 0) === 0)
      this.rememberSlot(link.device.id, enrollId, 51, false);
    else if (backup.has(`${enrollId}:51`))
      this.rememberSlot(link.device.id, enrollId, 51, true);
  }

  private slotsToRead(
    user: DeviceUserRow,
    enrollId: string,
    backup: Map<string, string>,
  ): number[] {
    if ((user.face ?? 0) > 0 && !backup.has(`${enrollId}:51`)) return [51];
    return [];
  }

  private usersAfterResume(
    users: DeviceUserRow[],
    resumeAfter: string,
  ): DeviceUserRow[] {
    const ordered = [...users]
      .filter((user) => /^[0-9]+$/.test(user.enrollId.trim()))
      .sort((left, right) =>
        left.enrollId.localeCompare(right.enrollId, "en", { numeric: true }),
      );
    if (!resumeAfter) return ordered;
    const index = ordered.findIndex(
      (user) => user.enrollId.trim() === resumeAfter,
    );
    if (index < 0) return ordered;
    return ordered.slice(index + 1);
  }

  private isPaceBlocked(deviceId: string, kind: PaceKind): boolean {
    const decision = this.pace.preview(deviceId, kind);
    return !decision.ok;
  }

  private handleDeviceFault(deviceId: string, error: unknown): boolean {
    if (error instanceof DevicePaceError) {
      if (error.reason === "BUDGET" || error.reason === "QUIET") {
        this.haltedDevices.add(deviceId);
        return true;
      }
      return false;
    }
    if (
      error instanceof ServiceUnavailableException &&
      error.message.includes("DEVICE_OFFLINE")
    ) {
      this.haltedDevices.add(deviceId);
      return true;
    }
    if (this.isOffline(error)) {
      this.haltedDevices.add(deviceId);
      return true;
    }
    return false;
  }

  private async previewSyncRow(
    tenantId: string,
  ): Promise<{
    pausedUntil: string | null;
    reason: "QUIET" | "MANUAL_USED";
  } | null> {
    const devices = (await this.prisma.attendanceDevice.findMany({
      where: {
        tenantId,
        active: true,
        deletedAt: null,
        NOT: { webPassword: null },
      },
    })) as LiveDevice[];
    let live = 0;
    let anyOk = false;
    for (const device of devices) {
      if (
        !device.host.trim() ||
        !device.webPassword.trim() ||
        device.webPort < 1
      )
        continue;
      live += 1;
      const decision = this.pace.preview(device.id, "manual");
      if (decision.ok || decision.reason === "QUIET") {
        anyOk = true;
        continue;
      }
    }
    if (live === 0 || anyOk) return null;
    return { pausedUntil: null, reason: "MANUAL_USED" };
  }

  private noteManualSuccess(): void {
    if (this.manualRowSync) this.manualRowSync.succeeded = true;
  }

  private noteManualPaceError(error: unknown): void {
    if (error instanceof DevicePaceError && this.manualRowSync)
      this.manualRowSync.paceBlock = error;
  }

  private isOffline(error: unknown): boolean {
    return error instanceof Error && error.message.includes("DEVICE_OFFLINE");
  }

  private async rememberOne(
    tenantId: string,
    enrollId: string,
    online: OnlineDevice[],
  ) {
    const seenAt = new Date();
    for (const link of online) {
      const user = link.users.find((row) => row.enrollId.trim() === enrollId);
      if (!user) {
        await this.prisma.attendanceDeviceDirectory.deleteMany({
          where: { deviceId: link.device.id, nik: enrollId },
        });
        continue;
      }
      await this.prisma.attendanceDeviceDirectory.upsert({
        where: { deviceId_nik: { deviceId: link.device.id, nik: enrollId } },
        create: {
          tenantId,
          deviceId: link.device.id,
          nik: enrollId,
          name: user.name.trim(),
          card: user.card.trim(),
          face: user.face ?? 0,
          fingerprint: 0,
          slots: "",
          seenAt,
        },
        update: {
          name: user.name.trim(),
          card: user.card.trim(),
          ...(user.face === undefined ? {} : { face: user.face }),
          fingerprint: 0,
          seenAt,
        },
      });
    }
  }

  private async rememberDirectory(tenantId: string, online: OnlineDevice[]) {
    const seenAt = new Date();
    for (const link of online) {
      const niks: string[] = [];
      for (const user of link.users) {
        const nik = user.enrollId.trim();
        if (!nik) continue;
        niks.push(nik);
        await this.prisma.attendanceDeviceDirectory.upsert({
          where: { deviceId_nik: { deviceId: link.device.id, nik } },
          create: {
            tenantId,
            deviceId: link.device.id,
            nik,
            name: user.name.trim(),
            card: user.card.trim(),
            face: user.face ?? 0,
            fingerprint: 0,
            slots: "",
            seenAt,
          },
          update: {
            name: user.name.trim(),
            card: user.card.trim(),
            face: user.face ?? 0,
            fingerprint: 0,
            seenAt,
          },
        });
      }
      await this.prisma.attendanceDeviceDirectory.deleteMany({
        where: {
          deviceId: link.device.id,
          ...(niks.length > 0 ? { nik: { notIn: niks } } : {}),
        },
      });
    }
  }

  private async saveDeviceSlots(online: OnlineDevice[]) {
    for (const link of online) {
      for (const user of link.users) {
        const nik = user.enrollId.trim();
        const key = `${link.device.id}:${nik}`;
        if (!nik || !this.scannedSlots.has(key)) continue;
        const slots = [...(this.knownSlots.get(key) ?? [])]
          .sort((left, right) => left - right)
          .join(",");
        await this.prisma.attendanceDeviceDirectory.updateMany({
          where: { deviceId: link.device.id, nik },
          data: { slots, slotsRead: true },
        });
      }
    }
  }

  private async applyManualRemovals(tenantId: string) {
    const pending = await this.prisma.attendanceSyncRemoval.findMany({
      where: { tenantId },
    });
    for (const row of pending) {
      await this.removeNow(tenantId, row.nik);
    }
  }

  private async removeNow(
    tenantId: string,
    enrollId: string,
    devicesCleared = false,
  ): Promise<{ nik: string; pending: boolean }> {
    await this.prisma.attendanceSyncRemoval.upsert({
      where: { tenantId_nik: { tenantId, nik: enrollId } },
      create: { tenantId, nik: enrollId },
      update: {},
    });
    await this.prisma.attendanceBiometricTemplate.deleteMany({
      where: { tenantId, nik: enrollId },
    });
    const employees = await this.prisma.employee.findMany({
      where: { tenantId },
      select: { id: true, employeeCode: true },
    });
    const ids = employees
      .filter((employee) => enrollIdFromNik(employee.employeeCode) === enrollId)
      .map((employee) => employee.id);
    if (ids.length > 0) {
      await this.prisma.employee.updateMany({
        where: { id: { in: ids }, tenantId },
        data: {
          cardNumber: null,
          cardAssignedAt: null,
          cardPushStatus: null,
          deviceUid: null,
        },
      });
    }
    if (devicesCleared) {
      await this.prisma.attendanceDeviceDirectory.deleteMany({
        where: { tenantId, nik: enrollId },
      });
      await this.prisma.attendanceSyncRemoval.deleteMany({
        where: { tenantId, nik: enrollId },
      });
      return { nik: enrollId, pending: false };
    }
    const devices = (await this.prisma.attendanceDevice.findMany({
      where: {
        tenantId,
        active: true,
        deletedAt: null,
        NOT: { webPassword: null },
      },
    })) as LiveDevice[];
    let pending = false;
    for (const device of devices) {
      if (
        !device.host.trim() ||
        !device.webPassword.trim() ||
        device.webPort < 1
      )
        continue;
      try {
        const removed = await this.devices.deleteUsers(
          device.id,
          "auto",
          {
            host: device.host,
            webPort: device.webPort,
            password: device.webPassword,
          },
          [enrollId],
        );
        if (!removed) {
          pending = true;
          continue;
        }
        await this.prisma.attendanceDeviceDirectory.deleteMany({
          where: { deviceId: device.id, nik: enrollId },
        });
      } catch {
        pending = true;
      }
    }
    if (!pending) {
      await this.prisma.attendanceSyncRemoval.deleteMany({
        where: { tenantId, nik: enrollId },
      });
    }
    return { nik: enrollId, pending };
  }
}

type DirectoryProgress = {
  running: boolean;
  phase: "idle" | "listing" | "templates" | "filling";
  deviceCode: string;
  users: number;
  checked: number;
};

function formatJakartaHm(date: Date): string {
  const parts = new Intl.DateTimeFormat("id-ID", {
    timeZone: "Asia/Jakarta",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  const hour = parts.find((part) => part.type === "hour")?.value ?? "00";
  const minute = parts.find((part) => part.type === "minute")?.value ?? "00";
  return `${hour.padStart(2, "0")}:${minute.padStart(2, "0")}`;
}

function idleProgress(): DirectoryProgress {
  return {
    running: false,
    phase: "idle",
    deviceCode: "",
    users: 0,
    checked: 0,
  };
}

function isFacePhoto(record: string): boolean {
  return record.startsWith("/9j/") || record.startsWith("data:image/jpeg");
}

function safeFaceRecord(record: string): boolean {
  return record.length >= 4 && record.length <= 100_000;
}

function parseSlots(value: string): number[] {
  if (!value.trim()) return [];
  return value
    .split(",")
    .map((part) => Number(part.trim()))
    .filter((slot) => Number.isInteger(slot));
}

export function enrollIdFromNik(employeeCode: string): string | null {
  const trimmed = employeeCode.trim();
  if (!/^[0-9]+$/.test(trimmed)) return null;
  const stripped = trimmed.replace(/^0+/, "");
  return stripped || null;
}

function deviceName(firstName: string, lastName: string): string {
  return [firstName, lastName]
    .map((part) => part.trim())
    .filter(Boolean)
    .join(" ")
    .slice(0, 24);
}

function cardValue(card: string): number | string {
  const value = BigInt(card);
  if (value <= BigInt(Number.MAX_SAFE_INTEGER)) return Number(value);
  return card;
}

function deviceUid(enrollId: string): number | null {
  const value = Number(enrollId);
  if (!Number.isSafeInteger(value) || value < 1) return null;
  return value;
}
