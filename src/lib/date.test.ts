import { describe, expect, it } from 'vitest';
import {
  computeChartCutoffDate,
  computeHistoryPeriodRange,
  formatDateDDMMYYYY,
  toLocalDateString,
} from './date';

function localDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

describe('date formatting helpers', () => {
  it('formats date to dd/mm/yyyy', () => {
    expect(formatDateDDMMYYYY('2026-05-27T12:00:00.000Z')).toBe('27/05/2026');
  });

  it('formats local date string to yyyy-mm-dd', () => {
    const value = toLocalDateString(new Date(2026, 4, 27, 12, 0, 0));
    expect(value).toBe('2026-05-27');
  });
});

describe('computeChartCutoffDate', () => {
  // Construct in local time so getDate()/getMonth()/getFullYear() are predictable
  const now = new Date(2026, 4, 27, 12, 0, 0); // 27 May 2026, noon local

  it('W returns 7 days before now', () => {
    const cutoff = computeChartCutoffDate('W', now);
    expect(localDateStr(cutoff)).toBe('2026-05-20');
  });

  it('M returns one calendar month before now', () => {
    const cutoff = computeChartCutoffDate('M', now);
    expect(localDateStr(cutoff)).toBe('2026-04-27');
  });

  it('3M returns three calendar months before now', () => {
    const cutoff = computeChartCutoffDate('3M', now);
    expect(localDateStr(cutoff)).toBe('2026-02-27');
  });

  it('6M returns six calendar months before now', () => {
    const cutoff = computeChartCutoffDate('6M', now);
    expect(localDateStr(cutoff)).toBe('2025-11-27');
  });

  it('YTD returns 1 January of the current year', () => {
    const cutoff = computeChartCutoffDate('YTD', now);
    expect(cutoff.getFullYear()).toBe(2026);
    expect(cutoff.getMonth()).toBe(0);
    expect(cutoff.getDate()).toBe(1);
  });

  it('Y returns exactly one year before now', () => {
    const cutoff = computeChartCutoffDate('Y', now);
    expect(localDateStr(cutoff)).toBe('2025-05-27');
  });

  it('5Y returns five years before now', () => {
    const cutoff = computeChartCutoffDate('5Y', now);
    expect(localDateStr(cutoff)).toBe('2021-05-27');
  });
});

describe('computeHistoryPeriodRange', () => {
  // 27 May 2026, noon local — inside FY2025-26 (1 Jul 2025 - 30 Jun 2026)
  const now = new Date(2026, 4, 27, 12, 0, 0);

  it('CURRENT_FY returns 1 Jul of the FY start year to 30 Jun of the next year', () => {
    const range = computeHistoryPeriodRange('CURRENT_FY', now);
    expect(range).toEqual({ start: '2025-07-01', end: '2026-06-30' });
  });

  it('LAST_FY returns the previous financial year', () => {
    const range = computeHistoryPeriodRange('LAST_FY', now);
    expect(range).toEqual({ start: '2024-07-01', end: '2025-06-30' });
  });

  it('YTD returns 1 January of the current year to now', () => {
    const range = computeHistoryPeriodRange('YTD', now);
    expect(range).toEqual({ start: '2026-01-01', end: '2026-05-27' });
  });

  it('LAST_YEAR returns the full previous calendar year', () => {
    const range = computeHistoryPeriodRange('LAST_YEAR', now);
    expect(range).toEqual({ start: '2025-01-01', end: '2025-12-31' });
  });

  it('ALL returns empty bounds', () => {
    const range = computeHistoryPeriodRange('ALL', now);
    expect(range).toEqual({ start: '', end: '' });
  });

  it('CURRENT_FY before July uses the previous calendar year as FY start', () => {
    const beforeJuly = new Date(2026, 3, 15, 12, 0, 0); // 15 Apr 2026
    const range = computeHistoryPeriodRange('CURRENT_FY', beforeJuly);
    expect(range).toEqual({ start: '2025-07-01', end: '2026-06-30' });
  });
});
