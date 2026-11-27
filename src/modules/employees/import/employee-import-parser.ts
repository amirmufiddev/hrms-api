import {
  EMPLOYMENT_TYPES,
  IMPORT_HEADERS,
  type EmploymentTypeValue,
  type ImportRowError,
  type ParsedEmployeeRow,
} from './employee-import.types';

const HEADER_ERROR = 'Header sheet Data tidak sesuai template';
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const UNSAFE_EXCEL_NUMBER = '\u0000UNSAFE_EXCEL_NUMBER';

export { IMPORT_HEADERS, type ParsedEmployeeRow } from './employee-import.types';

const CELL_MODES: Array<'plain' | 'phone' | 'identity'> = [
  'plain',
  'plain',
  'identity',
  'phone',
  'plain',
  'identity',
  'plain',
  'plain',
  'plain',
  'plain',
  'plain',
  'plain',
];

export function assertImportHeaders(header: unknown[]): void {
  for (let i = 0; i < IMPORT_HEADERS.length; i++) {
    const cell = header[i];
    const value = cell == null ? '' : String(cell).trim();
    if (value !== IMPORT_HEADERS[i]) {
      throw new Error(HEADER_ERROR);
    }
  }
}

function cellString(
  value: unknown,
  mode: 'plain' | 'phone' | 'identity' = 'plain',
): string {
  if (value == null) {
    return '';
  }
  if (value instanceof Date) {
    if (Number.isNaN(value.getTime())) {
      return '';
    }
    const year = value.getUTCFullYear();
    const month = String(value.getUTCMonth() + 1).padStart(2, '0');
    const day = String(value.getUTCDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  if (typeof value === 'number' && Number.isFinite(value)) {
    if (mode === 'identity' && !Number.isSafeInteger(value)) {
      return UNSAFE_EXCEL_NUMBER;
    }
    const digits = Number.isSafeInteger(value)
      ? value.toLocaleString('fullwide', { useGrouping: false })
      : String(value);
    if (mode === 'phone' && /^8\d{8,12}$/.test(digits)) {
      return `0${digits}`;
    }
    return digits;
  }
  if (typeof value === 'object') {
    const record = value as {
      text?: unknown;
      result?: unknown;
      richText?: { text?: string }[];
    };
    if (typeof record.text === 'string') {
      return record.text.trim();
    }
    if (Array.isArray(record.richText)) {
      return record.richText
        .map((part) => part.text ?? '')
        .join('')
        .trim();
    }
    if ('result' in record) {
      return cellString(record.result, mode);
    }
  }
  return String(value).trim();
}

function isBlankRow(cells: string[]): boolean {
  return cells.every((c) => c === '');
}

function findByCodeOrName(
  raw: string,
  items: { id: string; name: string; code: string | null }[],
): string | null {
  if (raw === '') {
    return null;
  }
  const byCode = items.find((item) => item.code != null && item.code === raw);
  if (byCode) {
    return byCode.id;
  }
  const lower = raw.toLowerCase();
  const byName = items.find((item) => item.name.trim().toLowerCase() === lower);
  return byName?.id ?? null;
}

function parseEmploymentType(raw: string): EmploymentTypeValue | null {
  if (raw === '') {
    return null;
  }
  if ((EMPLOYMENT_TYPES as readonly string[]).includes(raw)) {
    return raw as EmploymentTypeValue;
  }
  return null;
}

function parseJoinDate(raw: string): string | null | 'invalid' {
  if (raw === '') {
    return null;
  }
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (!match) {
    return 'invalid';
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const utc = Date.UTC(year, month - 1, day);
  const d = new Date(utc);
  if (
    d.getUTCFullYear() !== year ||
    d.getUTCMonth() !== month - 1 ||
    d.getUTCDate() !== day
  ) {
    return 'invalid';
  }
  return raw;
}

function parseGender(raw: string): 'male' | 'female' | null | 'invalid' {
  const token = raw.trim().toLowerCase().replace(/\s+/g, ' ');
  if (token === '') return null;
  if (token === 'laki-laki' || token === 'laki laki' || token === 'l' || token === 'pria') {
    return 'male';
  }
  if (token === 'perempuan' || token === 'p' || token === 'wanita') {
    return 'female';
  }
  return 'invalid';
}

function normalizeBankName(raw: string): { bankName: string; bankNameKey: string } | null {
  const bankName = raw.trim().replace(/\s+/g, ' ');
  if (bankName === '') return null;
  return { bankName, bankNameKey: bankName.toLowerCase() };
}

export function jakartaJoinDate(now: Date = new Date()): Date {
  const formatter = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  });
  const parts = formatter.formatToParts(now);
  const year = parts.find((p) => p.type === 'year')?.value ?? '1970';
  const month = parts.find((p) => p.type === 'month')?.value ?? '01';
  const day = parts.find((p) => p.type === 'day')?.value ?? '01';
  return new Date(`${year}-${month}-${day}T00:00:00.000Z`);
}

export function parseEmployeeSheet(
  rows: unknown[][],
  departments: { id: string; name: string; code: string | null }[],
  designations: { id: string; name: string; code: string | null }[],
): { rows: ParsedEmployeeRow[]; errors: ImportRowError[] } {
  if (rows.length === 0) {
    throw new Error(HEADER_ERROR);
  }

  assertImportHeaders(rows[0]);

  const parsedRows: ParsedEmployeeRow[] = [];
  const errors: ImportRowError[] = [];
  const seenEmails = new Set<string>();
  const seenKtp = new Set<string>();
  const seenBank = new Set<string>();

  for (let i = 1; i < rows.length; i++) {
    const sheetRow = i + 1;
    const rawRow = rows[i] ?? [];
    const cells = IMPORT_HEADERS.map((_, col) =>
      cellString(rawRow[col], CELL_MODES[col]),
    );

    if (isBlankRow(cells)) {
      continue;
    }

    const messages: string[] = [];

    const firstName = cells[0];
    const lastName = cells[1];
    const ktpRaw = cells[2];
    const phoneRaw = cells[3];
    const genderRaw = cells[4];
    const accountRaw = cells[5];
    const bankRaw = cells[6];
    const departmentRaw = cells[7];
    const designationRaw = cells[8];
    const employmentRaw = cells[9];
    const emailRaw = cells[10];
    const joinDateRaw = cells[11];

    if (firstName === '') {
      messages.push('Nama depan wajib diisi');
    }

    let ktpDigits: string | null = null;
    if (ktpRaw === UNSAFE_EXCEL_NUMBER) {
      messages.push('NIK KTP harus diisi sebagai teks');
    } else {
      ktpDigits = ktpRaw.replace(/\D/g, '');
      if (ktpDigits === '') {
        messages.push('NIK KTP wajib diisi');
      } else if (ktpDigits.length !== 16) {
        messages.push('NIK KTP harus 16 digit');
      } else if (seenKtp.has(ktpDigits)) {
        messages.push('NIK KTP sudah dipakai');
      }
    }

    const genderParsed = parseGender(genderRaw);
    if (genderParsed === 'invalid') {
      messages.push('Jenis kelamin tidak valid');
    }

    let accountNumber = '';
    if (accountRaw === UNSAFE_EXCEL_NUMBER) {
      messages.push('Nomor rekening harus diisi sebagai teks');
    } else {
      accountNumber = accountRaw.replace(/\s+/g, '');
      if (accountNumber === '') {
        messages.push('Nomor rekening wajib diisi');
      }
    }

    const bankNorm = normalizeBankName(bankRaw);
    if (bankNorm === null) {
      messages.push('Nama bank wajib diisi');
    } else if (
      accountNumber !== '' &&
      accountRaw !== UNSAFE_EXCEL_NUMBER &&
      seenBank.has(`${bankNorm.bankNameKey}\u0000${accountNumber}`)
    ) {
      messages.push('Nomor rekening sudah dipakai');
    }

    const departmentId =
      departmentRaw === '' ? null : findByCodeOrName(departmentRaw, departments);
    const designationId =
      designationRaw === '' ? null : findByCodeOrName(designationRaw, designations);

    const employmentType = parseEmploymentType(employmentRaw);
    if (employmentType == null) {
      messages.push('Tipe kerja tidak valid');
    }

    let email: string | null = null;
    if (emailRaw === '') {
      email = null;
    } else if (!EMAIL_REGEX.test(emailRaw)) {
      messages.push('Email tidak valid');
    } else {
      const normalized = emailRaw.toLowerCase();
      if (seenEmails.has(normalized)) {
        messages.push('Email sudah dipakai');
      } else {
        email = emailRaw;
      }
    }

    const phone = phoneRaw === '' ? null : phoneRaw;

    const joinDateResult = parseJoinDate(joinDateRaw);
    let joinDate: string | null = null;
    if (joinDateResult === 'invalid') {
      messages.push('Tanggal bergabung tidak valid');
    } else {
      joinDate = joinDateResult;
    }

    if (messages.length > 0) {
      errors.push({
        row: sheetRow,
        message: messages.join('; '),
        cells: [...cells],
      });
      continue;
    }

    const gender: 'male' | 'female' | null =
      genderParsed === 'invalid' ? null : genderParsed;

    parsedRows.push({
      row: sheetRow,
      firstName,
      lastName,
      ktpNumber: ktpDigits!,
      gender,
      departmentLabel: departmentRaw,
      departmentId,
      designationLabel: designationRaw,
      designationId,
      employmentType: employmentType!,
      email,
      phone,
      accountNumber,
      bankName: bankNorm!.bankName,
      bankNameKey: bankNorm!.bankNameKey,
      joinDate,
    });

    if (email != null) {
      seenEmails.add(email.toLowerCase());
    }
    seenKtp.add(ktpDigits!);
    seenBank.add(`${bankNorm!.bankNameKey}\u0000${accountNumber}`);
  }

  return { rows: parsedRows, errors };
}
