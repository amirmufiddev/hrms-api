import { Injectable } from '@nestjs/common';
import { SsoHttpClient } from './sso-http.client';

export interface SubmitApprovalBody {
  companyId: string;
  moduleKey: string;
  recordId: string;
  recordNumber?: string;
  recordAmount?: number;
  contextData?: Record<string, any>;
  submittedBy?: string;
  actedBy?: string;
}

export interface ApprovalResponse {
  instanceId: string;
  status: string;
  currentApproverUserId?: string | null;
}

export interface ActApprovalBody {
  comments?: string;
  actedBy?: string;
}

export interface ReassignApprovalBody {
  fromUserId: string;
  toUserId: string;
  comments?: string;
  actedBy?: string;
}

export interface ActiveStepResponse {
  step_name?: string;
  approver_name?: string;
  approver_id?: string;
  status?: string;
}

export interface InstanceSummaryResponse {
  status?: string;
  completedAt?: string | null;
  isCompleted?: boolean;
}

@Injectable()
export class ApprovalSsoClient extends SsoHttpClient {
  async submit(body: SubmitApprovalBody): Promise<ApprovalResponse> {
    return this.post<ApprovalResponse>('/api/approvals/submit', body);
  }

  async approve(
    instanceId: string,
    body: ActApprovalBody = {},
  ): Promise<ApprovalResponse> {
    return this.post<ApprovalResponse>(
      `/api/approvals/${encodeURIComponent(instanceId)}/approve`,
      body,
    );
  }

  async reject(
    instanceId: string,
    body: ActApprovalBody = {},
  ): Promise<ApprovalResponse> {
    return this.post<ApprovalResponse>(
      `/api/approvals/${encodeURIComponent(instanceId)}/reject`,
      body,
    );
  }

  async revise(
    instanceId: string,
    body: ActApprovalBody = {},
  ): Promise<ApprovalResponse> {
    return this.post<ApprovalResponse>(
      `/api/approvals/${encodeURIComponent(instanceId)}/revise`,
      body,
    );
  }

  async cancel(
    instanceId: string,
    body: ActApprovalBody = {},
  ): Promise<ApprovalResponse> {
    return this.post<ApprovalResponse>(
      `/api/approvals/${encodeURIComponent(instanceId)}/cancel`,
      body,
    );
  }

  async reassign(
    instanceId: string,
    body: ReassignApprovalBody,
  ): Promise<ApprovalResponse> {
    return this.post<ApprovalResponse>(
      `/api/approvals/${encodeURIComponent(instanceId)}/reassign`,
      body,
    );
  }

  async getActiveStep(
    instanceId: string,
  ): Promise<ActiveStepResponse | null> {
    try {
      return await this.get<ActiveStepResponse>(
        `/api/approvals/${encodeURIComponent(instanceId)}/active-step`,
      );
    } catch {
      return null;
    }
  }

  async getInstanceSummary(
    instanceId: string,
  ): Promise<InstanceSummaryResponse | null> {
    try {
      return await this.get<InstanceSummaryResponse>(
        `/api/approvals/instance/${encodeURIComponent(instanceId)}/summary`,
      );
    } catch {
      return null;
    }
  }
}
