import {
  Controller,
  Get,
  Post,
  Put,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiResponse, ApiConsumes, ApiBody } from '@nestjs/swagger';
import { CompaniesService } from './companies.service';
import { CreateCompanyDto, UpdateCompanyDto, CompanyQueryDto } from './dto/company.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { PermissionsGuard } from '../../common/guards/permissions.guard';
import { RequirePermissions } from '../../common/decorators/permissions.decorator';

const MAX_LOGO_SIZE = 2 * 1024 * 1024; // 2MB

@ApiTags('companies')
@ApiBearerAuth()
@Controller('companies')
@UseGuards(JwtAuthGuard, PermissionsGuard)
export class CompaniesController {
  constructor(private companiesService: CompaniesService) {}

  /**
   * Identity CUD is gone — manage companies in SSO.
   * POST /api/companies
   */
  @Post()
  @ApiOperation({ summary: 'Create new company (gone — manage in SSO)' })
  @ApiResponse({ status: 410, description: 'Manage companies in SSO' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async create(@Body() dto: CreateCompanyDto) {
    return this.companiesService.create(dto);
  }

  /**
   * Get all companies
   * GET /api/companies
   */
  @Get()
  @ApiOperation({ summary: 'Get all companies' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('companies:read')
  async findAll(@Query() query: CompanyQueryDto) {
    return this.companiesService.findAll(query);
  }

  /**
   * Get company statistics summary
   * GET /api/companies/stats
   */
  @Get('stats')
  @ApiOperation({ summary: 'Get company statistics' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @RequirePermissions('companies:read')
  async getStats() {
    return this.companiesService.getStatsSummary();
  }

  /**
   * Get company by ID
   * GET /api/companies/:id
   */
  @Get(':id')
  @ApiOperation({ summary: 'Get company by ID' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('companies:read')
  async findOne(@Param('id') id: string) {
    return this.companiesService.findOne(id);
  }

  /**
   * Update company
   * PUT /api/companies/:id
   */
  @Put(':id')
  @ApiOperation({ summary: 'Update company' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('companies:update')
  async update(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }

  /**
   * Partial update company
   * PATCH /api/companies/:id
   */
  @Patch(':id')
  @ApiOperation({ summary: 'Update company partially' })
  @ApiResponse({ status: 200, description: 'Success' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  @ApiResponse({ status: 404, description: 'Not found' })
  @RequirePermissions('companies:update')
  async patchUpdate(@Param('id') id: string, @Body() dto: UpdateCompanyDto) {
    return this.companiesService.update(id, dto);
  }

  /**
   * Upload company logo
   * POST /api/companies/:id/logo
   */
  @Post(':id/logo')
  @ApiOperation({ summary: 'Upload company logo (max 2MB, images only)' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: { logo: { type: 'string', format: 'binary' } },
    },
  })
  @ApiResponse({ status: 200, description: 'Logo uploaded, returns { logoUrl }' })
  @ApiResponse({ status: 400, description: 'File too large or wrong type' })
  @ApiResponse({ status: 404, description: 'Company not found' })
  @UseInterceptors(FileInterceptor('logo'))
  async uploadLogo(
    @Param('id') id: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: MAX_LOGO_SIZE }),
          new FileTypeValidator({ fileType: /^image\/(jpeg|png|gif|webp|svg\+xml)$/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.companiesService.uploadLogo(id, file);
  }

  /**
   * Toggle company active status
   * PUT /api/companies/:id/toggle-status
   */
  @Put(':id/toggle-status')
  @ApiOperation({ summary: 'Toggle company status (gone — lifecycle in SSO)' })
  @ApiResponse({ status: 410, description: 'Manage companies in SSO' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async toggleStatus(@Param('id') id: string) {
    return this.companiesService.toggleStatus(id);
  }

  /**
   * Delete company
   * DELETE /api/companies/:id
   */
  @Delete(':id')
  @ApiOperation({ summary: 'Delete company (gone — manage in SSO)' })
  @ApiResponse({ status: 410, description: 'Manage companies in SSO' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  @ApiResponse({ status: 403, description: 'Forbidden' })
  async remove(@Param('id') id: string) {
    return this.companiesService.remove(id);
  }
}
