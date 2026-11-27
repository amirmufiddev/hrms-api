### Task 5: Menyimpan baris tanpa SSO

**Files:**

- Create: `en-hrms-be-fe/backend/src/modules/employees/import/employee-import.service.ts`
- Test: `en-hrms-be-fe/backend/src/modules/employees/import/employee-import.service.spec.ts`

**Interfaces:**

- Consumes: `nextEmployeeCode`, `parseEmployeeSheet`, `jakartaJoinDate`, `ParsedEmployeeRow`.
- Produces:
  - `EmployeeImportService.importRows(tenantId: string, prefix: string, rows: ParsedEmployeeRow[], existingEmails: Set<string>): Promise<{ created: number; failed: number; errors: { row: number; message: string }[] }>`

- [ ] **Step 1: Write the failing test**

```ts
import { EmployeeImportService } from './employee-import.service';

describe('EmployeeImportService.importRows', () => {
  const prisma = {
    employee: {
      findMany: jest.fn().mockResolvedValue([{ employeeCode: '900042' }]),
      findFirst: jest.fn().mockResolvedValue(null),
      create: jest.fn().mockResolvedValue({ id: 'emp-1' }),
    },
  };

  it('creates the next code and stores a null email', async () => {
    const service = new EmployeeImportService(prisma as never);
    const result = await service.importRows(
      'tenant-1',
      '90',
      [
        {
          row: 2,
          firstName: 'Amir',
          lastName: 'Mufid',
          departmentId: 'dept-1',
          employmentType: 'PERMANENT',
          email: null,
          phone: null,
          joinDate: null,
        },
      ],
      new Set(),
    );

    expect(result.created).toBe(1);
    expect(prisma.employee.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          tenantId: 'tenant-1',
          employeeCode: '900043',
          email: null,
          ssoUserId: null,
          departmentId: 'dept-1',
          employmentType: 'PERMANENT',
          status: 'ACTIVE',
        }),
      }),
    );
  });

  it('records a row failure when the email already exists and continues', async () => {
    prisma.employee.findFirst.mockResolvedValueOnce({ id: 'existing' });
    const service = new EmployeeImportService(prisma as never);
    const result = await service.importRows(
      'tenant-1',
      '90',
      [
        {
          row: 2,
          firstName: 'Amir',
          lastName: 'Mufid',
          departmentId: 'dept-1',
          employmentType: 'PERMANENT',
          email: 'amir@eiger.test',
          phone: null,
          joinDate: '2026-01-15',
        },
        {
          row: 3,
          firstName: 'Sari',
          lastName: 'Putri',
          departmentId: 'dept-1',
          employmentType: 'INTERN',
          email: null,
          phone: null,
          joinDate: null,
        },
      ],
      new Set(['amir@eiger.test']),
    );

    expect(result.failed).toBe(1);
    expect(result.created).toBe(1);
    expect(result.errors[0].message).toBe('Email sudah dipakai');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd en-hrms-be-fe/backend && yarn test src/modules/employees/import/employee-import.service.spec.ts --no-coverage`

Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

`EmployeeImportService` menerima `PrismaService`. `importRows`:

- Mengambil `employeeCode` 6 digit di tenant yang diawali prefix lewat `findMany`.
- Menyimpan daftar kode itu di memori dan memanggil `nextEmployeeCode` setiap baris berhasil, lalu mendorong kode baru ke daftar supaya baris berikutnya tidak bentrok.
- Sebelum `create`, kalau `email` ada di `existingEmails` atau `findFirst({ where: { tenantId, email } })` ketemu, catat `Email sudah dipakai` dan lanjut.
- `create` mengisi `tenantId`, `employeeCode`, `firstName`, `lastName`, `email`, `phone`, `departmentId`, `employmentType`, `joinDate` (`row.joinDate` sebagai `new Date(row.joinDate + 'T00:00:00.000Z')` atau `jakartaJoinDate()`), `status: 'ACTIVE'`, `ssoUserId: null`.
- Kesalahan `nextEmployeeCode` dan kesalahan create dicatat di `errors`, tidak dilempar.
- Tidak memanggil `EmployeesService.create` dan tidak memanggil klien SSO.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd en-hrms-be-fe/backend && yarn test src/modules/employees/import/employee-import.service.spec.ts --no-coverage`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add en-hrms-be-fe/backend/src/modules/employees/import/employee-import.service.ts en-hrms-be-fe/backend/src/modules/employees/import/employee-import.service.spec.ts
git commit -m "feat: create imported employees without SSO accounts"
```

