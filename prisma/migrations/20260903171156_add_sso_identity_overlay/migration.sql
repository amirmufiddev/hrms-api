-- AlterTable
ALTER TABLE "departments" ADD COLUMN     "classification" TEXT,
ADD COLUMN     "ssoDepartmentId" TEXT;

-- AlterTable
ALTER TABLE "employees" ADD COLUMN     "ssoUserId" TEXT;

-- AlterTable
ALTER TABLE "tenants" ADD COLUMN     "ssoCompanyId" TEXT;

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "ssoUserId" TEXT,
ALTER COLUMN "passwordHash" DROP NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "departments_ssoDepartmentId_key" ON "departments"("ssoDepartmentId");

-- CreateIndex
CREATE UNIQUE INDEX "employees_ssoUserId_key" ON "employees"("ssoUserId");

-- CreateIndex
CREATE UNIQUE INDEX "tenants_ssoCompanyId_key" ON "tenants"("ssoCompanyId");

-- CreateIndex
CREATE UNIQUE INDEX "users_ssoUserId_key" ON "users"("ssoUserId");
