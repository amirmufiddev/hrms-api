import { Injectable } from '@nestjs/common';
import { SsoHttpClient } from './sso-http.client';

export type SsoDepartmentClassification =
  | 'DIVISION'
  | 'DEPARTMENT'
  | 'PROFIT_CENTER'
  | 'SUB_PROFIT_CENTER';

export interface SsoDepartmentItem {
  id: string;
  code: string | null;
  name: string;
  companyId: string | null;
  parentId: string | null;
  description: string | null;
  classification: SsoDepartmentClassification | null;
  path?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface CreateSsoDepartmentDto {
  name: string;
  code?: string;
  companyId: string;
  parentId?: string | null;
  classification?: SsoDepartmentClassification;
  description?: string | null;
}

export interface UpdateSsoDepartmentDto {
  name?: string;
  code?: string;
  parentId?: string | null;
  classification?: SsoDepartmentClassification;
  description?: string | null;
}

export interface SsoDepartmentListResponse {
  statusCode: number;
  message: string;
  data: SsoDepartmentItem[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

@Injectable()
export class DepartmentSsoClient extends SsoHttpClient {
  async listByCompany(companyId: string): Promise<SsoDepartmentItem[]> {
    const res = await this.get<SsoDepartmentListResponse>(
      `/api/departments?companyId=${encodeURIComponent(companyId)}&limit=1000`,
    );
    return res.data ?? [];
  }

  async getById(id: string): Promise<SsoDepartmentItem> {
    const res = await this.get<{
      statusCode: number;
      message: string;
      data: SsoDepartmentItem;
    }>(`/api/departments/${encodeURIComponent(id)}`);
    return res.data;
  }

  async create(dto: CreateSsoDepartmentDto): Promise<SsoDepartmentItem> {
    const res = await this.post<{
      statusCode: number;
      message: string;
      data: SsoDepartmentItem;
    }>('/api/departments', dto);
    return res.data;
  }

  async update(
    id: string,
    dto: UpdateSsoDepartmentDto,
  ): Promise<SsoDepartmentItem> {
    const res = await this.put<{
      statusCode: number;
      message: string;
      data: SsoDepartmentItem;
    }>(`/api/departments/${encodeURIComponent(id)}`, dto);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.deleteRequest(`/api/departments/${encodeURIComponent(id)}`);
  }
}
