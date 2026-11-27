import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { AxiosResponse } from 'axios';
import {
  CompanySsoClient,
  UpdateSsoCompanyDto,
  SsoCompanyItem,
} from './company-sso.client';

describe('CompanySsoClient', () => {
  let http: {
    get: jest.Mock;
    post: jest.Mock;
    patch: jest.Mock;
    delete: jest.Mock;
  };
  let config: { get: jest.Mock };
  let client: CompanySsoClient;

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
    client = new CompanySsoClient(
      http as unknown as HttpService,
      config as unknown as ConfigService,
    );
  });

  describe('listCompanies', () => {
    it('calls GET /api/companies with search, page, limit query params', async () => {
      const mockResponse = {
        statusCode: 200,
        message: 'Successfully retrieved companies',
        data: [
          {
            id: 'comp-1',
            code: 'CMP1',
            name: 'Company One',
            address: 'Jakarta',
            phone: '123456',
            logo: null,
            createdAt: '2026-01-01',
          },
        ],
        meta: {
          page: 1,
          limit: 10,
          total: 1,
          totalPages: 1,
        },
      };

      http.get.mockReturnValue(
        of({
          data: mockResponse,
          status: 200,
        } as AxiosResponse),
      );

      const res = await client.listCompanies({
        search: 'Company',
        page: 1,
        limit: 10,
      });

      expect(res).toEqual(mockResponse);
      expect(http.get).toHaveBeenCalledWith(
        'http://sso.test/api/companies?search=Company&page=1&limit=10',
        expect.anything(),
      );
    });

    it('calls GET /api/companies without params when none provided', async () => {
      http.get.mockReturnValue(
        of({
          data: {
            statusCode: 200,
            message: 'ok',
            data: [],
          },
          status: 200,
        } as AxiosResponse),
      );

      await client.listCompanies();
      expect(http.get).toHaveBeenCalledWith(
        'http://sso.test/api/companies',
        expect.anything(),
      );
    });
  });

  describe('getCompanyById', () => {
    it('calls GET /api/companies/:id and returns data', async () => {
      const company: SsoCompanyItem = {
        id: 'comp-1',
        code: 'CMP1',
        name: 'Company One',
        address: 'Jakarta',
        phone: '123456',
        logo: null,
        createdAt: '2026-01-01',
      };

      http.get.mockReturnValue(
        of({
          data: {
            statusCode: 200,
            message: 'Successfully retrieved company',
            data: company,
          },
          status: 200,
        } as AxiosResponse),
      );

      const res = await client.getCompanyById('comp-1');
      expect(res).toEqual(company);
      expect(http.get).toHaveBeenCalledWith(
        'http://sso.test/api/companies/comp-1',
        expect.anything(),
      );
    });
  });

  describe('update', () => {
    it('calls PATCH /api/companies/:id and returns updated company', async () => {
      const updatedCompany: SsoCompanyItem = {
        id: 'comp-1',
        code: 'CMP1',
        name: 'Company Updated',
        address: 'Bandung',
        phone: '654321',
        logo: null,
        createdAt: '2026-01-01',
      };

      http.patch.mockReturnValue(
        of({
          data: {
            statusCode: 200,
            message: 'Company updated successfully',
            data: updatedCompany,
          },
          status: 200,
        } as AxiosResponse),
      );

      const dto: UpdateSsoCompanyDto = {
        name: 'Company Updated',
        address: 'Bandung',
        phone: '654321',
      };

      const res = await client.update('comp-1', dto);
      expect(res).toEqual(updatedCompany);
      expect(http.patch).toHaveBeenCalledWith(
        'http://sso.test/api/companies/comp-1',
        dto,
        expect.anything(),
      );
    });
  });
});
