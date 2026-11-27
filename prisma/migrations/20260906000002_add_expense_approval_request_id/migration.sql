-- AlterTable
ALTER TABLE "expense_claims" ADD COLUMN "approval_request_id" TEXT;

-- CreateIndex
CREATE INDEX "expense_claims_approval_request_id_idx" ON "expense_claims"("approval_request_id");
