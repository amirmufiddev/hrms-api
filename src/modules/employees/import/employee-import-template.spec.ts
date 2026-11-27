import ExcelJS from 'exceljs';
import { buildEmployeeImportTemplate } from './employee-import-template';
import { IMPORT_HEADERS } from './employee-import.types';

describe('buildEmployeeImportTemplate', () => {
  it('writes headers on Data and one sample on Contoh', async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(
      (await buildEmployeeImportTemplate()) as unknown as Awaited<
        ReturnType<InstanceType<typeof ExcelJS.Workbook>['xlsx']['writeBuffer']>
      >,
    );

    const data = workbook.getWorksheet('Data');
    const sample = workbook.getWorksheet('Contoh');
    const headers = IMPORT_HEADERS.map((_, index) => data?.getRow(1).getCell(index + 1).value);

    expect(headers).toEqual([...IMPORT_HEADERS]);
    expect(data?.rowCount).toBe(1);
    expect(sample?.getRow(2).getCell(1).value).toBe('Amir');
    expect(sample?.getRow(2).getCell(3).value).toBe('3201010101010001');
    expect(sample?.getRow(2).getCell(5).value).toBe('Laki-laki');
    expect(sample?.getRow(2).getCell(6).value).toBe('1234567890');
    expect(sample?.getRow(2).getCell(7).value).toBe('BCA');
    expect(sample?.getRow(2).getCell(8).value).toBe('Engineering');
    expect(sample?.getRow(2).getCell(10).value).toBe('PERMANENT');
    expect(data?.getColumn(3).numFmt).toBe('@');
    expect(data?.getColumn(6).numFmt).toBe('@');
    expect(sample?.getColumn(3).numFmt).toBe('@');
    expect(sample?.getColumn(6).numFmt).toBe('@');
  });
});
