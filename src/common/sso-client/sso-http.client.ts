import { HttpService } from '@nestjs/axios';
import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
  UnauthorizedException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

export interface SsoClientOptions {
  /** Override default timeout (10s). */
  timeoutMs?: number;
}

/**
 * Generic base client for HRMS -> SSO service-to-service calls.
 *
 * Authentication: shared-secret api-key (api-key + app-key + app-name headers),
 * verified by SSO's `ServiceApiKeyGuard`.
 */
@Injectable()
export class SsoHttpClient {
  private readonly logger = new Logger(SsoHttpClient.name);

  constructor(
    protected readonly http: HttpService,
    protected readonly config: ConfigService,
  ) {}

  protected getBaseUrl(): string {
    const url = this.config.get<string>('SSO_API_BASE_URL');
    if (!url) {
      throw new ServiceUnavailableException('SSO_API_BASE_URL is not configured');
    }
    return url.replace(/\/$/, '');
  }

  protected serviceHeaders(): Record<string, string> {
    const apiKey = this.config.get<string>('SSO_SERVICE_API_KEY');
    const appKey = this.config.get<string>('SSO_SERVICE_APP_KEY');
    const appName = this.config.get<string>('SSO_SERVICE_APP_NAME');

    if (!apiKey) {
      throw new ServiceUnavailableException(
        'SSO_SERVICE_API_KEY is not configured. ' +
          'Cannot make authenticated calls to SSO service.',
      );
    }

    return {
      'Content-Type': 'application/json',
      'api-key': apiKey,
      'app-key': appKey ?? '',
      'app-name': appName ?? '',
    };
  }

  private handleHttpError(method: string, path: string, error: unknown): never {
    const axiosError = error as {
      response?: {
        status?: number;
        data?: { message?: string | string[] };
      };
      message?: string;
    };
    const response = axiosError?.response;
    const status = response?.status;
    const data = response?.data as
      | { message?: string | string[]; errors?: unknown }
      | undefined;
    const rawMessage = data?.message;
    const fieldErrors = Array.isArray(data?.errors)
      ? data.errors.filter((item): item is string => typeof item === 'string')
      : [];
    let errorMsg = Array.isArray(rawMessage)
      ? rawMessage.join(', ')
      : typeof rawMessage === 'string'
        ? rawMessage
        : undefined;
    if (fieldErrors.length > 0 && (!errorMsg || errorMsg === 'Validation failed')) {
      errorMsg = fieldErrors.join(', ');
    }

    this.logger.warn(
      `SSO ${method} ${path} failed: ${axiosError?.message ?? error}`,
      {
        status,
        message: errorMsg || axiosError?.message,
      },
    );

    if (status) {
      if (status === 400) {
        throw new BadRequestException(errorMsg || 'Bad request to SSO service');
      }
      if (status === 401) {
        throw new UnauthorizedException(errorMsg || 'Unauthorized SSO request');
      }
      if (status === 403) {
        throw new ForbiddenException(errorMsg || 'Forbidden SSO request');
      }
      if (status === 404) {
        throw new NotFoundException(errorMsg || 'Resource not found in SSO');
      }
      if (status === 409) {
        throw new ConflictException(errorMsg || 'Conflict in SSO service');
      }
      if (status === 422) {
        throw new UnprocessableEntityException(
          errorMsg || 'Unprocessable entity in SSO service',
        );
      }
      if (status >= 500) {
        throw new ServiceUnavailableException(
          errorMsg || 'SSO service unavailable',
        );
      }
      throw new HttpException(errorMsg || 'SSO error', status);
    }

    throw new ServiceUnavailableException('SSO service unavailable');
  }

  protected async get<T>(path: string, options: SsoClientOptions = {}): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.http.get<T>(`${this.getBaseUrl()}${path}`, {
          headers: this.serviceHeaders(),
          timeout: options.timeoutMs ?? 10_000,
        }),
      );
      return res.data;
    } catch (error) {
      this.handleHttpError('GET', path, error);
    }
  }

  protected async post<T>(
    path: string,
    body: unknown,
    options: SsoClientOptions = {},
  ): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.http.post<T>(`${this.getBaseUrl()}${path}`, body, {
          headers: this.serviceHeaders(),
          timeout: options.timeoutMs ?? 10_000,
        }),
      );
      return res.data;
    } catch (error) {
      this.handleHttpError('POST', path, error);
    }
  }

  protected async put<T>(
    path: string,
    body: unknown,
    options: SsoClientOptions = {},
  ): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.http.put<T>(`${this.getBaseUrl()}${path}`, body, {
          headers: this.serviceHeaders(),
          timeout: options.timeoutMs ?? 10_000,
        }),
      );
      return res.data;
    } catch (error) {
      this.handleHttpError('PUT', path, error);
    }
  }

  protected async patch<T>(
    path: string,
    body: unknown,
    options: SsoClientOptions = {},
  ): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.http.patch<T>(`${this.getBaseUrl()}${path}`, body, {
          headers: this.serviceHeaders(),
          timeout: options.timeoutMs ?? 10_000,
        }),
      );
      return res.data;
    } catch (error) {
      this.handleHttpError('PATCH', path, error);
    }
  }

  protected async deleteRequest<T>(
    path: string,
    options: SsoClientOptions = {},
  ): Promise<T> {
    try {
      const res = await firstValueFrom(
        this.http.delete<T>(`${this.getBaseUrl()}${path}`, {
          headers: this.serviceHeaders(),
          timeout: options.timeoutMs ?? 10_000,
        }),
      );
      return res.data;
    } catch (error) {
      this.handleHttpError('DELETE', path, error);
    }
  }
}
