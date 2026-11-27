import {
  IsString,
  IsEmail,
  IsOptional,
  IsEnum,
  IsNumber,
  IsDateString,
  IsUUID,
  Min,
  IsBoolean,
  MinLength,
  Matches,
  ValidateIf,
  IsNotEmpty,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { EmploymentType, PayType, EmployeeStatus, UserRole } from '@prisma/client';
import { Type } from 'class-transformer';

const EMPLOYEE_CODE_RULE = /^9\d{5,9}$/;

export class CreateEmployeeDto {
  @ApiPropertyOptional({
    description:
      'Kode pegawai HRMS (angka, awalan 9, 6–10 digit). Kosongkan untuk generate otomatis.',
    example: '900001',
  })
  @IsOptional()
  @IsString()
  @Matches(EMPLOYEE_CODE_RULE, {
    message: 'Employee code must be numeric, start with 9, and be 6–10 digits long',
  })
  employeeCode?: string;

  @ApiProperty()
  @IsString()
  firstName: string;

  @ApiProperty()
  @IsString()
  lastName: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  salutation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  dateOfBirth?: Date | string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fatherName?: string;

  @ApiPropertyOptional({
    description: 'Nomor KTP (NIK) 16 digit, unik per tenant',
    example: '3201260707070003',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{16}$/, { message: 'KTP number must be exactly 16 digits' })
  ktpNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  aadhaarNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobileNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  workEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  personalEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentZipCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permanentCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permanentState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permanentZipCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permanentCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactRelation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  emergencyContactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlySalary?: number;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ enum: PayType })
  @IsOptional()
  @IsEnum(PayType)
  payType?: PayType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  otMultiplier?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  designationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiProperty()
  @IsNotEmpty()
  @Type(() => Date)
  joinDate: Date | string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  exitDate?: Date | string;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional({
    description: 'Buat akun SSO beserta role HRMS Employee. Default false. true membuat akun SSO.',
    default: false,
  })
  @IsOptional()
  @IsBoolean()
  createSsoUser?: boolean;

  // User account creation fields
  @ApiPropertyOptional()
  @IsOptional()
  @IsBoolean()
  createUser?: boolean;

  @ApiPropertyOptional()
  @ValidateIf(o => o.createUser === true)
  @IsEmail()
  userEmail?: string;

  @ApiPropertyOptional()
  @ValidateIf(o => o.createUser === true)
  @IsString()
  @MinLength(6)
  userPassword?: string;

  @ApiPropertyOptional({ enum: UserRole })
  @ValidateIf(o => o.createUser === true)
  @IsOptional()
  @IsEnum(UserRole)
  userRole?: UserRole;
}

export class UpdateEmployeeDto {
  @ApiPropertyOptional({
    description: 'Kode pegawai HRMS (angka, awalan 9, 6–10 digit)',
    example: '900001',
  })
  @IsOptional()
  @IsString()
  @Matches(EMPLOYEE_CODE_RULE, {
    message: 'Employee code must be numeric, start with 9, and be 6–10 digits long',
  })
  employeeCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  salutation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  gender?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Date)
  dateOfBirth?: Date | string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  fatherName?: string;

  @ApiPropertyOptional({
    description: 'Nomor KTP (NIK) 16 digit, unik per tenant',
    example: '3201260707070003',
  })
  @IsOptional()
  @IsString()
  @Matches(/^\d{16}$/, { message: 'KTP number must be exactly 16 digits' })
  ktpNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  aadhaarNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  nationality?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  maritalStatus?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  bloodGroup?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  mobileNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  workEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  personalEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentZipCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  currentCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permanentAddress?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permanentCity?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permanentState?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permanentZipCode?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  permanentCountry?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactName?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactNumber?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  emergencyContactRelation?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsEmail()
  emergencyContactEmail?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  monthlySalary?: number;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional({ enum: PayType })
  @IsOptional()
  @IsEnum(PayType)
  payType?: PayType;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  hourlyRate?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsNumber()
  @Min(0)
  otMultiplier?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  designationId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  branchId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  managerId?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsDateString()
  exitDate?: string;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;
}

export class EmployeeQueryDto {
  @ApiPropertyOptional()
  @IsOptional()
  @IsString()
  search?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @IsUUID()
  departmentId?: string;

  @ApiPropertyOptional({ enum: EmployeeStatus })
  @IsOptional()
  @IsEnum(EmployeeStatus)
  status?: EmployeeStatus;

  @ApiPropertyOptional({ enum: EmploymentType })
  @IsOptional()
  @IsEnum(EmploymentType)
  employmentType?: EmploymentType;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  page?: number = 1;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(1)
  limit?: number = 20;
}
