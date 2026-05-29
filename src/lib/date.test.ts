import { describe, expect, it } from 'vitest';
import { computeChartCutoffDate } from './date';

function localDateStr(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

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
