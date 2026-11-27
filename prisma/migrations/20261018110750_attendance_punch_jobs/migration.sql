-- CreateEnum
CREATE TYPE "PunchJobStatus" AS ENUM ('PENDING', 'PROCESSING', 'DONE', 'FAILED');

-- CreateTable
CREATE TABLE "attendance_punch_jobs" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "punchedAt" TIMESTAMP(3) NOT NULL,
    "verifyMode" "PunchVerifyMode" NOT NULL DEFAULT 'UNKNOWN',
    "deviceState" INTEGER,
    "status" "PunchJobStatus" NOT NULL DEFAULT 'PENDING',
    "attempts" INTEGER NOT NULL DEFAULT 0,
    "lastError" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_punch_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "attendance_punch_jobs_status_updatedAt_idx" ON "attendance_punch_jobs"("status", "updatedAt");

-- CreateIndex
CREATE INDEX "attendance_punch_jobs_tenantId_status_idx" ON "attendance_punch_jobs"("tenantId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "attendance_punch_jobs_deviceId_nik_punchedAt_key" ON "attendance_punch_jobs"("deviceId", "nik", "punchedAt");

-- AddForeignKey
ALTER TABLE "attendance_punch_jobs" ADD CONSTRAINT "attendance_punch_jobs_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "attendance_punch_jobs" ADD CONSTRAINT "attendance_punch_jobs_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "attendance_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
