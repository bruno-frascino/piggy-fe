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
  | 'D'
  | 'W'
  | 'M'
  | '3M'
  | '6M'
  | 'YTD'
  | 'Y'
  | '5Y'
  | 'ALL';

export type HistoryPeriodPreset =
  | 'CURRENT_FY'
  | 'LAST_FY'
  | 'YTD'
  | 'LAST_YEAR'
  | 'ALL';

function financialYearStartYear(d: Date): number {
  // Australian financial year starts 1 July.
  return d.getMonth() >= 6 ? d.getFullYear() : d.getFullYear() - 1;
}

/**
 * Returns the [start, end] YYYY-MM-DD bounds (local time) for a History page
 * period preset. 'ALL' returns empty strings, meaning no bound.
 */
export function computeHistoryPeriodRange(
  preset: HistoryPeriodPreset,
  now: Date
): { start: string; end: string } {
  switch (preset) {
    case 'CURRENT_FY': {
      const startYear = financialYearStartYear(now);
      return {
        start: toLocalDateString(new Date(startYear, 6, 1)),
        end: toLocalDateString(new Date(startYear + 1, 5, 30)),
      };
    }
    case 'LAST_FY': {
      const startYear = financialYearStartYear(now) - 1;
      return {
        start: toLocalDateString(new Date(startYear, 6, 1)),
        end: toLocalDateString(new Date(startYear + 1, 5, 30)),
      };
    }
    case 'YTD':
      return {
        start: toLocalDateString(new Date(now.getFullYear(), 0, 1)),
        end: toLocalDateString(now),
      };
    case 'LAST_YEAR':
      return {
        start: toLocalDateString(new Date(now.getFullYear() - 1, 0, 1)),
        end: toLocalDateString(new Date(now.getFullYear() - 1, 11, 31)),
      };
    case 'ALL':
      return { start: '', end: '' };
  }
}

/**
 * Returns the earliest date that should be visible for the given timeframe,
 * relative to `now`. Returns null for 'ALL' (no cutoff).
 */
export function computeChartCutoffDate(
  timeframe: Exclude<ChartTimeframe, 'ALL'>,
  now: Date
): Date {
  switch (timeframe) {
    case 'D':
      return new Date(now.getTime() - 1 * 86_400_000);
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
