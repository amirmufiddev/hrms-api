ALTER TABLE "comp_off_requests" ADD COLUMN IF NOT EXISTS "approval_request_id" TEXT;
CREATE INDEX IF NOT EXISTS "comp_off_requests_approval_request_id_idx" ON "comp_off_requests"("approval_request_id");

ALTER TABLE "attendance_regularizations" ADD COLUMN IF NOT EXISTS "approval_request_id" TEXT;
CREATE INDEX IF NOT EXISTS "attendance_regularizations_approval_request_id_idx" ON "attendance_regularizations"("approval_request_id");

ALTER TABLE "attendance_records" ADD COLUMN IF NOT EXISTS "approval_request_id" TEXT;
CREATE INDEX IF NOT EXISTS "attendance_records_approval_request_id_idx" ON "attendance_records"("approval_request_id");
