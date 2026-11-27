### Task 6: Antrean, unggah, dan status

**Files:**

- Modify: `en-hrms-be-fe/backend/src/common/queue/queue.module.ts`
- Create: `en-hrms-be-fe/backend/src/modules/employees/import/employee-import.processor.ts`
- Create: `en-hrms-be-fe/backend/src/modules/employees/import/employee-import.controller.ts`
- Modify: `en-hrms-be-fe/backend/src/modules/employees/employees.module.ts`
- Test: `en-hrms-be-fe/backend/src/modules/employees/import/employee-import.controller.spec.ts`
- Test: `en-hrms-be-fe/backend/src/modules/employees/import/employee-import.processor.spec.ts`

**Interfaces:**

- Consumes: `buildEmployeeImportTemplate`, `assertImportHeaders`, `parseEmployeeSheet`, `EmployeeImportService.importRows`, `assertNikPrefix`.
- Produces:
  - `POST /api/employees/import`
  - `GET /api/employees/import/template`
  - `GET /api/employees/import/:jobId`
  - Job data `{ tenantId: string; filePath: string; nikPrefix: string }`
  - Progress `{ total: number; processed: number; created: number; failed: number; errors: { row: number; message: string }[] }`

- [ ] **Step 1: Write the failing controller test**

```ts
import { ConflictException } from '@nestjs/common';
import { getQueueToken } from '@nestjs/bullmq';
import { Test } from '@nestjs/testing';
import { EmployeeImportController } from './employee-import.controller';
import { overrideJwtAuthGuard } from '../../../test/helpers';

describe('EmployeeImportController', () => {
  const queue = {
    add: jest.fn().mockResolvedValue({ id: 'job-1' }),
    getJobs: jest.fn().mockResolvedValue([]),
    getJob: jest.fn(),
  };

  it('returns the job id without importing rows', async () => {
    const module = await overrideJwtAuthGuard(
      Test.createTestingModule({
        controllers: [EmployeeImportController],
        providers: [{ provide: getQueueToken('employee-import'), useValue: queue }],
      }),
    ).compile();
    const controller = module.get(EmployeeImportController);

    await expect(
      controller.enqueue(
        { tenantId: 'tenant-1' } as never,
        { nikPrefix: '90' },
        {
          buffer: Buffer.from('xlsx'),
          originalname: 'karyawan.xlsx',
          size: 4,
          mimetype: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        } as never,
      ),
    ).resolves.toEqual({ jobId: 'job-1' });
    expect(queue.add).toHaveBeenCalledWith(
      'import',
      expect.objectContaining({ tenantId: 'tenant-1', nikPrefix: '90' }),
    );
  });

  it('rejects a second active import for the same tenant', async () => {
    queue.getJobs.mockResolvedValueOnce([
      { id: 'job-9', data: { tenantId: 'tenant-1' }, getState: async () => 'active' },
    ]);
    const module = await overrideJwtAuthGuard(
      Test.createTestingModule({
        controllers: [EmployeeImportController],
        providers: [{ provide: getQueueToken('employee-import'), useValue: queue }],
      }),
    ).compile();
    const controller = module.get(EmployeeImportController);

    await expect(
      controller.enqueue({ tenantId: 'tenant-1' } as never, { nikPrefix: '90' }, {
        buffer: Buffer.from('xlsx'),
        originalname: 'karyawan.xlsx',
        size: 4,
      } as never),
    ).rejects.toBeInstanceOf(ConflictException);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd en-hrms-be-fe/backend && yarn test src/modules/employees/import/employee-import.controller.spec.ts --no-coverage`

Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

Di `queue.module.ts`, tambahkan `{ name: 'employee-import' }` pada `BullModule.registerQueue` yang sudah ada. Jangan daftarkan processor di sana.

`EmployeeImportController`:

- `@Controller('employees/import')`, guard yang sama dengan `EmployeesController`, izin `employees:create`.
- `GET template` mengirim buffer dari `buildEmployeeImportTemplate` dengan nama `template-import-karyawan.xlsx`.
- `POST` memakai `FileInterceptor('file', { limits: { fileSize: 5 * 1024 * 1024 } })` dan body `nikPrefix`.
- Tolak file kosong, ekstensi selain `.xlsx`, dan prefix lewat `assertNikPrefix`.
- `getJobs(['waiting', 'active'])`. Kalau ada job dengan `data.tenantId` yang sama, lempar `ConflictException` body `{ jobId, state, progress }`.
- Tulis buffer ke `path.join(os.tmpdir(), 'hrms-employee-import', '${randomUUID()}.xlsx')`.
- Baca workbook hanya untuk menghitung baris non-kosong di sheet `Data`. Lebih dari 5000 ditolak sebelum `queue.add`, dan file sementara dihapus.
- `queue.add('import', { tenantId, filePath, nikPrefix })` lalu kembalikan `{ jobId }`.
- `GET :jobId` membaca job. Tenant yang tidak sama mengembalikan 404. State `waiting`, `active`, `completed`, atau `failed`. Progress default nol bila belum ada.

`EmployeeImportProcessor` pada queue `employee-import`:

- Buka file dengan ExcelJS. Sheet `Data` wajib ada.
- Panggil `assertImportHeaders`. Kalau gagal, hapus file dan lempar error supaya state job menjadi `failed`.
- `parseEmployeeSheet` dengan departemen `findMany` tenant itu (`id`, `name`, `code`).
- Kumpulkan email yang sudah ada di tenant untuk email non-kosong pada baris valid.
- Panggil `importRows`.
- `job.updateProgress` setelah parser dan setelah `importRows`, dengan `total` = jumlah `rows + errors` parser, `processed` = total itu, `created`, `failed`, dan `errors` gabungan parser serta service.
- Selalu hapus file di `finally`.

`employees.module.ts` mengimpor `BullModule.registerQueue({ name: 'employee-import' })` hanya bila `process.env.REDIS_ENABLED === 'true'`, lalu menyediakan controller, service, dan processor. Token inject queue: `@InjectQueue('employee-import')`.

Constructor controller menerima `@InjectQueue('employee-import') private readonly queue: Queue`. Di tes, provider-nya `{ provide: getQueueToken('employee-import'), useValue: queue }` dari `@nestjs/bullmq`. Jangan memakai token string `EMPLOYEE_IMPORT_QUEUE`.

- [ ] **Step 4: Run test to verify it passes**

Tambahkan `employee-import.processor.spec.ts` yang memberi workbook dengan header salah dan mengharapkan `unlink` terpanggil serta error `Header sheet Data tidak sesuai template` dilempar sebelum `importRows`.

Run: `cd en-hrms-be-fe/backend && yarn test src/modules/employees/import/employee-import.controller.spec.ts src/modules/employees/import/employee-import.processor.spec.ts --no-coverage`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add en-hrms-be-fe/backend/src/common/queue/queue.module.ts en-hrms-be-fe/backend/src/modules/employees/employees.module.ts en-hrms-be-fe/backend/src/modules/employees/import/employee-import.controller.ts en-hrms-be-fe/backend/src/modules/employees/import/employee-import.processor.ts en-hrms-be-fe/backend/src/modules/employees/import/employee-import.controller.spec.ts en-hrms-be-fe/backend/src/modules/employees/import/employee-import.processor.spec.ts
git commit -m "feat: queue employee spreadsheet imports"
```

