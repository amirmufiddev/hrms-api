-- AlterEnum
ALTER TYPE "AttendanceSource" ADD VALUE 'DEVICE';

-- CreateEnum
CREATE TYPE "CardPushStatus" AS ENUM ('PENDING', 'PUSHED');
CREATE TYPE "PunchMatchStatus" AS ENUM ('MATCHED', 'UNMATCHED');
CREATE TYPE "PunchVerifyMode" AS ENUM ('CARD', 'FACE', 'FINGER', 'PASSWORD', 'UNKNOWN');

-- AlterTable
ALTER TABLE "employees"
ADD COLUMN "cardNumber" TEXT,
ADD COLUMN "cardAssignedAt" TIMESTAMP(3),
ADD COLUMN "cardPushStatus" "CardPushStatus",
ADD COLUMN "deviceUid" INTEGER;

CREATE UNIQUE INDEX "employees_tenant_card_number_key"
ON "employees" ("tenantId", "cardNumber")
WHERE "cardNumber" IS NOT NULL;

-- CreateTable
CREATE TABLE "attendance_devices" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "serialNumber" TEXT NOT NULL,
    "firmware" TEXT,
    "deviceNumber" INTEGER NOT NULL DEFAULT 1,
    "host" TEXT NOT NULL,
    "branchId" TEXT,
    "lastSeenAt" TIMESTAMP(3),
    "lastPunchAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_devices_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "attendance_punches" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "employeeId" TEXT,
    "punchedAt" TIMESTAMP(3) NOT NULL,
    "verifyMode" "PunchVerifyMode" NOT NULL DEFAULT 'UNKNOWN',
    "deviceState" INTEGER,
    "direction" TEXT NOT NULL,
    "matchStatus" "PunchMatchStatus" NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_punches_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attendance_devices_tenantId_code_key" ON "attendance_devices"("tenantId", "code");
CREATE UNIQUE INDEX "attendance_devices_tenantId_serialNumber_key" ON "attendance_devices"("tenantId", "serialNumber");
CREATE INDEX "attendance_devices_tenantId_idx" ON "attendance_devices"("tenantId");

CREATE UNIQUE INDEX "attendance_punches_deviceId_nik_punchedAt_key" ON "attendance_punches"("deviceId", "nik", "punchedAt");
CREATE INDEX "attendance_punches_tenantId_nik_matchStatus_idx" ON "attendance_punches"("tenantId", "nik", "matchStatus");
CREATE INDEX "attendance_punches_employeeId_punchedAt_idx" ON "attendance_punches"("employeeId", "punchedAt");

ALTER TABLE "attendance_devices" ADD CONSTRAINT "attendance_devices_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_devices" ADD CONSTRAINT "attendance_devices_branchId_fkey" FOREIGN KEY ("branchId") REFERENCES "branches"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "attendance_punches" ADD CONSTRAINT "attendance_punches_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_punches" ADD CONSTRAINT "attendance_punches_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "attendance_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "attendance_punches" ADD CONSTRAINT "attendance_punches_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE SET NULL ON UPDATE CASCADE;
