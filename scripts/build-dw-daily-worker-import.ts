/**
 * One-off: build HRMS employee import xlsx from "Data DW Updated (2).xlsx" (sheet On Board).
 * Usage: npx ts-node -r tsconfig-paths/register scripts/build-dw-daily-worker-import.ts
 */
import * as ExcelJS from 'exceljs';
import * as path from 'path';
import { IMPORT_HEADERS } from '../src/modules/employees/import/employee-import.types';

const SOURCE = path.resolve(
  __dirname,
  '../../../Data DW Updated  (2).xlsx',
);
const OUTPUT = path.resolve(
  __dirname,
  '../../../import-karyawan-daily-worker-dw-2026.xlsx',
);

function titleWords(raw: string): string {
  return raw
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

function splitName(full: unknown): { firstName: string; lastName: string } {
  const parts = String(full ?? '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) {
    return { firstName: '', lastName: '' };
  }
  if (parts.length === 1) {
    return { firstName: titleWords(parts[0]), lastName: '' };
  }
  return {
    firstName: titleWords(parts[0]),
    lastName: titleWords(parts.slice(1).join(' ')),
  };
}

function formatJoinDate(value: unknown): string {
  if (value == null || value === '') {
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
  const text = String(value).trim();
  const slash = /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/.exec(text);
  if (slash) {
    const day = slash[1].padStart(2, '0');
    const month = slash[2].padStart(2, '0');
    const year = slash[3];
    return `${year}-${month}-${day}`;
  }
  return '';
}

function formatPhone(value: unknown): string {
  if (value == null) {
    return '';
  }
  return String(value).trim();
}

async function main() {
  const sourceWb = new ExcelJS.Workbook();
  await sourceWb.xlsx.readFile(SOURCE);
  const onboard = sourceWb.getWorksheet('On Board');
  if (!onboard) {
    throw new Error('Sheet "On Board" tidak ditemukan');
  }

  const rows: (string | number)[][] = [];
  onboard.eachRow((row, rowNumber) => {
    if (rowNumber <= 4) {
      return;
    }
    const values = row.values;
    if (!Array.isArray(values)) {
      return;
    }
    const nama = values[2];
    if (nama == null || String(nama).trim() === '') {
      return;
    }
    const { firstName, lastName } = splitName(nama);
    const department = String(values[5] ?? '').trim();
    const position = String(values[4] ?? '').trim();
    const joinDate = formatJoinDate(values[3]);
    const phone = formatPhone(values[7]);

    rows.push([
      firstName,
      lastName,
      department,
      position,
      'DAILY_WORKER',
      '',
      phone,
      joinDate,
    ]);
  });

  const outWb = new ExcelJS.Workbook();
  const dataSheet = outWb.addWorksheet('Data');
  dataSheet.addRow([...IMPORT_HEADERS]);
  for (const r of rows) {
    dataSheet.addRow(r);
  }

  const sampleSheet = outWb.addWorksheet('Contoh');
  sampleSheet.addRow([...IMPORT_HEADERS]);
  sampleSheet.addRow([
    'Amir',
    'Mufid',
    'Engineering',
    'Daily Worker Public Area',
    'DAILY_WORKER',
    '',
    '08123456789',
    '2026-01-15',
  ]);

  await outWb.xlsx.writeFile(OUTPUT);
  console.log(`Wrote ${rows.length} rows -> ${OUTPUT}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
