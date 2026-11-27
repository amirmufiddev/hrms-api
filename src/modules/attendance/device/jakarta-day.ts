const JAKARTA = 'Asia/Jakarta';

export function jakartaDayWindow(dateKey: string): { start: Date; end: Date } | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateKey)) {
    return null;
  }
  const [year, month, day] = dateKey.split('-').map(Number);
  const start = new Date(Date.UTC(year, month - 1, day, -7, 0, 0, 0));
  const formatted = new Intl.DateTimeFormat('en-CA', {
    timeZone: JAKARTA,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(start);
  if (formatted !== dateKey) {
    return null;
  }
  return { start, end: new Date(start.getTime() + 24 * 60 * 60 * 1000 - 1) };
}
