CREATE TABLE "attendance_device_directory" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "deviceId" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "name" TEXT NOT NULL DEFAULT '',
    "card" TEXT NOT NULL DEFAULT '',
    "seenAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_device_directory_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attendance_device_directory_deviceId_nik_key" ON "attendance_device_directory"("deviceId", "nik");

CREATE INDEX "attendance_device_directory_tenantId_nik_idx" ON "attendance_device_directory"("tenantId", "nik");

ALTER TABLE "attendance_device_directory" ADD CONSTRAINT "attendance_device_directory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "attendance_device_directory" ADD CONSTRAINT "attendance_device_directory_deviceId_fkey" FOREIGN KEY ("deviceId") REFERENCES "attendance_devices"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

CREATE TABLE "attendance_sync_removals" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "requestedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "attendance_sync_removals_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attendance_sync_removals_tenantId_nik_key" ON "attendance_sync_removals"("tenantId", "nik");

ALTER TABLE "attendance_sync_removals" ADD CONSTRAINT "attendance_sync_removals_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
