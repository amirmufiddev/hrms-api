import { readFileSync } from 'fs';
import { resolve } from 'path';

export interface SsoCompanyRaw {
  id: string;
  name: string;
  code: string | null;
  logo: string | null;
  address: string | null;
  phone: string | null;
}

export interface SsoDeptRaw {
  id: string;
  name: string;
  code: string | null;
  company_id: string;
  parent_id: string | null;
  classification: string | null;
  path: string | null;
  description: string | null;
}

export interface SsoPosRaw {
  id: string;
  name: string;
  code: string | null;
  company_id: string;
  department_id: string | null;
  parent_id: string | null;
  path: string | null;
  description: string | null;
}

export interface SsoUserRaw {
  id: string;
  name: string | null;
  username: string | null;
  email: string;
  role: string | null;
  banned: boolean;
  company_id: string | null;
  department_id: string | null;
  position_id: string | null;
  nik: string | null;
}

export interface SsoDirectory {
  companies: SsoCompanyRaw[];
  departments: SsoDeptRaw[];
  positions: SsoPosRaw[];
  users: SsoUserRaw[];
}

interface PageMeta {
  page: number;
  totalPages: number;
}

interface PageResponse<T> {
  data?: T[];
  meta?: PageMeta;
}

const PAGE_LIMIT = 100;
const TIMEOUT_MS = 60_000;

function loadBackendEnv(): void {
  const envPath = resolve(__dirname, '../../../.env');
  let text: string;
  try {
    text = readFileSync(envPath, 'utf8');
  } catch {
    return;
  }

  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    if (process.env[key] !== undefined) continue;
    let value = trimmed.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    process.env[key] = value;
  }
}

function requireEnv(name: string): string {
  const value = process.env[name]?.trim();
  if (!value) {
    throw new Error(`${name} belum di-set. Sinkron SSO memakai HTTP, bukan database SSO.`);
  }
  return value;
}

async function ssoGet<T>(path: string): Promise<T> {
  loadBackendEnv();
  const baseUrl = requireEnv('SSO_API_BASE_URL').replace(/\/$/, '');
  const apiKey = requireEnv('SSO_SERVICE_API_KEY');
  const response = await fetch(`${baseUrl}${path}`, {
    headers: {
      accept: 'application/json',
      'api-key': apiKey,
      'app-key': process.env.SSO_SERVICE_APP_KEY ?? '',
      'app-name': process.env.SSO_SERVICE_APP_NAME ?? '',
    },
    signal: AbortSignal.timeout(TIMEOUT_MS),
  });

  if (!response.ok) {
    const body = await response.text();
    throw new Error(
      `SSO ${path} gagal (${response.status}): ${body.slice(0, 300)}`,
    );
  }

  return (await response.json()) as T;
}

async function fetchAllPages<T>(path: string): Promise<T[]> {
  const items: T[] = [];
  let page = 1;
  let totalPages = 1;

  do {
    const separator = path.includes('?') ? '&' : '?';
    const res = await ssoGet<PageResponse<T>>(
      `${path}${separator}page=${page}&limit=${PAGE_LIMIT}`,
    );
    items.push(...(res.data ?? []));
    totalPages = res.meta?.totalPages ?? 1;
    page += 1;
  } while (page <= totalPages);

  return items;
}

/**
 * Ambil perusahaan, departemen, jabatan, dan user dari API SSO.
 * User lewat `/api/internal/users/directory` supaya pin dan rahasia akun tidak ikut.
 */
export async function fetchSsoDirectory(): Promise<SsoDirectory> {
  const companies = await fetchAllPages<{
    id: string;
    name: string;
    code: string | null;
    logo?: string | null;
    address?: string | null;
    phone?: string | null;
  }>('/api/companies');

  const departments = await fetchAllPages<{
    id: string;
    name: string;
    code: string | null;
    companyId: string | null;
    parentId: string | null;
    classification: string | null;
    path?: string | null;
    description: string | null;
  }>('/api/departments');

  const positions = await fetchAllPages<{
    id: string;
    name: string;
    code: string | null;
    companyId: string;
    departmentId: string | null;
    parentId: string | null;
    path?: string | null;
    description: string | null;
  }>('/api/positions');

  const users = await ssoGet<{
    data: Array<{
      id: string;
      name: string | null;
      username: string | null;
      email: string;
      role: string | null;
      banned: boolean;
      companyId: string | null;
      departmentId: string | null;
      positionId: string | null;
      nik: string | null;
    }>;
  }>('/api/internal/users/directory');

  return {
    companies: companies.map((company) => ({
      id: company.id,
      name: company.name,
      code: company.code,
      logo: company.logo ?? null,
      address: company.address ?? null,
      phone: company.phone ?? null,
    })),
    departments: departments.map((department) => ({
      id: department.id,
      name: department.name,
      code: department.code,
      company_id: department.companyId ?? '',
      parent_id: department.parentId,
      classification: department.classification,
      path: department.path ?? null,
      description: department.description,
    })),
    positions: positions.map((position) => ({
      id: position.id,
      name: position.name,
      code: position.code,
      company_id: position.companyId,
      department_id: position.departmentId,
      parent_id: position.parentId,
      path: position.path ?? null,
      description: position.description,
    })),
    users: (users.data ?? []).map((user) => ({
      id: user.id,
      name: user.name,
      username: user.username,
      email: user.email,
      role: user.role,
      banned: user.banned,
      company_id: user.companyId,
      department_id: user.departmentId,
      position_id: user.positionId,
      nik: user.nik,
    })),
  };
}
