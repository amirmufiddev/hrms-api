export function normalizeSearch(search?: string): string | undefined {
  const trimmed = search?.trim();
  return trimmed ? trimmed : undefined;
}

export function matchesNameNik(
  fields: {
    code?: string | null;
    firstName?: string | null;
    lastName?: string | null;
    names?: Array<string | null | undefined>;
  },
  search?: string,
): boolean {
  const needle = normalizeSearch(search)?.toLowerCase();
  if (!needle) return true;
  const first = (fields.firstName ?? '').trim();
  const last = (fields.lastName ?? '').trim();
  const joined = [first, last].filter(Boolean).join(' ');
  const haystack = [fields.code ?? '', first, last, joined, ...(fields.names ?? [])];
  return haystack.some((value) => (value ?? '').trim().toLowerCase().includes(needle));
}
