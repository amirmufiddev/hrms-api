CREATE TABLE "employee_bank_accounts" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "employeeId" TEXT NOT NULL,
    "accountNumber" TEXT NOT NULL,
    "bankName" TEXT NOT NULL,
    "bankNameKey" TEXT NOT NULL,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "employee_bank_accounts_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "employee_bank_accounts_tenantId_bankNameKey_accountNumber_key" ON "employee_bank_accounts"("tenantId", "bankNameKey", "accountNumber");

CREATE INDEX "employee_bank_accounts_tenantId_idx" ON "employee_bank_accounts"("tenantId");

CREATE INDEX "employee_bank_accounts_employeeId_idx" ON "employee_bank_accounts"("employeeId");

CREATE UNIQUE INDEX "employee_bank_accounts_one_primary_per_employee" ON "employee_bank_accounts"("employeeId") WHERE "isPrimary" = true;

ALTER TABLE "employee_bank_accounts" ADD CONSTRAINT "employee_bank_accounts_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "employee_bank_accounts" ADD CONSTRAINT "employee_bank_accounts_employeeId_fkey" FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE CASCADE ON UPDATE CASCADE;
