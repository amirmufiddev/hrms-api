### Task 7: Dialog impor di halaman Employees

**Files:**

- Modify: `en-hrms-be-fe/frontend/src/lib/api.ts` (objek `employeesApi`)
- Create: `en-hrms-be-fe/frontend/src/components/employees/EmployeeImportDialog.tsx`
- Test: `en-hrms-be-fe/frontend/src/components/employees/EmployeeImportDialog.test.tsx`
- Modify: `en-hrms-be-fe/frontend/src/app/(protected)/employees/page.tsx` (blok tombol di samping Add Employee)

**Interfaces:**

- Consumes: endpoint Task 6.
- Produces: `employeesApi.downloadImportTemplate()`, `employeesApi.enqueueImport(file: File, nikPrefix: string)`, `employeesApi.getImportStatus(jobId: string)`.

- [ ] **Step 1: Write the failing test**

```tsx
import { render, screen } from '@testing-library/react';
import { EmployeeImportDialog } from './EmployeeImportDialog';

jest.mock('@/lib/api', () => ({
  employeesApi: {
    getImportStatus: jest.fn().mockResolvedValue({
      data: {
        jobId: 'job-1',
        state: 'active',
        progress: { total: 10, processed: 4, created: 3, failed: 1, errors: [{ row: 5, message: 'Departemen tidak ditemukan' }] },
      },
    }),
  },
}));

describe('EmployeeImportDialog', () => {
  it('shows progress counts from the job status', async () => {
    render(
      <EmployeeImportDialog open jobId="job-1" onClose={jest.fn()} onCompleted={jest.fn()} />,
    );

    expect(await screen.findByText('3 berhasil')).toBeInTheDocument();
    expect(screen.getByText('1 gagal')).toBeInTheDocument();
    expect(screen.getByText('Baris 5: Departemen tidak ditemukan')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `cd en-hrms-be-fe/frontend && yarn test src/components/employees/EmployeeImportDialog.test.tsx --no-coverage`

Expected: FAIL with module not found.

- [ ] **Step 3: Write minimal implementation**

Pada `employeesApi`:

```ts
downloadImportTemplate: () =>
  api.get('/employees/import/template', { responseType: 'blob' }),
enqueueImport: (file: File, nikPrefix: string) => {
  const body = new FormData();
  body.append('file', file);
  body.append('nikPrefix', nikPrefix);
  return api.post<{ jobId: string }>('/employees/import', body, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
},
getImportStatus: (jobId: string) =>
  api.get<{
    jobId: string;
    state: 'waiting' | 'active' | 'completed' | 'failed';
    progress: {
      total: number;
      processed: number;
      created: number;
      failed: number;
      errors: { row: number; message: string }[];
    };
    failedReason?: string;
  }>(`/employees/import/${jobId}`),
```

`EmployeeImportDialog` memakai `Modal` yang sudah ada. Saat `jobId` kosong, tampilkan input prefix dan input file `.xlsx`, plus tombol unduh template. Prefix yang tidak lolos `/^[1-9]\d$/` menampilkan `Prefix NIK harus 2 digit dari 10 sampai 99` dan tidak mengunggah. Setelah `enqueueImport` sukses, simpan `jobId` dan poll `getImportStatus` setiap 1000 ms. Tampilkan batang progress `processed / total`, teks `N berhasil`, teks `N gagal`, dan `Baris {row}: {message}`. Pada `completed`, panggil `onCompleted` sekali. Pada `failed`, tampilkan `failedReason`. Pada response 409, ambil `jobId` dari body dan lanjut menampilkan progress job itu.

Di `employees/page.tsx`, di dalam `Can permission="employees:create"` dan di sebelah kiri tombol Add Employee, tambahkan tombol `Unduh template` dan `Import`. `Import` membuka dialog. `onCompleted` memanggil ulang pemuatan daftar karyawan.

- [ ] **Step 4: Run test to verify it passes**

Run: `cd en-hrms-be-fe/frontend && yarn test src/components/employees/EmployeeImportDialog.test.tsx --no-coverage`

Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add en-hrms-be-fe/frontend/src/lib/api.ts en-hrms-be-fe/frontend/src/components/employees/EmployeeImportDialog.tsx en-hrms-be-fe/frontend/src/components/employees/EmployeeImportDialog.test.tsx en-hrms-be-fe/frontend/src/app/\(protected\)/employees/page.tsx
git commit -m "feat: show employee import progress on the employees page"
```
