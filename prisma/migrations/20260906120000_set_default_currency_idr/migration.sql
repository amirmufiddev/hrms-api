-- AlterTable
ALTER TABLE "tenants" ALTER COLUMN "currency" SET DEFAULT 'IDR',
ALTER COLUMN "timezone" SET DEFAULT 'Asia/Jakarta',
ALTER COLUMN "financialYearStartMonth" SET DEFAULT 1,
ALTER COLUMN "leaveYearStartMonth" SET DEFAULT 1;

-- Update existing tenants with INR to IDR if currently using old default
UPDATE "tenants" SET "currency" = 'IDR' WHERE "currency" = 'INR' OR "currency" IS NULL;
UPDATE "tenants" SET "timezone" = 'Asia/Jakarta' WHERE "timezone" = 'Asia/Kolkata';
