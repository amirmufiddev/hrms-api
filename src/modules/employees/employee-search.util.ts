import type { Prisma } from '@prisma/client';

function fieldOrForToken(token: string): Prisma.EmployeeWhereInput {
  return {
    OR: [
      { firstName: { contains: token, mode: 'insensitive' } },
      { lastName: { contains: token, mode: 'insensitive' } },
      { email: { contains: token, mode: 'insensitive' } },
      { employeeCode: { contains: token, mode: 'insensitive' } },
    ],
  };
}

/** Pencarian teks: frasa utuh ATAU semua kata (mis. "ALDI DARMAWAN" → firstName + lastName). */
export function buildEmployeeSearchWhere(search: string): Prisma.EmployeeWhereInput {
  const trimmed = search.trim();
  const tokens = trimmed.split(/\s+/).filter(Boolean);
  const orBranches: Prisma.EmployeeWhereInput[] = [fieldOrForToken(trimmed)];

  if (tokens.length > 1) {
    orBranches.push({
      AND: tokens.map((token) => fieldOrForToken(token)),
    });
  }

  return { OR: orBranches };
}
