import { Test, TestingModule } from '@nestjs/testing';
import { UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SsoApprovalWebhookController } from './sso-approval-webhook.controller';
import { SsoApprovalWebhookService } from './sso-approval-webhook.service';

describe('SsoApprovalWebhookController', () => {
  let controller: SsoApprovalWebhookController;
  let service: { handleStatusChange: jest.Mock };

  beforeEach(async () => {
    service = {
      handleStatusChange: jest.fn().mockResolvedValue({ success: true }),
    };

    const configService = {
      get: jest.fn((key: string) => {
        if (key === 'SSO_SERVICE_API_KEY') return 'secret-key-12345';
        return null;
      }),
    };

    const module: TestingModule = await Test.createTestingModule({
      controllers: [SsoApprovalWebhookController],
      providers: [
        { provide: SsoApprovalWebhookService, useValue: service },
        { provide: ConfigService, useValue: configService },
      ],
    }).compile();

    controller = module.get<SsoApprovalWebhookController>(
      SsoApprovalWebhookController,
    );
  });

  it('allows request with valid x-service-api-key header', async () => {
    const payload = {
      instanceId: 'inst-1',
      moduleKey: 'leave_request',
      recordId: 'leave-1',
      status: 'APPROVED' as const,
      isCompleted: true,
    };

    const res = await controller.handleApprovalStatus(
      payload,
      'secret-key-12345',
    );

    expect(res).toEqual({ success: true });
    expect(service.handleStatusChange).toHaveBeenCalledWith(payload);
  });

  it('throws UnauthorizedException when apiKey is invalid', async () => {
    const payload = {
      instanceId: 'inst-1',
      moduleKey: 'leave_request',
      recordId: 'leave-1',
      status: 'APPROVED' as const,
      isCompleted: true,
    };

    await expect(
      controller.handleApprovalStatus(payload, 'wrong-key'),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(service.handleStatusChange).not.toHaveBeenCalled();
  });
});
