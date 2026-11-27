# Graph Report - backend  (2026-11-03)

## Corpus Check
- 314 files · ~166,357 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 1732 nodes · 4378 edges · 84 communities (64 shown, 20 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 11|Community 11]]
- [[_COMMUNITY_Community 12|Community 12]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 14|Community 14]]
- [[_COMMUNITY_Community 15|Community 15]]
- [[_COMMUNITY_Community 16|Community 16]]
- [[_COMMUNITY_Community 17|Community 17]]
- [[_COMMUNITY_Community 18|Community 18]]
- [[_COMMUNITY_Community 19|Community 19]]
- [[_COMMUNITY_Community 20|Community 20]]
- [[_COMMUNITY_Community 21|Community 21]]
- [[_COMMUNITY_Community 22|Community 22]]
- [[_COMMUNITY_Community 23|Community 23]]
- [[_COMMUNITY_Community 24|Community 24]]
- [[_COMMUNITY_Community 25|Community 25]]
- [[_COMMUNITY_Community 26|Community 26]]
- [[_COMMUNITY_Community 27|Community 27]]
- [[_COMMUNITY_Community 28|Community 28]]
- [[_COMMUNITY_Community 29|Community 29]]
- [[_COMMUNITY_Community 30|Community 30]]
- [[_COMMUNITY_Community 31|Community 31]]
- [[_COMMUNITY_Community 32|Community 32]]
- [[_COMMUNITY_Community 33|Community 33]]
- [[_COMMUNITY_Community 34|Community 34]]
- [[_COMMUNITY_Community 35|Community 35]]
- [[_COMMUNITY_Community 36|Community 36]]
- [[_COMMUNITY_Community 37|Community 37]]
- [[_COMMUNITY_Community 38|Community 38]]
- [[_COMMUNITY_Community 39|Community 39]]
- [[_COMMUNITY_Community 40|Community 40]]
- [[_COMMUNITY_Community 41|Community 41]]
- [[_COMMUNITY_Community 42|Community 42]]
- [[_COMMUNITY_Community 43|Community 43]]
- [[_COMMUNITY_Community 44|Community 44]]
- [[_COMMUNITY_Community 45|Community 45]]
- [[_COMMUNITY_Community 46|Community 46]]
- [[_COMMUNITY_Community 47|Community 47]]
- [[_COMMUNITY_Community 48|Community 48]]
- [[_COMMUNITY_Community 49|Community 49]]
- [[_COMMUNITY_Community 50|Community 50]]
- [[_COMMUNITY_Community 51|Community 51]]
- [[_COMMUNITY_Community 52|Community 52]]
- [[_COMMUNITY_Community 53|Community 53]]
- [[_COMMUNITY_Community 54|Community 54]]
- [[_COMMUNITY_Community 55|Community 55]]
- [[_COMMUNITY_Community 56|Community 56]]
- [[_COMMUNITY_Community 57|Community 57]]
- [[_COMMUNITY_Community 58|Community 58]]
- [[_COMMUNITY_Community 59|Community 59]]
- [[_COMMUNITY_Community 60|Community 60]]
- [[_COMMUNITY_Community 61|Community 61]]
- [[_COMMUNITY_Community 62|Community 62]]
- [[_COMMUNITY_Community 63|Community 63]]
- [[_COMMUNITY_Community 64|Community 64]]
- [[_COMMUNITY_Community 65|Community 65]]
- [[_COMMUNITY_Community 66|Community 66]]
- [[_COMMUNITY_Community 67|Community 67]]
- [[_COMMUNITY_Community 68|Community 68]]
- [[_COMMUNITY_Community 69|Community 69]]
- [[_COMMUNITY_Community 70|Community 70]]
- [[_COMMUNITY_Community 71|Community 71]]
- [[_COMMUNITY_Community 72|Community 72]]
- [[_COMMUNITY_Community 73|Community 73]]
- [[_COMMUNITY_Community 75|Community 75]]
- [[_COMMUNITY_Community 76|Community 76]]
- [[_COMMUNITY_Community 77|Community 77]]
- [[_COMMUNITY_Community 78|Community 78]]
- [[_COMMUNITY_Community 79|Community 79]]
- [[_COMMUNITY_Community 80|Community 80]]
- [[_COMMUNITY_Community 81|Community 81]]
- [[_COMMUNITY_Community 82|Community 82]]

