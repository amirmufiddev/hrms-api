import {
  IsString,
  IsOptional,
  IsNumber,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsArray,
  ValidateNested,
  Min,
  Max,
  IsIn,
  ArrayMinSize,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';

// ============================================
// Salary Structure DTOs
// ============================================

export class SalaryComponentDto {
  @ApiProperty({ description: 'Component name (e.g., HRA, Conveyance)' })
  @IsString()
  name: string;

  @ApiProperty({ enum: ['earning', 'deduction'] })
  @IsEnum(['earning', 'deduction'] as const)
  type: 'earning' | 'deduction';

  @ApiProperty({
    enum: ['fixed', 'percentage'],
    description: 'fixed = flat amount, percentage = % of basePay',
  })
  @IsEnum(['fixed', 'percentage'] as const)
  calcType: 'fixed' | 'percentage';

  @ApiProperty({ description: 'Amount or percentage value' })
  @IsNumber()
  @Min(0)
  value: number;
}

export class CreateSalaryStructureDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ type: [SalaryComponentDto] })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalaryComponentDto)
  components: SalaryComponentDto[];
}

export class UpdateSalaryStructureDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ type: [SalaryComponentDto] })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => SalaryComponentDto)
  components?: SalaryComponentDto[];

  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}

// ============================================
// Employee Salary DTOs
// ============================================

export class AssignSalaryDto {
  @ApiPropertyOptional({ enum: ['MONTH', 'WEEK', 'DAILY', 'HOUR'] })
  @IsOptional()
  @IsIn(['MONTH', 'WEEK', 'DAILY', 'HOUR'])
  payBasis?: 'MONTH' | 'WEEK' | 'DAILY' | 'HOUR';

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  salaryStructureId?: string;

  @ApiProperty({ description: 'Base pay amount for the selected pay basis' })
  @IsNumber()
  @Min(0)
  basePay: number;

  @ApiPropertyOptional({ description: 'Effective from date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  effectiveFrom?: string;

  @ApiPropertyOptional({ description: 'Effective to date (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  effectiveTo?: string;
}

// ============================================
// Payroll Run DTOs
// ============================================

export class CreatePayrollRunDto {
  @ApiProperty({ description: 'Month (1-12)' })
  @IsNumber()
  @Min(1)
  @Max(12)
  month: number;

  @ApiProperty({ description: 'Year (e.g., 2026)' })
  @IsNumber()
  @Min(2020)
  year: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  remarks?: string;
}

export class CreateDailyPayrollRunDto {
  @ApiProperty({ description: 'Period start (YYYY-MM-DD)' })
  @IsDateString()
  periodStart: string;

  @ApiProperty({ description: 'Period end (YYYY-MM-DD)' })
  @IsDateString()
  periodEnd: string;

  @ApiProperty({ type: [String] })
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  employeeIds: string[];
}

// ============================================
// Query DTOs
// ============================================

export class PayrollRunQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  year?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  status?: string;
}

export class PayslipQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  page?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  limit?: string;
}

export class DailyWorkerQueryDto {
  @ApiPropertyOptional({ description: 'Search name, employee code, or department' })
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  departmentId?: string;

  @ApiPropertyOptional({ description: 'Period start (YYYY-MM-DD) — required with periodEnd to exclude paid workers' })
  @IsOptional()
  @IsDateString()
  periodStart?: string;

  @ApiPropertyOptional({ description: 'Period end (YYYY-MM-DD)' })
  @IsOptional()
  @IsDateString()
  periodEnd?: string;
}

export class PayrollExportDto {
  @ApiPropertyOptional({ description: 'Export a single payroll run (includes run summary sheet)' })
  @IsOptional()
  @IsString()
  runId?: string;

  @ApiPropertyOptional({ description: 'Filter runs by calendar year (with optional month)' })
  @IsOptional()
  @IsNumber()
  @Min(2000)
  @Max(2100)
  @Type(() => Number)
  year?: number;

  @ApiPropertyOptional({ description: 'Filter monthly runs by month (1–12)' })
  @IsOptional()
  @IsNumber()
  @Min(1)
  @Max(12)
  @Type(() => Number)
  month?: number;

  @ApiPropertyOptional({ enum: ['xlsx', 'csv'], default: 'xlsx' })
  @IsOptional()
  @IsIn(['xlsx', 'csv'])
  format?: 'xlsx' | 'csv';
}
