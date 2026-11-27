import ExcelJS from 'exceljs';
import { buildFailedImportRowsWorkbook } from './employee-import-failed-export';
import { IMPORT_FAILED_REASON_HEADER, IMPORT_HEADERS } from './employee-import.types';

describe('buildFailedImportRowsWorkbook', () => {
  it('writes the 12 template columns and the failure reason', async () => {
    const cells = [
      'Amir',
      'Mufid',
      '3201010101010001',
      '0812',
      'Laki-laki',
      '1234567890',
      'BCA',
      'Engineering',
      'Staff',
      'PERMANENT',
      '',
      '',
    ];
    const buffer = await buildFailedImportRowsWorkbook([
      { row: 2, message: 'NIK KTP sudah dipakai', cells },
    ]);
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(buffer as never);
    const sheet = workbook.getWorksheet('Data');
    const headers = [...IMPORT_HEADERS, IMPORT_FAILED_REASON_HEADER].map((_, index) =>
      sheet?.getRow(1).getCell(index + 1).value,
    );
    expect(headers).toEqual([...IMPORT_HEADERS, IMPORT_FAILED_REASON_HEADER]);
    expect(sheet?.getRow(2).getCell(3).value).toBe('3201010101010001');
    expect(sheet?.getRow(2).getCell(13).value).toBe('NIK KTP sudah dipakai');
  });
});
