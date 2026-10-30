// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/hooks/api', () => ({
  useTaxReportDetail: () => ({
    isLoading: false,
    data: {
      financialYearLabel: 'FY2025-26',
      totalProceedsAud: 120,
      totalCostBaseAud: 100,
      totalCapitalGainGrossAud: 20,
      totalCapitalLossAud: 0,
      carriedForwardLossOpeningAud: 0,
      discountAppliedAud: 0,
      netCapitalGainAud: 20,
      carriedForwardLossClosingAud: 0,
      lineItems: [
        {
          symbol: 'ABC',
          accountName: 'Main',
          acquireDate: '2025-01-05',
          disposeDate: '2026-03-09',
          quantity: 1,
          proceedsAud: 120,
          costBaseAud: 100,
          capitalGainAud: 20,
          discountEligible: true,
        },
      ],
    },
  }),
}));
vi.mock('@/lib/privacy-context', () => ({
  usePrivacy: () => ({ hidden: false, mask: (value: string) => value }),
}));

import ReportDetailDialog from './ReportDetailDialog';

afterEach(cleanup);

describe('ReportDetailDialog', () => {
  it('shows disposal details and the tax disclaimer', () => {
    render(<ReportDetailDialog reportId='report-1' onHide={vi.fn()} />);
    expect(screen.getByText('ABC')).toBeInTheDocument();
    expect(screen.getByText('Main')).toBeInTheDocument();
    expect(screen.getByText('05/01/2025')).toBeInTheDocument();
    expect(screen.getByText('09/03/2026')).toBeInTheDocument();
    expect(screen.queryByText('2025-01-05')).not.toBeInTheDocument();
    expect(screen.queryByText('2026-03-09')).not.toBeInTheDocument();
    expect(screen.getByText(/not professional tax advice/)).toBeInTheDocument();
  });
});