## God Nodes (most connected - your core abstractions)
1. `AuthenticatedUser` - 311 edges
2. `PrismaService` - 128 edges
3. `NotificationsService` - 53 edges
4. `createMockPrismaService()` - 42 edges
5. `createMockPrismaService()` - 39 edges
6. `JwtAuthGuard` - 38 edges
7. `PermissionsGuard` - 35 edges
8. `CurrentUser` - 33 edges
9. `ReportsService` - 32 edges
10. `RequirePermissions()` - 30 edges

## Surprising Connections (you probably didn't know these)
- `main()` --calls--> `fetchSsoDirectory()`  [EXTRACTED]
  prisma/seed.ts → src/common/sso-client/fetch-sso-directory.ts
- `importEmployeesFromSso()` --calls--> `fetchSsoDirectory()`  [EXTRACTED]
  scripts/resync-sso-employees.ts → src/common/sso-client/fetch-sso-directory.ts
- `ApprovalSsoClient` --inherits--> `SsoHttpClient`  [EXTRACTED]
  src/common/sso-client/approval-sso.client.ts → src/common/sso-client/sso-http.client.ts
- `CompanySsoClient` --inherits--> `SsoHttpClient`  [EXTRACTED]
  src/common/sso-client/company-sso.client.ts → src/common/sso-client/sso-http.client.ts
- `DepartmentSsoClient` --inherits--> `SsoHttpClient`  [EXTRACTED]
  src/common/sso-client/department-sso.client.ts → src/common/sso-client/sso-http.client.ts

## Import Cycles
- None detected.

## Communities (84 total, 20 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.05
Nodes (37): IngestPunchDto, IngestPunchesDto, IngestPunchInput, AuthController, mockAuthService, AuthService, CurrentUser, RequirePermissions() (+29 more)

### Community 2 - "Community 2"
Cohesion: 0.07
Nodes (59): allocateNumericEmployeeCode(), hrmsPrisma, isNumericNik(), main(), splitDisplayName(), allocateNumericEmployeeCode(), deleteEmployeeWithDependents(), deleteSsoLinkedEmployees() (+51 more)

### Community 3 - "Community 3"
Cohesion: 0.07
Nodes (12): AdminLeaveRequestQueryDto, ApproveLeaveDto, CreateLeaveRequestDto, CreateLeaveTypeDto, InitializeBalancesDto, LeaveBalanceQueryDto, LeaveRequestQueryDto, RejectLeaveDto (+4 more)

