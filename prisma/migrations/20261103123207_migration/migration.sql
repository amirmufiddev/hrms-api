-- DropForeignKey
ALTER TABLE "employee_salaries" DROP CONSTRAINT "employee_salaries_salaryStructureId_fkey";

-- AddForeignKey
ALTER TABLE "employee_salaries" ADD CONSTRAINT "employee_salaries_salaryStructureId_fkey" FOREIGN KEY ("salaryStructureId") REFERENCES "salary_structures"("id") ON DELETE SET NULL ON UPDATE CASCADE;
