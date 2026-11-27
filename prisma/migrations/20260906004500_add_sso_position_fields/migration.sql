-- AlterTable
ALTER TABLE "designations" ADD COLUMN     "code" TEXT,
ADD COLUMN     "ssoPositionId" TEXT,
ADD COLUMN     "parentId" TEXT,
ADD COLUMN     "departmentId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "designations_ssoPositionId_key" ON "designations"("ssoPositionId");

-- CreateIndex
CREATE INDEX "designations_departmentId_idx" ON "designations"("departmentId");

-- AddForeignKey
ALTER TABLE "designations" ADD CONSTRAINT "designations_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "designations"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "designations" ADD CONSTRAINT "designations_departmentId_fkey" FOREIGN KEY ("departmentId") REFERENCES "departments"("id") ON DELETE SET NULL ON UPDATE CASCADE;
