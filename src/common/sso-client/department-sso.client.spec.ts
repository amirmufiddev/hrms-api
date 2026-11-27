import { HttpService } from '@nestjs/axios';
import { NotFoundException, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { DepartmentSsoClient } from './department-sso.client';

describe('DepartmentSsoClient', () => {
  let http: { get: jest.Mock; post: jest.Mock; put: jest.Mock; delete: jest.Mock };
  let config: { get: jest.Mock };
  let client: DepartmentSsoClient;

  beforeEach(() => {
    http = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };
    config = {
      get: jest.fn((key: string) => {
        const map: Record<string, string> = {
          SSO_API_BASE_URL: 'http://sso.test',
          SSO_SERVICE_API_KEY: 'test-api-key-at-least-32-chars-long!!',
          SSO_SERVICE_APP_KEY: 'eal-hrms',
          SSO_SERVICE_APP_NAME: 'HRMS',
        };
        return map[key];
      }),
    };
    client = new DepartmentSsoClient(
      http as unknown as HttpService,
      config as unknown as ConfigService,
    );
  });

  it('lists departments by company with limit 1000', async () => {
    http.get.mockReturnValue(
      of({ data: { data: [] }, status: 200 } as AxiosResponse),
    );

    await expect(client.listByCompany('co-1')).resolves.toEqual([]);
    expect(http.get).toHaveBeenCalledWith(
      'http://sso.test/api/departments?companyId=co-1&limit=1000',
      expect.anything(),
    );
  });

  it('getById uses GET /api/departments/:id only', async () => {
    const dept = { id: 'dept-1', name: 'Engineering' };
    http.get.mockReturnValue(
      of({ data: { data: dept }, status: 200 } as AxiosResponse),
    );

    await expect(client.getById('dept-1')).resolves.toEqual(dept);
    expect(http.get).toHaveBeenCalledTimes(1);
    expect(http.get).toHaveBeenCalledWith(
      'http://sso.test/api/departments/dept-1',
      expect.anything(),
    );
  });

  it('getById does not fall back to list on non-404 errors', async () => {
    const error = {
      response: { status: 503 },
      message: 'Service Unavailable',
      isAxiosError: true,
    } as AxiosError;
    http.get.mockReturnValue(throwError(() => error));

    await expect(client.getById('dept-1')).rejects.toBeInstanceOf(
      ServiceUnavailableException,
    );
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  it('getById throws NotFoundException on 404', async () => {
    const error = {
      response: { status: 404 },
      message: 'Not Found',
      isAxiosError: true,
    } as AxiosError;
    http.get.mockReturnValue(throwError(() => error));

    await expect(client.getById('dept-1')).rejects.toBeInstanceOf(NotFoundException);
    expect(http.get).toHaveBeenCalledTimes(1);
  });

  describe('create', () => {
    it('calls POST /api/departments and returns created department', async () => {
      const createdDept = {
        id: 'dept-new',
        name: 'Human Resources',
        code: 'HR',
        companyId: 'co-1',
        parentId: null,
        classification: 'DEPARTMENT',
        description: 'HR Dept',
      };
      http.post.mockReturnValue(
        of({
          data: {
            statusCode: 201,
            message: 'Department created successfully',
            data: createdDept,
          },
          status: 201,
        } as AxiosResponse),
      );

      const dto = {
        name: 'Human Resources',
        code: 'HR',
        companyId: 'co-1',
        parentId: null,
        classification: 'DEPARTMENT' as const,
        description: 'HR Dept',
      };

      const res = await client.create(dto);
      expect(res).toEqual(createdDept);
      expect(http.post).toHaveBeenCalledWith(
        'http://sso.test/api/departments',
        dto,
        expect.anything(),
      );
    });
  });

  describe('update', () => {
    it('calls PUT /api/departments/:id and returns updated department', async () => {
      const updatedDept = {
        id: 'dept-1',
        name: 'People Operations',
        code: 'PO',
        companyId: 'co-1',
        parentId: null,
        classification: 'DEPARTMENT',
        description: 'Updated HR',
      };
      http.put.mockReturnValue(
        of({
          data: {
            statusCode: 200,
            message: 'Department updated successfully',
            data: updatedDept,
          },
          status: 200,
        } as AxiosResponse),
      );

      const dto = {
        name: 'People Operations',
        code: 'PO',
        classification: 'DEPARTMENT' as const,
      };

      const res = await client.update('dept-1', dto);
      expect(res).toEqual(updatedDept);
      expect(http.put).toHaveBeenCalledWith(
        'http://sso.test/api/departments/dept-1',
        dto,
        expect.anything(),
      );
    });
  });

  describe('delete', () => {
    it('calls DELETE /api/departments/:id and resolves void', async () => {
      http.delete.mockReturnValue(
        of({
          data: {
            statusCode: 200,
            message: 'Department deleted successfully',
          },
          status: 200,
        } as AxiosResponse),
      );

      await expect(client.delete('dept-1')).resolves.toBeUndefined();
      expect(http.delete).toHaveBeenCalledWith(
        'http://sso.test/api/departments/dept-1',
        expect.anything(),
      );
    });
  });
});
