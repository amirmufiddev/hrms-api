-- CreateEnum
CREATE TYPE "PositionLevel" AS ENUM ('COMPANY', 'DIVISION', 'DEPARTMENT');

-- AlterTable
ALTER TABLE "designations" ADD COLUMN "level" "PositionLevel" NOT NULL DEFAULT 'DEPARTMENT';

-- CreateIndex
CREATE INDEX "designations_level_idx" ON "designations"("level");
