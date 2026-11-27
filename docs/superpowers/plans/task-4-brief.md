### Task 4: File template

**Files:**

- Create: `en-hrms-be-fe/backend/src/modules/employees/import/employee-import-template.ts`
- Test: `en-hrms-be-fe/backend/src/modules/employees/import/employee-import-template.spec.ts`

**Interfaces:**

- Consumes: `IMPORT_HEADERS` dari Task 3.
- Produces: `buildEmployeeImportTemplate(): Promise<Buffer>`

- [ ] **Step 1: Write the failing test**

```ts
import ExcelJS from 'exceljs';
import { buildEmployeeImportTemplate } from './employee-import-template';
import { IMPORT_HEADERS } from './employee-import.types';

describe('buildEmployeeImportTemplate', () => {
  it('writes headers on Data and one sample on Contoh', async () => {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await buildEmployeeImportTemplate());

    const data = workbook.getWorksheet('Data');
    const sample = workbook.getWorksheet('Contoh');
    const headers = IMPORT_HEADERS.map((_, index) => data?.getRow(1).getCell(index + 1).value);

    expect(headers).toEqual([...IMPORT_HEADERS]);
    expect(data?.rowCount).toBe(1);
    expect(sample?.getRow(2).getCell(1).value).toBe('Amir');
    expect(sample?.getRow(2).getCell(4).value).toBe('PERMANENT');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd en-hrms-be-fe/backend && yarn test src/modules/employees/import/employee-import-template.spec.ts --no-coverage`

Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

`buildEmployeeImportTemplate` membuat workbook ExcelJS. Sheet `Data` hanya baris header `IMPORT_HEADERS`. Sheet `Contoh` memakai header yang sama dan satu baris: `Amir`, `Mufid`, `Engineering`, `PERMANENT`, `amir@eiger.test`, `08123456789`, `2026-01-15`. Kembalikan `Buffer.from(await workbook.xlsx.writeBuffer())`.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd en-hrms-be-fe/backend && yarn test src/modules/employees/import/employee-import-template.spec.ts --no-coverage`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add en-hrms-be-fe/backend/src/modules/employees/import/employee-import-template.ts en-hrms-be-fe/backend/src/modules/employees/import/employee-import-template.spec.ts
git commit -m "feat: add the employee import workbook template"
```

