# Frontend Handover: SSO Approval Workflow - Expense Claims (Klaim Pengeluaran)

Dokumen ini menjelaskan integrasi SSO Approval Engine untuk modul **Expense Claims** (`ExpenseClaim`) di HRMS Frontend.

---

## 1. Overview Arsitektur
Alur approval klaim pengeluaran diatur secara terpusat oleh **SSO Approval Engine** (`eal-rbac-api`).
- Backend HRMS menyimpan `approval_request_id` (ID instance approval di SSO).
- Informasi tahapan approval aktif (`currentApproval`) di-enrich otomatis oleh backend HRMS dari SSO saat list atau detail klaim di-fetch.

---

## 2. Struktur Data `ExpenseClaim` di Frontend

Interface `ExpenseClaim` di `frontend/src/types/index.ts`:

```typescript
export type ExpenseClaimStatus = 'DRAFT' | 'SUBMITTED' | 'APPROVED' | 'REJECTED' | 'REIMBURSED';

export interface ExpenseClaim {
  id: string;
  tenantId: string;
  employeeId: string;
  categoryId: string;
  amount: number;
  description: string;
  expenseDate: string;
  receiptId?: string;
  status: ExpenseClaimStatus;
  
  // SSO Approval Fields
  approvalRequestId?: string | null;
  currentApproval?: {
    stepName?: string;     // Contoh: "Manager Review", "Finance Validation", "HR Final Approval"
    approverName?: string; // Nama user/role approver saat ini
    approverId?: string;   // ID approver aktif
    status?: string;       // "PENDING"
  } | null;

  approverId?: string;
  approverNote?: string;
  approvedAt?: string;
  reimbursedAt?: string;
  createdAt: string;
  updatedAt: string;
  category?: { id: string; name: string; code: string };
  employee?: {
    id: string;
    employeeCode: string;
    firstName: string;
    lastName: string;
    designation?: string;
    department?: { name: string };
  };
}
```

---

## 3. Panduan Implementasi UI

### 3.1 Daftar Klaim (`/expenses` atau `/my-claims`)
1. **Kolom / Badge "Status"**:
   - Jika `status === 'SUBMITTED'` dan ada `currentApproval`:
     - Tampilkan badge kuning: `Menunggu: {currentApproval.stepName}`
     - Hover/Tooltip: `Approver: {currentApproval.approverName}`
   - Jika `status === 'APPROVED'`: Badge hijau "Disetujui"
   - Jika `status === 'REJECTED'`: Badge merah "Ditolak"
   - Jika `status === 'REIMBURSED'`: Badge biru/teal "Telah Dicairkan"
   - Jika `status === 'DRAFT'`: Badge abu-abu "Draft"

### 3.2 Halaman Persetujuan HR / Manager (`/approvals/expenses`)
- List klaim pending memuat `currentApproval.stepName`.
- Tombol **Approve** dan **Reject** memanggil:
  - Approve: `POST /api/expenses/claims/:id/approve` dengan body `{ approverNote?: string }`
  - Reject: `POST /api/expenses/claims/:id/reject` dengan body `{ approverNote: string }`
- Backend akan otomatis mem-forward keputusan persetujuan ke SSO Engine.

---

## 4. Webhook Realtime Update
Ketika approver menyetujui atau menolak request di SSO Portal (atau di HRMS), SSO mengirim webhook ke HRMS untuk mengupdate status klaim lokal menjadi `APPROVED` atau `REJECTED` dan mendispatch notifikasi in-app & email secara realtime.
