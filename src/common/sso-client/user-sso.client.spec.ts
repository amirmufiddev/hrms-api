import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import {
  UserSsoClient,
  CreateSsoUserDto,
  UpdateSsoUserDto,
  AssignSsoCompanyDto,
} from './user-sso.client';

describe('UserSsoClient', () => {
  let http: {
    get: jest.Mock;
    post: jest.Mock;
    patch: jest.Mock;
    delete: jest.Mock;
  };
  let config: { get: jest.Mock };
  let client: UserSsoClient;

  beforeEach(() => {
    http = {
      get: jest.fn(),
      post: jest.fn(),
      patch: jest.fn(),
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
    client = new UserSsoClient(
      http as unknown as HttpService,
      config as unknown as ConfigService,
    );
  });

  describe('getUsersByIds', () => {
    it('returns empty map if given empty or null array', async () => {
      const res = await client.getUsersByIds([]);
      expect(res.size).toBe(0);
      expect(http.post).not.toHaveBeenCalled();
    });

    it('batch resolves users by ids and returns a map', async () => {
      http.post.mockReturnValue(
        of({
          data: {
            data: [
              { id: 'user-1', name: 'John Doe', email: 'john@example.com' },
              { id: 'user-2', name: 'Jane Doe', email: 'jane@example.com' },
            ],
          },
          status: 200,
        } as AxiosResponse),
      );

      const res = await client.getUsersByIds(['user-1', 'user-2', 'user-1']);
      expect(res.size).toBe(2);
      expect(res.get('user-1')).toEqual({
        id: 'user-1',
        name: 'John Doe',
        email: 'john@example.com',
      });
      expect(http.post).toHaveBeenCalledWith(
        'http://sso.test/api/users/batch',
        { ids: ['user-1', 'user-2'] },
        expect.anything(),
      );
    });

    it('handles SSO errors gracefully and returns empty map', async () => {
      http.post.mockReturnValue(
        of({
          data: null,
          status: 500,
        } as AxiosResponse),
      );
      // or error throwing
      jest.spyOn(http, 'post').mockImplementation(() => {
        throw new Error('SSO unavailable');
      });

      const res = await client.getUsersByIds(['user-1']);
      expect(res.size).toBe(0);
    });
  });

  describe('create', () => {
    it('calls POST /api/users and returns created user', async () => {
      const createdUser = {
        id: 'user-created-1',
        email: 'newuser@example.com',
        name: 'New User',
      };
      http.post.mockReturnValue(
        of({
          data: {
            statusCode: 201,
            message: 'User created successfully',
            data: createdUser,
          },
          status: 201,
        } as AxiosResponse),
      );

      const dto: CreateSsoUserDto = {
        email: 'newuser@example.com',
        name: 'New User',
        nik: '12345',
        role: 'user',
      };

      const res = await client.create(dto);
      expect(res).toEqual(createdUser);
      expect(http.post).toHaveBeenCalledWith(
        'http://sso.test/api/users',
        dto,
        expect.anything(),
      );
    });
  });

  describe('update', () => {
    it('calls PATCH /api/users/:id and resolves void', async () => {
      http.patch.mockReturnValue(
        of({
          data: {
            statusCode: 200,
            message: 'User updated successfully',
          },
          status: 200,
        } as AxiosResponse),
      );

      const dto: UpdateSsoUserDto = {
        name: 'Updated Name',
        nik: '12345',
      };

      await expect(client.update('user-1', dto)).resolves.toBeUndefined();
      expect(http.patch).toHaveBeenCalledWith(
        'http://sso.test/api/users/user-1',
        dto,
        expect.anything(),
      );
    });
  });

  describe('assignCompany', () => {
    it('calls POST /api/users/:id/companies and resolves void', async () => {
      http.post.mockReturnValue(
        of({
          data: {
            statusCode: 200,
            message: 'User assigned to company successfully',
          },
          status: 200,
        } as AxiosResponse),
      );

      const dto: AssignSsoCompanyDto = {
        companyId: 'comp-1',
        roleName: 'admin',
      };

      await expect(client.assignCompany('user-1', dto)).resolves.toBeUndefined();
      expect(http.post).toHaveBeenCalledWith(
        'http://sso.test/api/users/user-1/companies',
        dto,
        expect.anything(),
      );
    });
  });

  describe('assignPosition', () => {
    it('calls PATCH /api/users/:id/position with positionId and resolves void', async () => {
      http.patch.mockReturnValue(
        of({
          data: {
            statusCode: 200,
            message: 'Position assigned to user successfully',
          },
          status: 200,
        } as AxiosResponse),
      );

      await expect(client.assignPosition('user-1', 'pos-123')).resolves.toBeUndefined();
      expect(http.patch).toHaveBeenCalledWith(
        'http://sso.test/api/users/user-1/position',
        { positionId: 'pos-123' },
        expect.anything(),
      );
    });

    it('calls PATCH /api/users/:id/position with null positionId and resolves void', async () => {
      http.patch.mockReturnValue(
        of({
          data: {
            statusCode: 200,
            message: 'Position unassigned from user successfully',
          },
          status: 200,
        } as AxiosResponse),
      );

      await expect(client.assignPosition('user-1', null)).resolves.toBeUndefined();
      expect(http.patch).toHaveBeenCalledWith(
        'http://sso.test/api/users/user-1/position',
        { positionId: null },
        expect.anything(),
      );
    });
  });

  describe('delete', () => {
    it('calls DELETE /api/users/:id and resolves void', async () => {
      http.delete.mockReturnValue(
        of({
          data: {
            statusCode: 200,
            message: 'User deleted successfully',
          },
          status: 200,
        } as AxiosResponse),
      );

      await expect(client.delete('user-1')).resolves.toBeUndefined();
      expect(http.delete).toHaveBeenCalledWith(
        'http://sso.test/api/users/user-1',
        expect.anything(),
      );
    });
  });
});
