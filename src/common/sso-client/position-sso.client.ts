import { Injectable } from '@nestjs/common';
import { SsoHttpClient } from './sso-http.client';

export interface SsoPositionItem {
  id: string;
  code: string | null;
  name: string;
  companyId: string;
  departmentId: string | null;
  parentId: string | null;
  description: string | null;
  path?: string;
  level?: 'COMPANY' | 'DIVISION' | 'DEPARTMENT';
  createdAt?: string;
  updatedAt?: string;
}

export interface SsoPositionTreeNode {
  id: string;
  code: string;
  name: string;
  parentId: string | null;
  departmentId: string | null;
  departmentName: string | null;
  departmentClassification: string | null;
  companyId: string;
  description: string | null;
  path: string;
  level: 'COMPANY' | 'DIVISION' | 'DEPARTMENT';
  users?: {
    id: string;
    name: string | null;
    email: string;
    image: string | null;
  }[];
  children: SsoPositionTreeNode[];
}

export interface SsoPositionListResponse {
  statusCode: number;
  message: string;
  data: SsoPositionItem[];
  meta?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface CreateSsoPositionDto {
  name: string;
  code?: string;
  companyId: string;
  departmentId?: string | null;
  parentId?: string | null;
  description?: string | null;
}

export interface UpdateSsoPositionDto {
  name?: string;
  code?: string;
  departmentId?: string | null;
  parentId?: string | null;
  description?: string | null;
}

@Injectable()
export class PositionSsoClient extends SsoHttpClient {
  async listByCompany(companyId: string): Promise<SsoPositionItem[]> {
    const res = await this.get<SsoPositionListResponse>(
      `/api/positions?companyId=${encodeURIComponent(companyId)}&limit=1000`,
    );
    return res.data ?? [];
  }

  async getTree(companyId: string): Promise<SsoPositionTreeNode[]> {
    const res = await this.get<{
      statusCode: number;
      message: string;
      data: SsoPositionTreeNode[];
    }>(`/api/positions/tree/${encodeURIComponent(companyId)}`);
    return res.data ?? [];
  }

  async getById(id: string): Promise<SsoPositionItem> {
    const res = await this.get<{
      statusCode: number;
      message: string;
      data: SsoPositionItem;
    }>(`/api/positions/${encodeURIComponent(id)}`);
    return res.data;
  }

  async create(dto: CreateSsoPositionDto): Promise<SsoPositionItem> {
    const res = await this.post<{
      statusCode: number;
      message: string;
      data: SsoPositionItem;
    }>('/api/positions', dto);
    return res.data;
  }

  async update(
    id: string,
    dto: UpdateSsoPositionDto,
  ): Promise<SsoPositionItem> {
    const res = await this.put<{
      statusCode: number;
      message: string;
      data: SsoPositionItem;
    }>(`/api/positions/${encodeURIComponent(id)}`, dto);
    return res.data;
  }

  async delete(id: string): Promise<void> {
    await this.deleteRequest(`/api/positions/${encodeURIComponent(id)}`);
  }
}
