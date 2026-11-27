# Dokumentasi Handover FE: Integrasi SSO Approval Workflow (Leave Request)

Dokumen ini ditujukan untuk tim Frontend (`en-hrms-be-fe/frontend`) mengenai integrasi Approval Workflow terpusat via SSO (`eal-rbac-api`).

---

## 1. Perubahan Kontrak Data (`LeaveRequest`)

Pada response `GET /api/leave/requests/me`, `GET /api/leave/requests/pending-approvals`, dan `GET /api/leave/admin/requests`, setiap item `LeaveRequest` kini dilengkapi informasi approval aktif dari SSO:

```typescript
export interface LeaveRequest {
  id: string;
  tenantId: string;
  employeeId: string;
  leaveTypeId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  totalDays: number;
  reason?: string;
  isHalfDay?: boolean;
  halfDayPeriod?: 'FIRST_HALF' | 'SECOND_HALF';
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'CANCELLED';
  
  // SSO Approval Integration Fields:
  approvalRequestId?: string | null;
  currentApproval?: {
    stepName?: string;       // e.g. "Manager Approval", "HR Division Approval"
    approverName?: string;   // e.g. "John Doe"
    approverId?: string;     // UUID user SSO approver yang sedang ditugaskan
    status?: string;         // "active" | "pending" | "done"
  } | null;

  approverId?: string;
  approver?: Employee;
  approverNote?: string;
  approvedAt?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 2. Panduan Implementasi UI

### A. List & Detail Pengajuan Cuti (Employee View)
- Tampilkan badge / status approval step pada kolom/badge status:
  - Jika `status === 'PENDING'` dan ada `currentApproval.stepName`:
    - Tampilkan badge: `Pending: [currentApproval.stepName]` (Tooltip: `Menunggu persetujuan dari [currentApproval.approverName]`).
  - Jika `status === 'APPROVED'`: Tampilkan badge hijau `Approved`.
  - Jika `status === 'REJECTED'`: Tampilkan badge merah `Rejected`.

### B. Action Approver (Manager / HR Admin View)
- Endpoint aksi approval tetap menggunakan endpoint HRMS yang sudah ada (backend HRMS otomatis mem-forward aksi ke SSO Approval Engine):
  - **Approve**: `POST /api/leave/requests/:id/approve` dengan body `{ approverNote?: string }`
  - **Reject**: `POST /api/leave/requests/:id/reject` dengan body `{ approverNote: string }`
  - **Cancel (oleh pemohon)**: `POST /api/leave/requests/:id/cancel`
- Jika `user.ssoUserId === leaveRequest.currentApproval.approverId`, tampilkan tombol aksi Approve & Reject secara aktif.

---

## 3. Webhook Otomatis

Status akhir pengajuan cuti (`APPROVED`, `REJECTED`, `CANCELLED`) dan rekonsiliasi saldo cuti (`pendingDays` → `usedDays` atau refund) diproses secara real-time via Webhook SSO. Frontend cukup melakukan refresh data (`queryClient.invalidateQueries` / reload) setelah melakukan submit/approve/reject.
