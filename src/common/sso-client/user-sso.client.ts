import { Injectable, Logger } from '@nestjs/common';
import { SsoHttpClient } from './sso-http.client';

export interface SsoUserBrief {
  id: string;
  name: string | null;
  email?: string | null;
}

export interface CreateSsoUserDto {
  email: string;
  name: string;
  nik?: string;
  role?: string;
}

export interface UpdateSsoUserDto {
  name?: string;
  email?: string;
  username?: string;
  nik?: string;
  role?: string;
  departmentId?: string | null;
  companyId?: string | null;
  positionId?: string | null;
}

export interface AssignSsoCompanyDto {
  companyId: string;
  roleName?: string;
}

/**
 * Batch-resolve user IDs → names from SSO, and user CRUD methods.
 */
@Injectable()
export class UserSsoClient extends SsoHttpClient {
  private readonly clientLogger = new Logger(UserSsoClient.name);

  async getUsersByIds(
    ids: (string | null | undefined)[],
  ): Promise<Map<string, SsoUserBrief>> {
    const uniqueIds = [...new Set(ids.filter((id): id is string => Boolean(id)))];

    if (uniqueIds.length === 0) {
      return new Map();
    }

    try {
      const res = await this.post<{ data: SsoUserBrief[] }>('/api/users/batch', {
        ids: uniqueIds,
      });

      const map = new Map<string, SsoUserBrief>();
      for (const user of res?.data ?? []) {
        if (user?.id) map.set(user.id, user);
      }
      return map;
    } catch (err) {
      this.clientLogger.warn(
        `Failed to batch-fetch users from SSO: ${(err as Error).message ?? err}. Returning empty map.`,
      );
      return new Map();
    }
  }

  async create(
    dto: CreateSsoUserDto,
  ): Promise<{ id: string; email: string; name: string }> {
    const res = await this.post<{
      statusCode: number;
      message: string;
      data: { id: string; email: string; name: string };
    }>('/api/users', dto);
    return res.data;
  }

  async update(id: string, dto: UpdateSsoUserDto): Promise<void> {
    await this.patch(`/api/users/${encodeURIComponent(id)}`, dto);
  }

  async assignCompany(id: string, dto: AssignSsoCompanyDto): Promise<void> {
    await this.post(`/api/users/${encodeURIComponent(id)}/companies`, dto);
  }

  async assignPosition(id: string, positionId: string | null): Promise<void> {
    await this.patch(`/api/users/${encodeURIComponent(id)}/position`, {
      positionId,
    });
  }

  async delete(id: string): Promise<void> {
    await this.deleteRequest(`/api/users/${encodeURIComponent(id)}`);
  }
}
