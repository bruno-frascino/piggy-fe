// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { HoldingRow } from '@/hooks/useHoldingRows';
import { MASKED_VALUE } from '@/lib/format';
import PositionDetailsDialog from './PositionDetailsDialog';

const privacy = vi.hoisted(() => ({ hidden: false }));
vi.mock('@/lib/privacy-context', () => ({
  usePrivacy: () => ({
    hidden: privacy.hidden,
    mask: (value: string) => (privacy.hidden ? MASKED_VALUE : value),
  }),
}));

const row: HoldingRow = {
  id: 'parcel-1',
  symbol: 'SHIB-AUD',
  name: 'Shiba Inu',
  assetType: 'CRYPTO',
  exchangeCode: 'KRAKEN',
  accountName: 'Savings',
  openDate: '2026-10-01',
  units: 1234567890.123456,
  buyPrice: 0.000012345678,
  buyFee: 5,
  industry: '',
  originalIndex: 0,
  openDateTs: 0,
  daysOpen: 30,
  openPosition: 15005,
  effectivePrice: 0.000023456789,
  currentPosition: 25000,
  currentReturnAbs: 9995,
  currentReturnPct: 9995 / 15005,
  priceDrawdownPct: 0,
  stopLossPosition: NaN,
  stopLossReturnPct: NaN,
  stopLossTriggered: false,
  allocationPct: 1,
};

function renderDetails(
  overrides: Partial<Parameters<typeof PositionDetailsDialog>[0]> = {}
) {
  const props = {
    row,
    currency: 'AUD',
    hasQuote: false,
    onHide: vi.fn(),
    onEdit: vi.fn(),
    onClose: vi.fn(),
    ...overrides,
  };
  render(<PositionDetailsDialog {...props} />);
  return props;
}

afterEach(() => {
  cleanup();
  privacy.hidden = false;
});

describe('PositionDetailsDialog', () => {
  it('shows purchase and performance details, precise crypto prices and honest unavailable states', () => {
    renderDetails();
    expect(screen.getByRole('dialog')).toHaveClass('task-dialog');
    expect(screen.getByText('01/10/2026')).toBeInTheDocument();
    expect(screen.getByText('1,234,567,890.123456')).toBeInTheDocument();
    expect(screen.getByText('A$0.000012345678')).toBeInTheDocument();
    expect(screen.getByText('A$0.000023456789')).toBeInTheDocument();
    expect(screen.getByText('Not set')).toBeInTheDocument();
    expect(screen.getByText('No buy comments recorded.')).toBeInTheDocument();
    expect(screen.getByText(/Live quote unavailable/)).toBeInTheDocument();
    expect(screen.queryByText(/NaN|Invalid Date/)).not.toBeInTheDocument();
  });

  it('keeps complete multiline comments in a keyboard-accessible scroll region and exposes distinct actions', () => {
    const comments = 'First line\n' + 'Rationale '.repeat(500);
    const props = renderDetails({
      row: { ...row, buyComments: comments },
      hasQuote: true,
    });
    const actions = screen.getByRole('button', { name: 'Done' }).parentElement;
    expect(
      screen.getByRole('region', { name: 'Buy comment text' })
    ).toHaveTextContent('First line');
    expect(
      screen.getByRole('region', { name: 'Buy comment text' }).textContent
    ).toBe(comments);
    expect(
      screen.getByRole('region', { name: 'Buy comment text' })
    ).toHaveAttribute('tabindex', '0');
    expect(screen.getByText(/latest available quote/)).toBeInTheDocument();
    expect(actions).toHaveClass('position-details-actions', 'flex-nowrap');
    expect(actions?.querySelectorAll('button')).toHaveLength(3);
    fireEvent.click(screen.getByRole('button', { name: 'Edit position' }));
    fireEvent.click(screen.getByRole('button', { name: 'Close position' }));
    fireEvent.click(screen.getByRole('button', { name: 'Done' }));
    expect(props.onEdit).toHaveBeenCalledOnce();
    expect(props.onClose).toHaveBeenCalledOnce();
    expect(props.onHide).toHaveBeenCalledOnce();
  });

  it('masks units and portfolio amounts while retaining per-unit prices and percentages', () => {
    privacy.hidden = true;
    renderDetails({
      row: {
        ...row,
        stopLoss: 0.00001,
        stopLossPosition: 12345,
        stopLossReturnPct: -0.2,
        stopLossTriggered: true,
      },
    });
    expect(screen.getAllByText(MASKED_VALUE).length).toBeGreaterThan(0);
    expect(screen.queryByText('1,234,567,890.123456')).not.toBeInTheDocument();
    expect(screen.queryByText('A$25,000.00')).not.toBeInTheDocument();
    expect(screen.getByText('A$0.000012345678')).toBeInTheDocument();
    expect(screen.getByText('-20.00%')).toBeInTheDocument();
    expect(screen.getByText('Triggered')).toBeInTheDocument();
    expect(
      screen.getByRole('dialog').querySelector('.text-green-600, .text-red-600')
    ).toBeNull();
  });
});
