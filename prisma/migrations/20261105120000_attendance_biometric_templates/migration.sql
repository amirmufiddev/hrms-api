CREATE TABLE "attendance_biometric_templates" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "nik" TEXT NOT NULL,
    "slot" INTEGER NOT NULL,
    "record" TEXT NOT NULL,
    "sourceDeviceId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "attendance_biometric_templates_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "attendance_biometric_templates_tenantId_nik_slot_key" ON "attendance_biometric_templates"("tenantId", "nik", "slot");

CREATE INDEX "attendance_biometric_templates_tenantId_nik_idx" ON "attendance_biometric_templates"("tenantId", "nik");

ALTER TABLE "attendance_biometric_templates" ADD CONSTRAINT "attendance_biometric_templates_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
