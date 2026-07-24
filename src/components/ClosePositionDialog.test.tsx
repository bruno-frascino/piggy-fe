// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ClosePositionDialog from './ClosePositionDialog';

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
      })
    );
  });
});
