import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { IsEnum, IsNumber, IsOptional, IsString, MinLength, validateSync } from 'class-validator';
enum Environment {
  Development = 'development',
  Production = 'production',
  Test = 'test',
}

class EnvironmentVariables {
  @IsString()
  DATABASE_URL: string;

  @IsString()
  @MinLength(16)
  JWT_SECRET: string;

  @IsString()
  @IsOptional()
  JWT_EXPIRES_IN: string = '7d';

  @IsEnum(Environment)
  @IsOptional()
  NODE_ENV: Environment = Environment.Development;

  @IsNumber()
  @IsOptional()
  PORT: number = 3001;

  @IsString()
  @IsOptional()
  CORS_ORIGIN: string = 'http://localhost:3000';

  @IsString()
  @IsOptional()
  DEFAULT_TENANT_ID?: string;

  @IsString()
  @IsOptional()
  LOG_LEVEL?: string = 'debug';

  // Storage
  @IsString()
  @IsOptional()
  STORAGE_TYPE?: string = 'local';

  @IsString()
  @IsOptional()
  STORAGE_LOCAL_PATH?: string = './uploads';

  // Email (SMTP) - all optional, email disabled if SMTP_HOST not set
  @IsString()
  @IsOptional()
  SMTP_HOST?: string;

  @IsNumber()
  @IsOptional()
  SMTP_PORT?: number = 587;

  @IsString()
  @IsOptional()
  SMTP_USER?: string;

  @IsString()
  @IsOptional()
  SMTP_PASS?: string;

  @IsString()
  @IsOptional()
  SMTP_FROM?: string = 'HRMS <noreply@hrms.local>';

  // Microsoft Graph API - optional, preferred over SMTP when configured
  @IsString()
  @IsOptional()
  MS_GRAPH_TENANT_ID?: string;

  @IsString()
  @IsOptional()
  MS_GRAPH_CLIENT_ID?: string;

  @IsString()
  @IsOptional()
  MS_GRAPH_CLIENT_SECRET?: string;

  @IsString()
  @IsOptional()
  MS_GRAPH_SENDER_EMAIL?: string;

  // Redis - optional, falls back to in-memory if not set
  @IsString()
  @IsOptional()
  REDIS_HOST?: string;

  @IsNumber()
  @IsOptional()
  REDIS_PORT?: number = 6379;

  @IsString()
  @IsOptional()
  REDIS_PASSWORD?: string;

  @IsOptional()
  @IsString()
  SSO_API_BASE_URL?: string;

  @IsOptional()
  @IsString()
  SSO_SERVICE_API_KEY?: string;

  @IsOptional()
  @IsString()
  SSO_SERVICE_APP_KEY?: string = 'eal-hrms';

  @IsOptional()
  @IsString()
  SSO_SERVICE_APP_NAME?: string;

  @IsOptional()
  @IsString()
  @MinLength(32)
  ATTENDANCE_DEVICE_APP_TOKEN?: string;

  @IsOptional()
  @IsString()
  ATTENDANCE_DEVICE_TENANT_ID?: string;
}

export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    throw new Error(
      `Environment validation failed:\n${errors.map((e) => Object.values(e.constraints || {}).join(', ')).join('\n')}`,
    );
  }

  const nodeEnv = validatedConfig.NODE_ENV;
  if (nodeEnv === Environment.Production) {
    if (!validatedConfig.SSO_API_BASE_URL) {
      throw new Error('SSO_API_BASE_URL is required in production');
    }
    if (!validatedConfig.SSO_SERVICE_API_KEY || validatedConfig.SSO_SERVICE_API_KEY.length < 32) {
      throw new Error('SSO_SERVICE_API_KEY is required in production (min 32 chars)');
    }
  }

  return validatedConfig;
}
