import { EmployeeImportProcessor } from './employee-import.processor';
import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import * as ExcelJS from 'exceljs';
import { EmployeeImportService } from './employee-import.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('EmployeeImportProcessor', () => {
  const importRows = jest.fn();
  const prisma = {
    department: { findMany: jest.fn().mockResolvedValue([]) },
    designation: { findMany: jest.fn().mockResolvedValue([]) },
    employee: { findMany: jest.fn().mockResolvedValue([]) },
  };

  let processor: EmployeeImportProcessor;

  beforeEach(() => {
    importRows.mockReset();
    processor = new EmployeeImportProcessor(
      prisma as unknown as PrismaService,
      { importRows } as unknown as EmployeeImportService,
    );
  });

  it('deletes the file and throws on invalid headers before importRows', async () => {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Data');
    sheet.addRow(['Salah', 'Header']);

    const filePath = path.join(os.tmpdir(), `hrms-import-test-${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(filePath);

    const job = {
      id: 'job-1',
      data: { tenantId: 'tenant-1', filePath, nikPrefix: '90' },
      updateProgress: jest.fn(),
    };

    await expect(processor.process(job as never)).rejects.toThrow(
      'Header sheet Data tidak sesuai template',
    );
    await expect(fs.access(filePath)).rejects.toThrow();
    expect(importRows).not.toHaveBeenCalled();
  });

  it('keeps the spreadsheet row number when a blank row is skipped by Excel', async () => {
    prisma.department.findMany.mockResolvedValue([
      { id: 'dept-1', name: 'Engineering', code: 'ENG' },
    ]);
    prisma.designation.findMany.mockResolvedValue([
      { id: 'desig-1', name: 'Staff', code: 'STF' },
    ]);
    importRows.mockResolvedValue({ created: 2, failed: 0, errors: [] });

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Data');
    sheet.addRow([
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
    ]);
    sheet.addRow(['Amir', 'Mufid', '3201010101010001', '0812', '', '1234567890', 'BCA', 'ENG', 'STF', 'PERMANENT', '', '']);
    const budi = sheet.getRow(4);
    budi.getCell(1).value = 'Budi';
    budi.getCell(2).value = 'Santoso';
    budi.getCell(3).value = '3201010101010002';
    budi.getCell(6).value = '9876543210';
    budi.getCell(7).value = 'Mandiri';
    budi.getCell(8).value = 'ENG';
    budi.getCell(9).value = 'Staff';
    budi.getCell(10).value = 'CONTRACT';

    const filePath = path.join(os.tmpdir(), `hrms-import-blank-${Date.now()}.xlsx`);
    await workbook.xlsx.writeFile(filePath);

    const job = {
      id: 'job-2',
      data: { tenantId: 'tenant-1', filePath, nikPrefix: '90' },
      updateProgress: jest.fn(),
    };

    await processor.process(job as never);

    expect(importRows).toHaveBeenCalledWith(
      'tenant-1',
      '90',
      [
        expect.objectContaining({ row: 2, firstName: 'Amir' }),
        expect.objectContaining({ row: 4, firstName: 'Budi' }),
      ],
      expect.any(Set),
    );
  });
});