### Community 4 - "Community 4"
Cohesion: 0.13
Nodes (15): AssignSalaryDto, CreateDailyPayrollRunDto, CreatePayrollRunDto, CreateSalaryStructureDto, DailyWorkerQueryDto, PayrollExportDto, PayrollRunQueryDto, PayslipQueryDto (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.14
Nodes (10): CreateAuditLogInput, mockBcrypt, createMockPrismaService(), createMockPrismaService(), createModelMock(), prismaModelMethods, prismaModels, CreateNotificationInput (+2 more)

### Community 6 - "Community 6"
Cohesion: 0.11
Nodes (3): LettersController, PayrollController, AuthenticatedUser

### Community 7 - "Community 7"
Cohesion: 0.04
Nodes (48): devDependencies, eslint, eslint-config-prettier, eslint-plugin-prettier, jest, @nestjs/cli, @nestjs/schematics, @nestjs/testing (+40 more)

### Community 8 - "Community 8"
Cohesion: 0.07
Nodes (11): CreateGoalDto, CreateReviewCycleDto, ReviewCycleQueryDto, ReviewQueryDto, SubmitManagerReviewDto, SubmitSelfReviewDto, UpdateGoalDto, UpdateReviewCycleDto (+3 more)

### Community 9 - "Community 9"
Cohesion: 0.07
Nodes (11): AttendanceController, AttendanceService, ApproveOtDto, AttendanceMatrixQueryDto, AttendanceQueryDto, AttendanceSummaryQueryDto, BulkAttendanceDto, ClockInDto (+3 more)

### Community 10 - "Community 10"
Cohesion: 0.09
Nodes (9): CreateExpenseCategoryDto, CreateExpenseClaimDto, ExpenseClaimQueryDto, ReviewExpenseClaimDto, UpdateExpenseCategoryDto, UpdateExpenseClaimDto, ExpensesController, mockService (+1 more)

### Community 11 - "Community 11"
Cohesion: 0.10
Nodes (12): DesignationsService, flattenPositionTree(), isUniqueConflict(), splitDisplayName(), CreateDesignationDto, UpdateDesignationDto, CreateSsoPositionDto, PositionSsoClient (+4 more)

### Community 12 - "Community 12"
Cohesion: 0.08
Nodes (10): CreateOnboardingProcessDto, CreateOnboardingTemplateDto, OnboardingQueryDto, TaskDefinitionDto, UpdateOnboardingTaskDto, UpdateOnboardingTemplateDto, OnboardingController, mockService (+2 more)

### Community 13 - "Community 13"
Cohesion: 0.05
Nodes (37): dependencies, axios, @azure/identity, bcrypt, bullmq, cache-manager, cache-manager-ioredis-yet, class-transformer (+29 more)

### Community 14 - "Community 14"
Cohesion: 0.14
Nodes (7): formatDailyPeriodHuman(), MONTH_NAMES, MONTH_NAMES_ID, parseDateOnlyPdf(), PayrollPdfService, PayslipForPdf, payslipPeriodLabel()

### Community 15 - "Community 15"
Cohesion: 0.11
Nodes (8): AssignShiftDto, BulkAssignShiftDto, CreateShiftDto, UpdateShiftDto, ShiftsController, mockShiftsService, ShiftsModule, ShiftsService

### Community 16 - "Community 16"
Cohesion: 0.09
Nodes (14): CreateEmployeeDto, EmployeeQueryDto, UpdateEmployeeDto, assertValidEmployeeCode(), assertValidKtpNumber(), generateNextEmployeeCode(), normalizeKtpNumber(), EmployeesService (+6 more)

### Community 17 - "Community 17"
Cohesion: 0.13
Nodes (8): BulkCreateHolidayDto, CreateHolidayDto, HolidayQueryDto, UpdateHolidayDto, HolidaysController, mockHolidaysService, HolidaysModule, HolidaysService

### Community 18 - "Community 18"
Cohesion: 0.11
Nodes (7): AdminController, mockAdminService, AdminModule, AdminService, CreateOtRuleDto, DashboardStatsDto, UpdateOtRuleDto

### Community 19 - "Community 19"
Cohesion: 0.14
Nodes (7): AnnouncementsController, mockService, AnnouncementsModule, AnnouncementsService, AnnouncementQueryDto, CreateAnnouncementDto, UpdateAnnouncementDto

### Community 20 - "Community 20"
Cohesion: 0.19
Nodes (5): DepartmentsService, isUniqueConflict(), CreateDepartmentDto, UpdateDepartmentDto, SsoDepartmentItem

### Community 21 - "Community 21"
Cohesion: 0.14
Nodes (11): AttendanceDeskService, deviceData(), DeviceRow, DeviceWrite, jakartaTodayKey(), mapDeviceWriteError(), PunchRow, toPublicDevice() (+3 more)

### Community 22 - "Community 22"
Cohesion: 0.14
Nodes (5): LogoController, MIME_MAP, StorageService, UploadedFile, UploadsService

### Community 23 - "Community 23"
Cohesion: 0.14
Nodes (8): CompaniesController, mockCompaniesService, ssoAcme, TenantCountSlice, TenantOverlay, CompanyQueryDto, CreateCompanyDto, UpdateCompanyDto

### Community 24 - "Community 24"
Cohesion: 0.12
Nodes (17): AttendanceModule, AuthModule, CompaniesModule, loggerConfig(), DepartmentsModule, DesignationsModule, EmployeesModule, ExitModule (+9 more)

### Community 25 - "Community 25"
Cohesion: 0.23
Nodes (12): addDays(), attendanceDateKey(), buildSessions(), dateKey(), DaySummary, FoldedSession, hhmmToMinutes(), jakartaParts() (+4 more)

### Community 26 - "Community 26"
Cohesion: 0.12
Nodes (8): NotificationQueryDto, createMockNotificationsService(), NotificationsService, CurrentApprovalEmbed, ForwardApprovalResult, HRMS_APPROVAL_MODULE, HrmsApprovalModuleKey, SubmitApprovalInput

### Community 28 - "Community 28"
Cohesion: 0.13
Nodes (3): OtCalculationService, LeaveAccrualCronService, PrismaService

### Community 29 - "Community 29"
Cohesion: 0.13
Nodes (5): DocumentExpiryController, DocumentsModule, DocumentsService, CreateDocumentDto, DocumentQueryDto

### Community 30 - "Community 30"
Cohesion: 0.15
Nodes (5): BranchesController, BranchesModule, BranchesService, CreateBranchDto, UpdateBranchDto

### Community 31 - "Community 31"
Cohesion: 0.05
Nodes (20): AuditController, mockService, AuditMetadata, AuditInterceptor, AuditModule, AuditService, AccrualRunQueryDto, CreateAccrualRuleDto (+12 more)

### Community 32 - "Community 32"
Cohesion: 0.15
Nodes (5): RegularizationController, RegularizationService, ApproveRegularizationDto, CreateRegularizationDto, RegularizationQueryDto

### Community 33 - "Community 33"
Cohesion: 0.16
Nodes (6): CreateChangeRequestDto, ReviewChangeRequestDto, SelfServiceModule, ALLOWED_FIELDS, IDENTITY_FIELDS, SelfServiceService

### Community 34 - "Community 34"
Cohesion: 0.17
Nodes (5): CreateLetterTemplateDto, GenerateLetterDto, LetterQueryDto, UpdateLetterTemplateDto, LettersService

### Community 35 - "Community 35"
Cohesion: 0.11
Nodes (18): scripts, build, format, lint, prisma:generate, prisma:migrate, prisma:migrate:prod, prisma:seed (+10 more)

### Community 37 - "Community 37"
Cohesion: 0.12
Nodes (7): ActApprovalBody, ActiveStepResponse, ApprovalResponse, ApprovalSsoClient, InstanceSummaryResponse, ReassignApprovalBody, SubmitApprovalBody

### Community 38 - "Community 38"
Cohesion: 0.12
Nodes (10): mockAttendanceService, mockPrismaService, mockPunchQueueService, addDays(), IngestPunchesInput, QueuedPunchJob, sessionRows(), PunchQueueService (+2 more)

### Community 39 - "Community 39"
Cohesion: 0.29
Nodes (5): ssoCompany, DEFAULT_SSO_ROLE_MAP_JSON, mapSsoRole(), parseRoleMap(), VALID_ROLES

### Community 40 - "Community 40"
Cohesion: 0.23
Nodes (3): CompaniesService, shortHex(), SsoCompanyItem

### Community 41 - "Community 41"
Cohesion: 0.25
Nodes (7): applyCompanyOverride(), readCompanyHeader(), ctx, parseIdentity(), sha256(), SsoAuthGuard, toAuthenticatedUser()

### Community 42 - "Community 42"
Cohesion: 0.19
Nodes (5): IdentityProvisionService, isLoginStub(), isUniqueConflict(), shortHex(), splitDisplayName()

### Community 43 - "Community 43"
Cohesion: 0.23
Nodes (6): ProvisionedIdentity, IdpClientService, identity, idpCtx, TOKEN_HASH, IdpUserContext

### Community 44 - "Community 44"
Cohesion: 0.28
Nodes (4): InitiateSeparationDto, SeparationQueryDto, UpdateSeparationDto, ExitService

### Community 46 - "Community 46"
Cohesion: 0.18
Nodes (5): CreateSsoDepartmentDto, DepartmentSsoClient, SsoDepartmentClassification, SsoDepartmentListResponse, UpdateSsoDepartmentDto

### Community 47 - "Community 47"
Cohesion: 0.15
Nodes (6): EmailModule, EmailOptions, EmailService, Transport, EmailProcessor, QueueModule

### Community 48 - "Community 48"
Cohesion: 0.16
Nodes (11): createMockEmailService(), AuthenticatedUser, mockEmployee, mockHrAdmin, mockManager, mockSuperAdmin, mockEmployee, mockHrAdmin (+3 more)

### Community 50 - "Community 50"
Cohesion: 0.17
Nodes (12): jest, collectCoverageFrom, coverageDirectory, moduleFileExtensions, moduleNameMapper, rootDir, testEnvironment, testRegex (+4 more)

### Community 51 - "Community 51"
Cohesion: 0.23
Nodes (3): PayrollCalculationService, PayrollModule, ReportsModule

### Community 52 - "Community 52"
Cohesion: 0.26
Nodes (11): buildClockTimes(), dateUtc(), hashSeed(), LIMIT, main(), MONTH, mulberry32(), pickStatus() (+3 more)

### Community 53 - "Community 53"
Cohesion: 0.22
Nodes (5): CompanySsoClient, SsoCompanyListMeta, SsoCompanyListParams, SsoCompanyListResponse, UpdateSsoCompanyDto

### Community 55 - "Community 55"
Cohesion: 0.35
Nodes (3): jakartaStart(), PunchIngestService, ShiftWindow

### Community 58 - "Community 58"
Cohesion: 0.29
Nodes (4): SsoApprovalWebhookController, SsoApprovalStatusPayload, SsoApprovalWebhookService, WebhooksModule

### Community 60 - "Community 60"
Cohesion: 0.29
Nodes (6): author, description, license, name, private, version

### Community 61 - "Community 61"
Cohesion: 0.47
Nodes (8): main(), map_department(), map_designation(), norm(), normalize_phone(), parse_join_date(), split_name(), sql_str()

### Community 64 - "Community 64"
Cohesion: 0.26
Nodes (6): AttendanceReportDto, EmployeeReportDto, LeaveReportDto, ReportFormat, ReportType, ReportsController

### Community 65 - "Community 65"
Cohesion: 0.31
Nodes (5): identityCardCanonical(), reverseUidBytes(), isNumericToken(), EMPLOYMENT_TYPE_LABELS, PushResultInput

### Community 67 - "Community 67"
Cohesion: 0.33
Nodes (5): collection, compilerOptions, deleteOutDir, $schema, sourceRoot

### Community 69 - "Community 69"
Cohesion: 0.53
Nodes (5): buildRecord(), isWeekday(), main(), prisma, weekdaysInMonth()

### Community 70 - "Community 70"
Cohesion: 0.70
Nodes (4): backfill(), load_database_url(), main(), next_code_start()

### Community 72 - "Community 72"
Cohesion: 0.50
Nodes (3): logPath, port, server

### Community 77 - "Community 77"
Cohesion: 0.48
Nodes (4): countAttendanceDayUnits(), countUnpaidDailyAttendanceDays(), isAttendanceDateSettled(), toDateKey()

### Community 78 - "Community 78"
Cohesion: 0.48
Nodes (6): buildClockTimes(), dateUtc(), main(), mulberry32(), pickStatus(), prisma

### Community 80 - "Community 80"
Cohesion: 0.50
Nodes (3): Environment, EnvironmentVariables, validate()

## Knowledge Gaps
- **239 isolated node(s):** `$schema`, `collection`, `sourceRoot`, `deleteOutDir`, `name` (+234 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **20 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `AuthenticatedUser` connect `Community 6` to `Community 0`, `Community 3`, `Community 4`, `Community 8`, `Community 9`, `Community 10`, `Community 12`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 26`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 38`, `Community 41`, `Community 45`, `Community 48`, `Community 54`, `Community 56`, `Community 59`, `Community 63`, `Community 64`, `Community 66`, `Community 68`, `Community 71`, `Community 73`, `Community 75`, `Community 76`, `Community 79`, `Community 81`, `Community 82`?**
  _High betweenness centrality (0.231) - this node is a cross-community bridge._
- **Why does `PrismaService` connect `Community 28` to `Community 0`, `Community 1`, `Community 3`, `Community 4`, `Community 5`, `Community 8`, `Community 9`, `Community 10`, `Community 11`, `Community 12`, `Community 15`, `Community 16`, `Community 17`, `Community 18`, `Community 19`, `Community 20`, `Community 21`, `Community 22`, `Community 23`, `Community 24`, `Community 26`, `Community 27`, `Community 29`, `Community 30`, `Community 31`, `Community 32`, `Community 33`, `Community 34`, `Community 36`, `Community 37`, `Community 38`, `Community 42`, `Community 44`, `Community 45`, `Community 47`, `Community 48`, `Community 51`, `Community 53`, `Community 58`, `Community 64`, `Community 65`, `Community 79`?**
  _High betweenness centrality (0.149) - this node is a cross-community bridge._
- **Why does `NotificationsService` connect `Community 26` to `Community 0`, `Community 3`, `Community 5`, `Community 8`, `Community 10`, `Community 12`, `Community 19`, `Community 24`, `Community 27`, `Community 28`, `Community 29`, `Community 31`, `Community 32`, `Community 33`, `Community 47`, `Community 48`, `Community 58`, `Community 68`, `Community 79`?**
  _High betweenness centrality (0.025) - this node is a cross-community bridge._
- **What connects `$schema`, `collection`, `sourceRoot` to the rest of the system?**
  _239 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.053980914399658166 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.07256571640133284 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.06918238993710692 - nodes in this community are weakly interconnected._