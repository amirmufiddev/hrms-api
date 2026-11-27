CREATE TYPE "SalaryPayBasis" AS ENUM ('MONTH', 'WEEK', 'DAILY', 'HOUR');
CREATE TYPE "PayrollRunKind" AS ENUM ('MONTHLY', 'DAILY');

ALTER TABLE "employee_salaries"
  ADD COLUMN "payBasis" "SalaryPayBasis" NOT NULL DEFAULT 'MONTH',
  ALTER COLUMN "salaryStructureId" DROP NOT NULL,
  ALTER COLUMN "effectiveFrom" DROP NOT NULL;

ALTER TABLE "payroll_runs"
  ADD COLUMN "kind" "PayrollRunKind" NOT NULL DEFAULT 'MONTHLY',
  ADD COLUMN "periodStart" DATE,
  ADD COLUMN "periodEnd" DATE,
  ALTER COLUMN "month" DROP NOT NULL,
  ALTER COLUMN "year" DROP NOT NULL;

DROP INDEX IF EXISTS "payroll_runs_tenantId_month_year_key";

CREATE UNIQUE INDEX "payroll_runs_monthly_period_key"
  ON "payroll_runs" ("tenantId", "month", "year")
  WHERE "kind" = 'MONTHLY';

CREATE TABLE "payroll_run_employees" (
  "id" TEXT NOT NULL,
  "payrollRunId" TEXT NOT NULL,
  "employeeId" TEXT NOT NULL,
  CONSTRAINT "payroll_run_employees_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "payroll_run_employees_payrollRunId_employeeId_key"
  ON "payroll_run_employees"("payrollRunId", "employeeId");
CREATE INDEX "payroll_run_employees_employeeId_idx"
  ON "payroll_run_employees"("employeeId");

ALTER TABLE "payroll_run_employees"
  ADD CONSTRAINT "payroll_run_employees_payrollRunId_fkey"
  FOREIGN KEY ("payrollRunId") REFERENCES "payroll_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "payroll_run_employees"
  ADD CONSTRAINT "payroll_run_employees_employeeId_fkey"
  FOREIGN KEY ("employeeId") REFERENCES "employees"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "payslips"
  ALTER COLUMN "presentDays" TYPE DECIMAL(6,2) USING "presentDays"::decimal;
