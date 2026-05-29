export function formatDateDDMMYYYY(value: string | Date): string {
  const d = value instanceof Date ? value : new Date(value);
  if (isNaN(d.getTime())) return String(value);

  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const yyyy = d.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

/** Formats a Date as YYYY-MM-DD using LOCAL time (safe for date comparisons). */
export function toLocalDateString(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

export type ChartTimeframe =
  | 'W'
  | 'M'
  | '3M'
  | '6M'
  | 'YTD'
  | 'Y'
  | '5Y'
  | 'ALL';

/**
 * Returns the earliest date that should be visible for the given timeframe,
 * relative to `now`. Returns null for 'ALL' (no cutoff).
 */
export function computeChartCutoffDate(
  timeframe: Exclude<ChartTimeframe, 'ALL'>,
  now: Date
): Date {
  switch (timeframe) {
    case 'W':
      return new Date(now.getTime() - 7 * 86_400_000);
    case 'M':
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case '3M':
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case '6M':
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case 'YTD':
      return new Date(now.getFullYear(), 0, 1);
    case 'Y':
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    case '5Y':
      return new Date(now.getFullYear() - 5, now.getMonth(), now.getDate());
  }
}
