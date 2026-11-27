import { Test, TestingModule } from '@nestjs/testing';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { of, throwError } from 'rxjs';
import { ApprovalSsoClient } from './approval-sso.client';

describe('ApprovalSsoClient', () => {
  let client: ApprovalSsoClient;
  let httpService: any;

  beforeEach(async () => {
    httpService = {
      get: jest.fn(),
      post: jest.fn(),
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
        ApprovalSsoClient,
        { provide: HttpService, useValue: httpService },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    client = module.get<ApprovalSsoClient>(ApprovalSsoClient);
  });

  it('submit calls POST /api/approvals/submit', async () => {
    httpService.post.mockReturnValue(
      of({
        data: {
          instanceId: 'inst-1',
          status: 'PENDING',
          currentApproverUserId: 'user-2',
        },
      }),
    );

    const res = await client.submit({
      companyId: 'comp-1',
      moduleKey: 'leave_request',
      recordId: 'leave-1',
      submittedBy: 'user-1',
    });

    expect(res).toEqual({
      instanceId: 'inst-1',
      status: 'PENDING',
      currentApproverUserId: 'user-2',
    });
    expect(httpService.post).toHaveBeenCalledWith(
      'http://sso.local/api/approvals/submit',
      {
        companyId: 'comp-1',
        moduleKey: 'leave_request',
        recordId: 'leave-1',
        submittedBy: 'user-1',
      },
      expect.any(Object),
    );
  });

  it('approve calls POST /api/approvals/:instanceId/approve', async () => {
    httpService.post.mockReturnValue(
      of({
        data: {
          instanceId: 'inst-1',
          status: 'APPROVED',
        },
      }),
    );

    const res = await client.approve('inst-1', { actedBy: 'user-2' });
    expect(res.status).toBe('APPROVED');
    expect(httpService.post).toHaveBeenCalledWith(
      'http://sso.local/api/approvals/inst-1/approve',
      { actedBy: 'user-2' },
      expect.any(Object),
    );
  });

  it('reject calls POST /api/approvals/:instanceId/reject', async () => {
    httpService.post.mockReturnValue(
      of({
        data: {
          instanceId: 'inst-1',
          status: 'REJECTED',
        },
      }),
    );

    const res = await client.reject('inst-1', { comments: 'Need replacement' });
    expect(res.status).toBe('REJECTED');
    expect(httpService.post).toHaveBeenCalledWith(
      'http://sso.local/api/approvals/inst-1/reject',
      { comments: 'Need replacement' },
      expect.any(Object),
    );
  });

  it('getActiveStep returns null gracefully when SSO throws an error', async () => {
    httpService.get.mockReturnValue(throwError(() => new Error('SSO timeout')));

    const res = await client.getActiveStep('inst-1');
    expect(res).toBeNull();
  });

  it('getActiveStep returns active step data when success', async () => {
    httpService.get.mockReturnValue(
      of({
        data: {
          step_name: 'Manager Approval',
          approver_name: 'Jane Doe',
          approver_id: 'user-mgr-1',
          status: 'active',
        },
      }),
    );

    const res = await client.getActiveStep('inst-1');
    expect(res).toEqual({
      step_name: 'Manager Approval',
      approver_name: 'Jane Doe',
      approver_id: 'user-mgr-1',
      status: 'active',
    });
  });
});
