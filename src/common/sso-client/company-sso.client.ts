import { Injectable } from '@nestjs/common';
import { SsoHttpClient } from './sso-http.client';

export interface SsoCompanyListParams {
  search?: string;
  page?: number;
  limit?: number;
}

/**
 * SSO company shape — do not rely on `isActive` (not in SSO schema).
 */
export interface SsoCompanyItem {
  id: string;
  code: string | null;
  name: string;
  address: string | null;
  phone?: string | null;
  logo?: string | null;
  createdAt: string;
}

export interface SsoCompanyListMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface SsoCompanyListResponse {
  statusCode: number;
  message: string;
  data: SsoCompanyItem[];
  meta?: SsoCompanyListMeta;
}

export interface UpdateSsoCompanyDto {
  name?: string;
  address?: string | null;
  phone?: string | null;
}

@Injectable()
export class CompanySsoClient extends SsoHttpClient {
  async listCompanies(params: SsoCompanyListParams = {}): Promise<SsoCompanyListResponse> {
    const query = new URLSearchParams();
    if (params.search) query.set('search', params.search);
    if (params.page !== undefined) query.set('page', String(params.page));
    if (params.limit !== undefined) query.set('limit', String(params.limit));

    const qs = query.toString();
    return this.get<SsoCompanyListResponse>(`/api/companies${qs ? `?${qs}` : ''}`);
  }

  async getCompanyById(id: string): Promise<SsoCompanyItem> {
    const res = await this.get<{
      statusCode: number;
      message: string;
      data: SsoCompanyItem;
    }>(`/api/companies/${encodeURIComponent(id)}`);
    return res.data;
  }

  async update(id: string, dto: UpdateSsoCompanyDto): Promise<SsoCompanyItem> {
    const res = await this.patch<{
      statusCode: number;
      message: string;
      data: SsoCompanyItem;
    }>(`/api/companies/${encodeURIComponent(id)}`, dto);
    return res.data;
  }
}
