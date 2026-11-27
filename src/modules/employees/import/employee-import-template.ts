import * as ExcelJS from 'exceljs';
import { IMPORT_HEADERS } from './employee-import.types';

export async function buildEmployeeImportTemplate(): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();

  const dataSheet = workbook.addWorksheet('Data');
  dataSheet.addRow([...IMPORT_HEADERS]);

  const sampleSheet = workbook.addWorksheet('Contoh');
  sampleSheet.addRow([...IMPORT_HEADERS]);
  sampleSheet.addRow([
    'Amir',
    'Mufid',
    '3201010101010001',
    '08123456789',
    'Laki-laki',
    '1234567890',
    'BCA',
    'Engineering',
    'Staff',
    'PERMANENT',
    'amir@example.com',
    '2026-01-15',
  ]);

  for (const sheet of [dataSheet, sampleSheet]) {
    sheet.getColumn(3).numFmt = '@';
    sheet.getColumn(6).numFmt = '@';
  }

  const xlsxBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(xlsxBuffer) as Buffer;
}
