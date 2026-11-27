-- AlterTable
ALTER TABLE "leave_requests" ADD COLUMN     "approval_request_id" TEXT;

-- CreateIndex
CREATE INDEX "leave_requests_approval_request_id_idx" ON "leave_requests"("approval_request_id");
