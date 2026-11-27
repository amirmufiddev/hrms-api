ALTER TABLE "attendance_device_directory" ADD COLUMN "slots" TEXT NOT NULL DEFAULT '';
ALTER TABLE "attendance_device_directory" ADD COLUMN "slotsRead" BOOLEAN NOT NULL DEFAULT false;
