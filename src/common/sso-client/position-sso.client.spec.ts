import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of } from 'rxjs';
import { PositionSsoClient, CreateSsoPositionDto, UpdateSsoPositionDto } from './position-sso.client';

describe('PositionSsoClient', () => {
  let client: PositionSsoClient;
  let httpService: any;

  beforeEach(async () => {
    httpService = {
      get: jest.fn(),
      post: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
    };

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'SSO_API_BASE_URL') return 'http://sso.local';
        if (key === 'SSO_SERVICE_API_KEY') return 'test-key-32-chars-minimum-length-ok';
        if (key === 'SSO_SERVICE_APP_KEY') return 'eal-hrms';
        if (key === 'SSO_SERVICE_APP_NAME') return 'HRMS';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PositionSsoClient,
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    client = module.get<PositionSsoClient>(PositionSsoClient);
  });

  it('listByCompany calls GET /api/positions with companyId and limit=1000', async () => {
    httpService.get.mockReturnValue(
      of({
        data: {
          statusCode: 200,
          message: 'ok',
          data: [
            {
              id: 'pos-1',
              name: 'Software Engineer',
              code: 'SWE',
              companyId: 'comp-1',
              departmentId: 'dept-1',
              parentId: null,
              description: null,
            },
          ],
        },
      }),
    );

    const res = await client.listByCompany('comp-1');
    expect(res).toEqual([
      {
        id: 'pos-1',
        name: 'Software Engineer',
        code: 'SWE',
        companyId: 'comp-1',
        departmentId: 'dept-1',
        parentId: null,
        description: null,
      },
    ]);
    expect(httpService.get).toHaveBeenCalledWith(
      'http://sso.local/api/positions?companyId=comp-1&limit=1000',
      expect.any(Object),
    );
  });

  it('getTree calls GET /api/positions/tree/:companyId', async () => {
    httpService.get.mockReturnValue(
      of({
        data: {
          statusCode: 200,
          message: 'ok',
          data: [{ id: 'pos-1', name: 'CEO', children: [] }],
        },
      }),
    );

    const res = await client.getTree('comp-1');
    expect(res).toEqual([{ id: 'pos-1', name: 'CEO', children: [] }]);
    expect(httpService.get).toHaveBeenCalledWith(
      'http://sso.local/api/positions/tree/comp-1',
      expect.any(Object),
    );
  });

  it('getById calls GET /api/positions/:id', async () => {
    httpService.get.mockReturnValue(
      of({
        data: {
          statusCode: 200,
          message: 'ok',
          data: { id: 'pos-1', name: 'CEO' },
        },
      }),
    );

    const res = await client.getById('pos-1');
    expect(res).toEqual({ id: 'pos-1', name: 'CEO' });
    expect(httpService.get).toHaveBeenCalledWith(
      'http://sso.local/api/positions/pos-1',
      expect.any(Object),
    );
  });

  describe('create', () => {
    it('calls POST /api/positions and returns created position', async () => {
      const createdPosition = {
        id: 'pos-new',
        name: 'Senior Software Engineer',
        code: 'SR_SWE',
        companyId: 'comp-1',
        departmentId: 'dept-1',
        parentId: null,
        description: 'Senior engineer',
        level: 'DEPARTMENT' as const,
      };

      httpService.post.mockReturnValue(
        of({
          data: {
            statusCode: 201,
            message: 'Position created successfully',
            data: createdPosition,
          },
        }),
      );

      const dto: CreateSsoPositionDto = {
        name: 'Senior Software Engineer',
        code: 'SR_SWE',
        companyId: 'comp-1',
        departmentId: 'dept-1',
        parentId: null,
        description: 'Senior engineer',
      };

      const res = await client.create(dto);
      expect(res).toEqual(createdPosition);
      expect(httpService.post).toHaveBeenCalledWith(
        'http://sso.local/api/positions',
        dto,
        expect.any(Object),
      );
    });
  });

  describe('update', () => {
    it('calls PUT /api/positions/:id and returns updated position', async () => {
      const updatedPosition = {
        id: 'pos-1',
        name: 'Lead Software Engineer',
        code: 'LEAD_SWE',
        companyId: 'comp-1',
        departmentId: 'dept-1',
        parentId: null,
        description: 'Updated description',
        level: 'DEPARTMENT' as const,
      };

      httpService.put.mockReturnValue(
        of({
          data: {
            statusCode: 200,
            message: 'Position updated successfully',
            data: updatedPosition,
          },
        }),
      );

      const dto: UpdateSsoPositionDto = {
        name: 'Lead Software Engineer',
        code: 'LEAD_SWE',
        departmentId: 'dept-1',
      };

      const res = await client.update('pos-1', dto);
      expect(res).toEqual(updatedPosition);
      expect(httpService.put).toHaveBeenCalledWith(
        'http://sso.local/api/positions/pos-1',
        dto,
        expect.any(Object),
      );
    });
  });

  describe('delete', () => {
    it('calls DELETE /api/positions/:id and resolves void', async () => {
      httpService.delete.mockReturnValue(
        of({
          data: {
            statusCode: 200,
            message: 'Position deleted successfully',
          },
        }),
      );

      await expect(client.delete('pos-1')).resolves.toBeUndefined();
      expect(httpService.delete).toHaveBeenCalledWith(
        'http://sso.local/api/positions/pos-1',
        expect.any(Object),
      );
    });
  });
});
