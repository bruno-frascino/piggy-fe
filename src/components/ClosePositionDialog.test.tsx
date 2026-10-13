// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ClosePositionDialog from './ClosePositionDialog';

vi.mock('@/lib/privacy-context', () => ({
  usePrivacy: () => ({
    hidden: false,
    toggle: vi.fn(),
    hide: vi.fn(),
    mask: (v: string) => v,
  }),
}));

afterEach(() => {
  cleanup();
});

describe('ClosePositionDialog', () => {
  it('renders the close date as a calendar picker', () => {
    const onHide = vi.fn();
    const onSubmit = vi.fn();

    render(
      <ClosePositionDialog
        visible
        initial={{
          symbol: 'AAPL',
          name: 'Apple Inc.',
          industry: 'Technology',
          openDate: '2026-07-01',
          units: 10,
          buyPrice: 100,
          buyFee: 0,
          accountName: 'Main',
          exchangeCode: 'NASDAQ',
          currentPrice: 125,
        }}
        onHide={onHide}
        onSubmit={onSubmit}
      />
    );

    expect(screen.getByText('Close Position — AAPL')).toBeInTheDocument();
    expect(screen.getByDisplayValue('01/07/2026')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('DD/MM/YYYY')).toBeInTheDocument();
    expect(screen.queryByPlaceholderText('YYYY-MM-DD')).not.toBeInTheDocument();
  });

  it('submits a normalized ISO close date from the calendar state', () => {
    const onHide = vi.fn();
    const onSubmit = vi.fn();

    render(
      <ClosePositionDialog
        visible
        initial={{
          symbol: 'AAPL',
          name: 'Apple Inc.',
          industry: 'Technology',
          openDate: '2026-07-01',
          units: 10,
          buyPrice: 100,
          buyFee: 0,
          accountName: 'Main',
          exchangeCode: 'NASDAQ',
          currentPrice: 125,
        }}
        onHide={onHide}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /close position/i }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        closeDate: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
        closeUnits: 10,
        sellPrice: 125,
        sellFee: 0,
        closeReason: 'MANUAL',
      })
    );
  });

  it('fills the sell price and closure type from the stop loss', () => {
    const onSubmit = vi.fn();

    render(
      <ClosePositionDialog
        visible
        initial={{
          symbol: 'AAPL',
          name: 'Apple Inc.',
          industry: 'Technology',
          openDate: '2026-07-01',
          units: 10,
          buyPrice: 100,
          buyFee: 0,
          stopLoss: 92.5,
          accountName: 'Main',
          exchangeCode: 'NASDAQ',
          currentPrice: 125,
        }}
        onHide={vi.fn()}
        onSubmit={onSubmit}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /use stop loss/i }));
    fireEvent.click(screen.getByRole('button', { name: /close position/i }));

    expect(onSubmit).toHaveBeenCalledWith(
      expect.objectContaining({ sellPrice: 92.5, closeReason: 'STOP_LOSS' })
    );
  });

  it('disables "Use stop loss" when no stop loss is set', () => {
    render(
      <ClosePositionDialog
        visible
        initial={{
          symbol: 'AAPL',
          name: 'Apple Inc.',
          industry: 'Technology',
          openDate: '2026-07-01',
          units: 10,
          buyPrice: 100,
          buyFee: 0,
          accountName: 'Main',
          exchangeCode: 'NASDAQ',
          currentPrice: 125,
        }}
        onHide={vi.fn()}
        onSubmit={vi.fn()}
      />
    );

    expect(
      screen.getByRole('button', { name: /use stop loss/i })
    ).toBeDisabled();
  });

  it('displays the stop loss read-only, or a dash when none is set', () => {
    const base = {
      symbol: 'AAPL',
      name: 'Apple Inc.',
      industry: 'Technology',
      openDate: '2026-07-01',
      units: 10,
      buyPrice: 100,
      buyFee: 0,
      accountName: 'Main',
      exchangeCode: 'NASDAQ',
      currentPrice: 125,
    };
    const { rerender } = render(
      <ClosePositionDialog
        visible
        initial={{ ...base, stopLoss: 92.5 }}
        onHide={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByText('Stop Loss')).toBeInTheDocument();
    const field = screen.getByDisplayValue('92.5');
    expect(field).toHaveAttribute('readonly');

    rerender(
      <ClosePositionDialog
        visible
        initial={base}
        onHide={vi.fn()}
        onSubmit={vi.fn()}
      />
    );
    expect(screen.getByDisplayValue('—')).toBeInTheDocument();
  });
});
