export const IMPORT_HEADERS = [
  'Nama depan',
  'Nama belakang',
  'NIK KTP',
  'NO TELPON',
  'JENIS KELAMIN',
  'NO REKENING',
  'NAMA BANK',
  'Departemen',
  'Jabatan',
  'Tipe kerja',
  'Email',
  'Tanggal bergabung',
] as const;

export const EMPLOYMENT_TYPES = [
  'PERMANENT',
  'CONTRACT',
  'TEMPORARY',
  'INTERN',
  'DAILY_WORKER',
] as const;

export type EmploymentTypeValue = (typeof EMPLOYMENT_TYPES)[number];

export type ParsedEmployeeRow = {
  row: number;
  firstName: string;
  lastName: string;
  ktpNumber: string;
  gender: 'male' | 'female' | null;
  departmentLabel: string;
  departmentId: string | null;
  designationLabel: string;
  designationId: string | null;
  employmentType: EmploymentTypeValue;
  email: string | null;
  phone: string | null;
  accountNumber: string;
  bankName: string;
  bankNameKey: string;
  joinDate: string | null;
};

export type ImportRowError = {
  row: number;
  message: string;
  cells?: string[];
};

export const IMPORT_FAILED_REASON_HEADER = 'Alasan gagal';

export function importRowToCells(row: {
  firstName: string;
  lastName: string;
  ktpNumber: string;
  gender: 'male' | 'female' | null;
  departmentLabel: string;
  designationLabel: string;
  employmentType: string;
  email: string | null;
  phone: string | null;
  accountNumber: string;
  bankName: string;
  joinDate: string | null;
}): string[] {
  const genderLabel =
    row.gender === 'male' ? 'Laki-laki' : row.gender === 'female' ? 'Perempuan' : '';
  return [
    row.firstName,
    row.lastName,
    row.ktpNumber,
    row.phone ?? '',
    genderLabel,
    row.accountNumber,
    row.bankName,
    row.departmentLabel,
    row.designationLabel,
    row.employmentType,
    row.email ?? '',
    row.joinDate ?? '',
  ];
}

export type EmployeeImportJobData = {
  tenantId: string;
  filePath: string;
  nikPrefix: string;
};

export type EmployeeImportProgress = {
  total: number;
  processed: number;
  created: number;
  failed: number;
  errors: ImportRowError[];
};

export const EMPTY_IMPORT_PROGRESS: EmployeeImportProgress = {
  total: 0,
  processed: 0,
  created: 0,
  failed: 0,
  errors: [],
};

export function normalizeImportProgress(raw: unknown): EmployeeImportProgress {
  if (typeof raw !== 'object' || raw === null) {
    return { ...EMPTY_IMPORT_PROGRESS };
  }
  const value = raw as Partial<EmployeeImportProgress>;
  return {
    total: value.total ?? 0,
    processed: value.processed ?? 0,
    created: value.created ?? 0,
    failed: value.failed ?? 0,
    errors: Array.isArray(value.errors)
      ? value.errors.map((entry) => {
          const item = entry as Partial<ImportRowError>;
          return {
            row: item.row ?? 0,
            message: item.message ?? '',
            cells: Array.isArray(item.cells) ? item.cells : undefined,
          };
        })
      : [],
  };
}
