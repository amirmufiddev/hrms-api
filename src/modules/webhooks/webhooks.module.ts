import { Module } from '@nestjs/common';
import { NotificationsModule } from '../notifications/notifications.module';
import { SsoApprovalWebhookService } from './sso-approval-webhook.service';
import { SsoApprovalWebhookController } from './sso-approval-webhook.controller';

@Module({
  imports: [NotificationsModule],
  controllers: [SsoApprovalWebhookController],
  providers: [SsoApprovalWebhookService],
  exports: [SsoApprovalWebhookService],
})
export class WebhooksModule {}
