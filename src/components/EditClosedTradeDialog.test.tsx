// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClosedTrade } from '@/lib/types';
import { MASKED_VALUE } from '@/lib/format';
import EditClosedTradeDialog from './EditClosedTradeDialog';

const privacyState = { hidden: false };

vi.mock('@/lib/privacy-context', () => ({
  usePrivacy: () => ({
    hidden: privacyState.hidden,
    toggle: vi.fn(),
    hide: vi.fn(),
    mask: (v: string) => (privacyState.hidden ? MASKED_VALUE : v),
  }),
}));

afterEach(() => {
  cleanup();
  privacyState.hidden = false;
});

const trade: ClosedTrade = {
  id: 'close-1',
  positionId: 'position-1',
  symbol: 'AAPL',
  openDate: '2026-07-10',
  closeDate: '2026-07-01',
  unitsClosed: 5,
  buyPrice: 100,
  buyFee: 1,
  sellPrice: 120,
  sellFee: 1,
  periodDays: 0,
};

describe('EditClosedTradeDialog', () => {
  it('rejects a close date before the open date', () => {
    const onSave = vi.fn();

    render(
      <EditClosedTradeDialog
        trade={trade}
        onHide={vi.fn()}
        onSave={onSave}
        onDeletePosition={vi.fn()}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));

    expect(onSave).not.toHaveBeenCalled();
    expect(
      screen.getByText('Close date cannot be before open date')
    ).toBeInTheDocument();
  });

  it('renders parcel-defining fields as read-only text, not inputs', () => {
    render(
      <EditClosedTradeDialog
        trade={{ ...trade, name: 'Apple Inc.', exchange: 'NASDAQ' }}
        onHide={vi.fn()}
        onSave={vi.fn()}
        onDeletePosition={vi.fn()}
      />
    );

    [
      'Symbol',
      'Name',
      'Exchange',
      'Open Date',
      'Units Closed',
      'Buy Price',
      'Buy Fee',
    ].forEach(label => {
      expect(screen.queryByLabelText(label)).not.toBeInTheDocument();
    });
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getByText('Apple Inc.')).toBeInTheDocument();
    expect(screen.getByText('NASDAQ')).toBeInTheDocument();
    expect(screen.getByText('2026-07-10')).toBeInTheDocument();
    expect(screen.getByText('5.000')).toBeInTheDocument();
  });

  it('warns that an already-generated tax report is now out of date', () => {
    render(
      <EditClosedTradeDialog
        trade={trade}
        reportUsage={[
          {
            reportId: 'r1',
            financialYearLabel: 'FY2025-26',
            generatedAt: '2026-07-24T00:00:00.000Z',
            stale: true,
          },
        ]}
        onHide={vi.fn()}
        onSave={vi.fn()}
        onDeletePosition={vi.fn()}
      />
    );

    expect(
      screen.getByText(/FY2025-26 tax report was generated/)
    ).toBeInTheDocument();
  });
});

describe('EditClosedTradeDialog privacy mode', () => {
  it('masks the summary strip and units/fee fields when values are hidden', () => {
    privacyState.hidden = true;

    render(
      <EditClosedTradeDialog
        trade={trade}
        onHide={vi.fn()}
        onSave={vi.fn()}
        onDeletePosition={vi.fn()}
      />
    );

    expect(screen.getAllByText(MASKED_VALUE).length).toBeGreaterThan(0);
    expect(screen.queryByText('5.000')).not.toBeInTheDocument();
  });
});
