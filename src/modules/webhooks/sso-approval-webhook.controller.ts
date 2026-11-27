import {
  Controller,
  Post,
  Body,
  Headers,
  UnauthorizedException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import {
  SsoApprovalWebhookService,
  SsoApprovalStatusPayload,
} from './sso-approval-webhook.service';

@ApiTags('webhooks')
@Controller('webhooks/sso')
export class SsoApprovalWebhookController {
  constructor(
    private webhookService: SsoApprovalWebhookService,
    private configService: ConfigService,
  ) {}

  @Post('approval-status')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'SSO Approval status webhook callback' })
  @ApiResponse({ status: 200, description: 'Webhook processed successfully' })
  @ApiResponse({ status: 401, description: 'Invalid API key or service key' })
  async handleApprovalStatus(
    @Body() payload: SsoApprovalStatusPayload,
    @Headers('x-service-api-key') serviceApiKey?: string,
    @Headers('x-api-key') apiKey?: string,
    @Headers('api-key') legacyApiKey?: string,
  ) {
    const configuredKey = this.configService.get<string>('SSO_SERVICE_API_KEY');
    const providedKey = serviceApiKey || apiKey || legacyApiKey;

    if (configuredKey && providedKey !== configuredKey) {
      throw new UnauthorizedException('Invalid webhook authentication key');
    }

    return this.webhookService.handleStatusChange(payload);
  }
}
