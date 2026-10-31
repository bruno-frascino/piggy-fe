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
  it('caps both comments at 200px with scrolling and preserves long text on save', () => {
    const onSave = vi.fn();
    const longText = 'Trading rationale\n'.repeat(60);
    render(
      <EditClosedTradeDialog
        trade={{ ...trade, closeDate: '2026-07-15' }}
        onHide={vi.fn()}
        onSave={onSave}
        onDeletePosition={vi.fn()}
      />
    );
    const notes = screen
      .getByText('Buy and sell notes (optional)')
      .closest('details')!;
    notes.open = true;
    for (const label of ['Buy Comments', 'Sell Comments']) {
      const field = screen.getByLabelText(label);
      expect(field).toHaveClass('position-comments');
      expect(field).toHaveStyle({ maxHeight: '200px' });
      Object.defineProperty(field, 'offsetParent', {
        configurable: true,
        value: document.body,
      });
      vi.spyOn(field, 'getBoundingClientRect').mockReturnValue(
        new DOMRect(0, 0, 300, 96)
      );
      let contentHeight = 96;
      Object.defineProperty(field, 'scrollHeight', {
        configurable: true,
        get: () => contentHeight,
      });
      fireEvent.focus(field);
      contentHeight = 150;
      fireEvent.input(field, { target: { value: 'Short rationale' } });
      expect(field).toHaveStyle({ height: '150px' });
      contentHeight = 1000;
      fireEvent.input(field, { target: { value: longText } });
      expect(field).toHaveStyle({ height: '200px', overflowY: 'scroll' });
      expect(field).toHaveValue(longText);
    }
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({ buyComments: longText, sellComments: longText })
    );
    vi.restoreAllMocks();
  });
  it('uses drawer-width grids for long crypto values without rounding submitted prices', () => {
    const cryptoTrade = {
      ...trade,
      symbol: 'BTC-AUD',
      exchange: 'KRAKEN',
      baseCurrency: 'AUD',
      closeDate: '2026-07-15',
      buyPrice: 125000,
      sellPrice: 118952.400011012,
      sellFee: 10.4143,
    };
    const onSave = vi.fn();
    render(
      <EditClosedTradeDialog
        trade={cryptoTrade}
        onHide={vi.fn()}
        onSave={onSave}
        onDeletePosition={vi.fn()}
      />
    );
    const dialog = screen.getByRole('dialog');
    expect(dialog).toHaveClass('closed-trade-dialog');
    expect(dialog.querySelector('.task-summary')).toHaveClass(
      'closed-trade-summary'
    );
    expect(dialog.querySelector('.task-summary')).not.toHaveClass(
      'md:grid-cols-4'
    );
    expect(
      screen.getByLabelText('Close Date *').closest('.closed-trade-fields')
    ).not.toBeNull();
    expect(
      screen.getByLabelText('Sell Price *').closest('.closed-trade-fields')
    ).not.toBeNull();
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave).toHaveBeenCalledWith(cryptoTrade);
  });
  it('uses a task drawer with persistent actions and preserves all parcel facts on save', () => {
    const onSave = vi.fn();
    const validTrade = {
      ...trade,
      closeDate: '2026-07-15',
      buyComments: 'Entry rationale',
      sellComments: 'Exit rationale',
    };
    render(
      <EditClosedTradeDialog
        trade={validTrade}
        onHide={vi.fn()}
        onSave={onSave}
        onDeletePosition={vi.fn()}
      />
    );
    expect(screen.getByRole('dialog')).toHaveClass('task-dialog');
    expect(
      screen
        .getByRole('button', { name: 'Save Changes' })
        .closest('.p-dialog-footer')
    ).not.toBeNull();
    expect(screen.getByLabelText('Close Date *')).toBeInTheDocument();
    expect(
      screen.getByText('Buy and sell notes (optional)').closest('details')
    ).not.toHaveAttribute('open');
    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }));
    expect(onSave).toHaveBeenCalledWith(validTrade);
  });
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
    expect(screen.getByLabelText('Close Date *')).toHaveAttribute(
      'aria-invalid',
      'true'
    );
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
    expect(screen.getByText('10/07/2026')).toBeInTheDocument();
    expect(screen.queryByText('2026-07-10')).not.toBeInTheDocument();
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
