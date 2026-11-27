-- HRMS — migrasi kartu mesin absen (Postgres)
-- Setara dengan prisma/migrations/20261016130000_attendance_device_cards/migration.sql
--
-- Database: HRMS (dev-en-hris), bukan database SSO.
-- Aman dijalankan ulang. Bagian yang sudah ada dilewati.
-- Butuh PostgreSQL 12 atau lebih baru.
-- Jangan membungkus file ini di dalam transaksi luar: ADD VALUE pada enum
-- tidak boleh dipakai di transaksi yang sama.
--
-- Jalankan:
--   psql "$HRMS_DATABASE_URL" -v ON_ERROR_STOP=1 -f backend/scripts/20261016_attendance_device_cards.sql

-- ---------------------------------------------------------------------------
-- Enum
-- ---------------------------------------------------------------------------

ALTER TYPE "AttendanceSource" ADD VALUE IF NOT EXISTS 'DEVICE';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'CardPushStatus') THEN
    CREATE TYPE "CardPushStatus" AS ENUM ('PENDING', 'PUSHED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PunchMatchStatus') THEN
    CREATE TYPE "PunchMatchStatus" AS ENUM ('MATCHED', 'UNMATCHED');
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'PunchVerifyMode') THEN
    CREATE TYPE "PunchVerifyMode" AS ENUM ('CARD', 'FACE', 'FINGER', 'PASSWORD', 'UNKNOWN');
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Kolom kartu di karyawan
-- cardNumber tetap TEXT supaya nol di depan tidak hilang.
-- ---------------------------------------------------------------------------

ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "cardNumber" TEXT;
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "cardAssignedAt" TIMESTAMP(3);
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "cardPushStatus" "CardPushStatus";
ALTER TABLE "employees" ADD COLUMN IF NOT EXISTS "deviceUid" INTEGER;

CREATE UNIQUE INDEX IF NOT EXISTS "employees_tenant_card_number_key"
  ON "employees" ("tenantId", "cardNumber")
  WHERE "cardNumber" IS NOT NULL;

-- ---------------------------------------------------------------------------
-- Mesin absen
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "attendance_devices" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "attendance_devices_tenantId_code_key"
  ON "attendance_devices" ("tenantId", "code");

CREATE UNIQUE INDEX IF NOT EXISTS "attendance_devices_tenantId_serialNumber_key"
  ON "attendance_devices" ("tenantId", "serialNumber");

CREATE INDEX IF NOT EXISTS "attendance_devices_tenantId_idx"
  ON "attendance_devices" ("tenantId");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_devices_tenantId_fkey'
  ) THEN
    ALTER TABLE "attendance_devices"
      ADD CONSTRAINT "attendance_devices_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_devices_branchId_fkey'
  ) THEN
    ALTER TABLE "attendance_devices"
      ADD CONSTRAINT "attendance_devices_branchId_fkey"
      FOREIGN KEY ("branchId") REFERENCES "branches"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- Tap mentah dari mesin
-- ---------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS "attendance_punches" (
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

CREATE UNIQUE INDEX IF NOT EXISTS "attendance_punches_deviceId_nik_punchedAt_key"
  ON "attendance_punches" ("deviceId", "nik", "punchedAt");

CREATE INDEX IF NOT EXISTS "attendance_punches_tenantId_nik_matchStatus_idx"
  ON "attendance_punches" ("tenantId", "nik", "matchStatus");

CREATE INDEX IF NOT EXISTS "attendance_punches_employeeId_punchedAt_idx"
  ON "attendance_punches" ("employeeId", "punchedAt");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_punches_tenantId_fkey'
  ) THEN
    ALTER TABLE "attendance_punches"
      ADD CONSTRAINT "attendance_punches_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "tenants"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_punches_deviceId_fkey'
  ) THEN
    ALTER TABLE "attendance_punches"
      ADD CONSTRAINT "attendance_punches_deviceId_fkey"
      FOREIGN KEY ("deviceId") REFERENCES "attendance_devices"("id")
      ON DELETE RESTRICT ON UPDATE CASCADE;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'attendance_punches_employeeId_fkey'
  ) THEN
    ALTER TABLE "attendance_punches"
      ADD CONSTRAINT "attendance_punches_employeeId_fkey"
      FOREIGN KEY ("employeeId") REFERENCES "employees"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;
