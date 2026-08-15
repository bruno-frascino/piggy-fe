// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import ScreenerResultsList from './ScreenerResultsList';
import type { ScreenerResult } from '@/lib/types';

afterEach(() => {
  cleanup();
});

const stock: ScreenerResult = {
  symbol: 'AAPL',
  name: 'Apple Inc.',
  exchange: 'NASDAQ',
  sector: 'Technology',
  industry: 'Consumer Electronics',
  marketCap: 2_500_000_000_000,
  price: 200,
  lastAnnualDividend: 1,
  isEtf: false,
  country: 'US',
  alreadyTracked: false,
  inWatchlist: false,
};

describe('ScreenerResultsList', () => {
  it('shows an empty state when there are no results', () => {
    render(<ScreenerResultsList results={[]} onAddToWatchlist={vi.fn()} />);
    expect(screen.getByText(/no results yet/i)).toBeInTheDocument();
  });

  it('renders results and formats a large market cap', () => {
    render(
      <ScreenerResultsList results={[stock]} onAddToWatchlist={vi.fn()} />
    );

    expect(screen.getAllByText('AAPL').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/2\.50T/).length).toBeGreaterThan(0);
  });

  it('calls onAddToWatchlist with the selected stock', () => {
    const onAddToWatchlist = vi.fn();
    render(
      <ScreenerResultsList
        results={[stock]}
        onAddToWatchlist={onAddToWatchlist}
      />
    );

    fireEvent.click(
      screen.getAllByRole('button', { name: /add aapl to watchlist|add/i })[0]
    );

    expect(onAddToWatchlist).toHaveBeenCalledWith(stock);
  });
});
