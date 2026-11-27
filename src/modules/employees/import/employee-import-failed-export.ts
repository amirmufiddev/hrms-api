import * as ExcelJS from 'exceljs';
import {
  IMPORT_FAILED_REASON_HEADER,
  IMPORT_HEADERS,
  type ImportRowError,
} from './employee-import.types';

export async function buildFailedImportRowsWorkbook(
  errors: ImportRowError[],
): Promise<Buffer> {
  const workbook = new ExcelJS.Workbook();
  const sheet = workbook.addWorksheet('Data');
  sheet.addRow([...IMPORT_HEADERS, IMPORT_FAILED_REASON_HEADER]);

  for (const error of errors) {
    const cells =
      error.cells ??
      IMPORT_HEADERS.map(() => '');
    sheet.addRow([...cells.slice(0, IMPORT_HEADERS.length), error.message]);
  }

  const xlsxBuffer = await workbook.xlsx.writeBuffer();
  return Buffer.from(xlsxBuffer) as Buffer;
}
