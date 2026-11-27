-- AlterTable
ALTER TABLE "employees" ADD COLUMN "ktpNumber" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "employees_tenantId_ktpNumber_key" ON "employees"("tenantId", "ktpNumber");
