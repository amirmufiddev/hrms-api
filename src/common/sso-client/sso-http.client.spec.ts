import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { AxiosError, AxiosResponse } from 'axios';
import { SsoHttpClient } from './sso-http.client';

class TestClient extends SsoHttpClient {
  callGet(path: string) {
    return this.get(path);
  }

  callPost(path: string, body: unknown) {
    return this.post(path, body);
  }

  callPut(path: string, body: unknown) {
    return (this as any).put(path, body);
  }

  callPatch(path: string, body: unknown) {
    return (this as any).patch(path, body);
  }

  callDelete(path: string) {
    return (this as any).deleteRequest(path);
  }
}

describe('SsoHttpClient', () => {
  let http: {
    get: jest.Mock;
    post: jest.Mock;
    put: jest.Mock;
    patch: jest.Mock;
    delete: jest.Mock;
  };
  let config: { get: jest.Mock };
  let client: TestClient;

  beforeEach(() => {
    http = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
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
    client = new TestClient(
      http as unknown as HttpService,
      config as unknown as ConfigService,
    );
  });

  describe('GET', () => {
    it('returns data on successful GET', async () => {
      const payload = { ok: true };
      http.get.mockReturnValue(
        of({ data: payload, status: 200 } as AxiosResponse),
      );

      await expect(client.callGet('/api/companies')).resolves.toEqual(payload);
      expect(http.get).toHaveBeenCalledWith(
        'http://sso.test/api/companies',
        expect.objectContaining({
          headers: expect.objectContaining({
            'api-key': 'test-api-key-at-least-32-chars-long!!',
            'app-key': 'eal-hrms',
            'app-name': 'HRMS',
          }),
          timeout: 10_000,
        }),
      );
    });

    it('throws ServiceUnavailableException on status 500', async () => {
      const error = {
        response: { status: 500 },
        message: 'Internal Server Error',
        isAxiosError: true,
      } as AxiosError;
      http.get.mockReturnValue(throwError(() => error));

      await expect(client.callGet('/api/companies')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
    });

    it('throws NotFoundException on status 404', async () => {
      const error = {
        response: { status: 404, data: { message: 'Company not found' } },
        message: 'Not Found',
        isAxiosError: true,
      } as AxiosError;
      http.get.mockReturnValue(throwError(() => error));

      await expect(client.callGet('/api/companies/missing')).rejects.toThrow(
        NotFoundException,
      );
      await expect(client.callGet('/api/companies/missing')).rejects.toThrow(
        'Company not found',
      );
    });

    it('throws BadRequestException on status 400', async () => {
      const error = {
        response: { status: 400, data: { message: 'Invalid query parameter' } },
        message: 'Bad Request',
        isAxiosError: true,
      } as AxiosError;
      http.get.mockReturnValue(throwError(() => error));

      await expect(client.callGet('/api/companies')).rejects.toThrow(
        BadRequestException,
      );
    });

    it('menggunakan errors SSO saat message hanya Validation failed', async () => {
      const error = {
        response: {
          status: 400,
          data: {
            message: 'Validation failed',
            errors: ['NIK must be 2-10 digit number only'],
          },
        },
        message: 'Bad Request',
        isAxiosError: true,
      } as AxiosError;
      http.get.mockReturnValue(throwError(() => error));

      await expect(client.callGet('/api/users')).rejects.toThrow(
        'NIK must be 2-10 digit number only',
      );
    });

    it('throws UnauthorizedException on status 401', async () => {
      const error = {
        response: { status: 401, data: { message: 'Unauthorized' } },
        message: 'Unauthorized',
        isAxiosError: true,
      } as AxiosError;
      http.get.mockReturnValue(throwError(() => error));

      await expect(client.callGet('/api/companies')).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('throws ForbiddenException on status 403', async () => {
      const error = {
        response: { status: 403, data: { message: 'Forbidden' } },
        message: 'Forbidden',
        isAxiosError: true,
      } as AxiosError;
      http.get.mockReturnValue(throwError(() => error));

      await expect(client.callGet('/api/companies')).rejects.toThrow(
        ForbiddenException,
      );
    });

    it('throws ServiceUnavailableException when SSO_API_BASE_URL is missing', async () => {
      config.get.mockImplementation((key: string) => {
        if (key === 'SSO_API_BASE_URL') return undefined;
        return 'value';
      });

      await expect(client.callGet('/api/companies')).rejects.toBeInstanceOf(
        ServiceUnavailableException,
      );
      expect(http.get).not.toHaveBeenCalled();
    });
  });

  describe('POST', () => {
    it('returns data on successful POST', async () => {
      const payload = { ok: true };
      const body = { name: 'New Company' };
      http.post.mockReturnValue(
        of({ data: payload, status: 201 } as AxiosResponse),
      );

      await expect(client.callPost('/api/companies', body)).resolves.toEqual(
        payload,
      );
      expect(http.post).toHaveBeenCalledWith(
        'http://sso.test/api/companies',
        body,
        expect.objectContaining({
          headers: expect.objectContaining({
            'api-key': 'test-api-key-at-least-32-chars-long!!',
            'app-key': 'eal-hrms',
            'app-name': 'HRMS',
          }),
          timeout: 10_000,
        }),
      );
    });

    it('throws ConflictException on POST 409', async () => {
      const error = {
        response: { status: 409, data: { message: 'Company code already exists' } },
        message: 'Conflict',
        isAxiosError: true,
      } as AxiosError;
      http.post.mockReturnValue(throwError(() => error));

      await expect(
        client.callPost('/api/companies', {}),
      ).rejects.toThrow(ConflictException);
    });

    it('throws UnprocessableEntityException on POST 422', async () => {
      const error = {
        response: { status: 422, data: { message: 'Validation failed' } },
        message: 'Unprocessable Entity',
        isAxiosError: true,
      } as AxiosError;
      http.post.mockReturnValue(throwError(() => error));

      await expect(
        client.callPost('/api/companies', {}),
      ).rejects.toThrow(UnprocessableEntityException);
    });

    it('throws NotFoundException on POST 404', async () => {
      const error = {
        response: { status: 404 },
        message: 'Not Found',
        isAxiosError: true,
      } as AxiosError;
      http.post.mockReturnValue(throwError(() => error));

      await expect(
        client.callPost('/api/companies', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ServiceUnavailableException on POST 500', async () => {
      const error = {
        response: { status: 500 },
        message: 'Internal Server Error',
        isAxiosError: true,
      } as AxiosError;
      http.post.mockReturnValue(throwError(() => error));

      await expect(
        client.callPost('/api/companies', {}),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('PUT', () => {
    it('returns data on successful PUT', async () => {
      const payload = { ok: true };
      const body = { name: 'Updated Company' };
      http.put.mockReturnValue(
        of({ data: payload, status: 200 } as AxiosResponse),
      );

      await expect(client.callPut('/api/companies/1', body)).resolves.toEqual(
        payload,
      );
      expect(http.put).toHaveBeenCalledWith(
        'http://sso.test/api/companies/1',
        body,
        expect.objectContaining({
          headers: expect.objectContaining({
            'api-key': 'test-api-key-at-least-32-chars-long!!',
            'app-key': 'eal-hrms',
            'app-name': 'HRMS',
          }),
          timeout: 10_000,
        }),
      );
    });

    it('throws NotFoundException on PUT 404', async () => {
      const error = {
        response: { status: 404 },
        message: 'Not Found',
        isAxiosError: true,
      } as AxiosError;
      http.put.mockReturnValue(throwError(() => error));

      await expect(
        client.callPut('/api/companies/999', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ServiceUnavailableException on PUT 500', async () => {
      const error = {
        response: { status: 500 },
        message: 'Internal Server Error',
        isAxiosError: true,
      } as AxiosError;
      http.put.mockReturnValue(throwError(() => error));

      await expect(
        client.callPut('/api/companies/1', {}),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('PATCH', () => {
    it('returns data on successful PATCH', async () => {
      const payload = { ok: true };
      const body = { name: 'Patched Company' };
      http.patch.mockReturnValue(
        of({ data: payload, status: 200 } as AxiosResponse),
      );

      await expect(client.callPatch('/api/companies/1', body)).resolves.toEqual(
        payload,
      );
      expect(http.patch).toHaveBeenCalledWith(
        'http://sso.test/api/companies/1',
        body,
        expect.objectContaining({
          headers: expect.objectContaining({
            'api-key': 'test-api-key-at-least-32-chars-long!!',
            'app-key': 'eal-hrms',
            'app-name': 'HRMS',
          }),
          timeout: 10_000,
        }),
      );
    });

    it('throws NotFoundException on PATCH 404', async () => {
      const error = {
        response: { status: 404 },
        message: 'Not Found',
        isAxiosError: true,
      } as AxiosError;
      http.patch.mockReturnValue(throwError(() => error));

      await expect(
        client.callPatch('/api/companies/999', {}),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ServiceUnavailableException on PATCH 500', async () => {
      const error = {
        response: { status: 500 },
        message: 'Internal Server Error',
        isAxiosError: true,
      } as AxiosError;
      http.patch.mockReturnValue(throwError(() => error));

      await expect(
        client.callPatch('/api/companies/1', {}),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });

  describe('DELETE', () => {
    it('returns data on successful DELETE', async () => {
      const payload = { ok: true };
      http.delete.mockReturnValue(
        of({ data: payload, status: 200 } as AxiosResponse),
      );

      await expect(client.callDelete('/api/companies/1')).resolves.toEqual(
        payload,
      );
      expect(http.delete).toHaveBeenCalledWith(
        'http://sso.test/api/companies/1',
        expect.objectContaining({
          headers: expect.objectContaining({
            'api-key': 'test-api-key-at-least-32-chars-long!!',
            'app-key': 'eal-hrms',
            'app-name': 'HRMS',
          }),
          timeout: 10_000,
        }),
      );
    });

    it('throws NotFoundException on DELETE 404', async () => {
      const error = {
        response: { status: 404 },
        message: 'Not Found',
        isAxiosError: true,
      } as AxiosError;
      http.delete.mockReturnValue(throwError(() => error));

      await expect(
        client.callDelete('/api/companies/999'),
      ).rejects.toBeInstanceOf(NotFoundException);
    });

    it('throws ServiceUnavailableException on DELETE 500', async () => {
      const error = {
        response: { status: 500 },
        message: 'Internal Server Error',
        isAxiosError: true,
      } as AxiosError;
      http.delete.mockReturnValue(throwError(() => error));

      await expect(
        client.callDelete('/api/companies/1'),
      ).rejects.toBeInstanceOf(ServiceUnavailableException);
    });
  });
});
