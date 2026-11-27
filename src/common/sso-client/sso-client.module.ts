import { Global, Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { SsoHttpClient } from './sso-http.client';
import { CompanySsoClient } from './company-sso.client';
import { DepartmentSsoClient } from './department-sso.client';
import { PositionSsoClient } from './position-sso.client';
import { ApprovalSsoClient } from './approval-sso.client';
import { UserSsoClient } from './user-sso.client';
import { HrmsApprovalOrchestrator } from './hrms-approval.orchestrator';

/**
 * Global module providing {@link SsoHttpClient} and domain-specific SSO clients
 * for all HRMS -> SSO service-to-service calls.
 */
@Global()
@Module({
  imports: [HttpModule.register({ timeout: 10_000 })],
  providers: [
    SsoHttpClient,
    CompanySsoClient,
    DepartmentSsoClient,
    PositionSsoClient,
    ApprovalSsoClient,
    UserSsoClient,
    HrmsApprovalOrchestrator,
  ],
  exports: [
    SsoHttpClient,
    CompanySsoClient,
    DepartmentSsoClient,
    PositionSsoClient,
    ApprovalSsoClient,
    UserSsoClient,
    HrmsApprovalOrchestrator,
    HttpModule,
  ],
})
export class SsoClientModule {}
