// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { formatCurrency } from '@/lib/format';

const {
  useTradingAccountsMock,
  useStatisticsSummaryMock,
  useStatisticsRiskMock,
  useStatisticsDistributionsMock,
  useStatisticsBreakdownsMock,
  useStatisticsTimeSeriesMock,
  useStatisticsClosedTradesMock,
} = vi.hoisted(() => ({
  useTradingAccountsMock: vi.fn(),
  useStatisticsSummaryMock: vi.fn(),
  useStatisticsRiskMock: vi.fn(),
  useStatisticsDistributionsMock: vi.fn(),
  useStatisticsBreakdownsMock: vi.fn(),
  useStatisticsTimeSeriesMock: vi.fn(),
  useStatisticsClosedTradesMock: vi.fn(),
}));

vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid='chart-stub' />,
  Bar: () => <div data-testid='bar-chart-stub' />,
}));

vi.mock('@/hooks/api', () => ({
  useTradingAccounts: useTradingAccountsMock,
  useStatisticsSummary: useStatisticsSummaryMock,
  useStatisticsRisk: useStatisticsRiskMock,
  useStatisticsDistributions: useStatisticsDistributionsMock,
  useStatisticsBreakdowns: useStatisticsBreakdownsMock,
  useStatisticsTimeSeries: useStatisticsTimeSeriesMock,
  useStatisticsClosedTrades: useStatisticsClosedTradesMock,
}));

import StatisticsView from './StatisticsView';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  useTradingAccountsMock.mockReturnValue({
    data: [{ id: 'acc-1', name: 'Main' }],
  });
  useStatisticsSummaryMock.mockReturnValue({
    data: {
      totalTrades: 10,
      winRate: 0.6,
      avgWin: 10,
      avgLoss: -5,
      profitFactor: 2,
      expectancyPerTrade: 2,
      avgHoldingDays: 12,
      realizedPnL: 100,
      unrealizedPnL: 50,
      totalPnL: 150,
      metricDefinitionVersion: 'stats-v1',
      asOf: new Date().toISOString(),
    },
    isLoading: false,
  });
  useStatisticsRiskMock.mockReturnValue({
    data: {
      volatilityAnnualized: 0.2,
      sharpeRatio: 1.1,
      maxDrawdownPct: 8.5,
      methodology: 'SNAPSHOT_RETURNS_V1',
      confidence: 'MEDIUM',
      sampleSize: 120,
    },
    isLoading: false,
  });
  useStatisticsDistributionsMock.mockReturnValue({
    data: {
      returnPctHistogram: [],
      pnlHistogram: [{ min: -10, max: 0, count: 2 }],
      holdingDaysHistogram: [],
      sampleSize: 5,
    },
  });
  useStatisticsBreakdownsMock.mockReturnValue({
    data: {
      rows: [{ key: 'EQUITY', label: 'EQUITY', value: 1200, weight: 0.8 }],
      total: 1200,
    },
  });
  useStatisticsTimeSeriesMock.mockReturnValue({
    data: {
      points: [
        { bucketStart: '2026-01-01', bucketEnd: '2026-01-31', value: 1000 },
      ],
      currency: 'USD',
      asOf: new Date().toISOString(),
    },
    isLoading: false,
  });
  useStatisticsClosedTradesMock.mockReturnValue({
    data: {
      rows: [
        {
          id: 'tx-1',
          positionId: 'p-1',
          symbol: 'AAPL',
          accountId: 'acc-1',
          exchangeCode: 'NASDAQ',
          openDate: '2026-01-01',
          closeDate: '2026-01-20',
          unitsClosed: 1,
          pnl: 20,
          returnPct: 10,
          holdingDays: 19,
        },
        {
          id: 'tx-2',
          positionId: 'p-2',
          symbol: 'TSLA',
          accountId: 'acc-1',
          exchangeCode: 'NASDAQ',
          openDate: '2026-02-01',
          closeDate: '2026-02-15',
          unitsClosed: 2,
          pnl: -30,
          returnPct: -8,
          holdingDays: 14,
        },
      ],
      meta: { total: 2, limit: 25, offset: 0 },
    },
    isLoading: false,
  });

  const printMock = vi.fn();
  const focusMock = vi.fn();
  const documentOpenMock = vi.fn();
  const documentWriteMock = vi.fn();
  const documentCloseMock = vi.fn();
  vi.stubGlobal(
    'open',
    vi.fn(() => ({
      document: {
        open: documentOpenMock,
        write: documentWriteMock,
        close: documentCloseMock,
      },
      focus: focusMock,
      print: printMock,
    }))
  );
});

describe('StatisticsView', () => {
  it('renders KPI cards and closed trades rows', () => {
    render(<StatisticsView />);

    expect(screen.getByText('Statistics')).toBeInTheDocument();
    expect(screen.getByText('Total P/L')).toBeInTheDocument();
    expect(screen.getByText('AAPL')).toBeInTheDocument();
    expect(screen.getAllByTestId('chart-stub').length).toBeGreaterThan(0);
    expect(screen.getByTestId('bar-chart-stub')).toBeInTheDocument();
  });

  it('updates closed-trades hook params when clicking sort headers', async () => {
    render(<StatisticsView />);

    fireEvent.click(screen.getByRole('button', { name: 'Sort by P/L' }));

    await waitFor(() => {
      expect(useStatisticsClosedTradesMock).toHaveBeenLastCalledWith(
        expect.objectContaining({
          sortBy: 'pnl',
          sortDir: 'desc',
        })
      );
    });
  });

  it('exports a PDF snapshot via print window', async () => {
    render(<StatisticsView />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Export PDF snapshot' })
    );

    await waitFor(() => {
      expect(window.open).toHaveBeenCalled();
    });
  });

  it('toggles compare mode and shows comparison period helper text', async () => {
    render(<StatisticsView />);

    fireEvent.click(screen.getByRole('button', { name: 'Compare: OFF' }));

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Compare: ON' })
      ).toBeInTheDocument();
      expect(
        screen.getByText(/Comparing .* against current period/i)
      ).toBeInTheDocument();
    });
  });

  it('switches distribution metric selection', () => {
    render(<StatisticsView />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Distribution metric Return %' })
    );

    expect(
      screen.getByRole('button', { name: 'Distribution metric Return %' })
    ).toBeInTheDocument();
  });

  it('applies YTD preset and refreshes summary filter scope', async () => {
    render(<StatisticsView />);

    fireEvent.click(screen.getByRole('button', { name: 'Preset YTD' }));

    const currentYear = new Date().getFullYear();
    await waitFor(() => {
      const hasYtdCall = useStatisticsSummaryMock.mock.calls.some(call => {
        const firstArg = call[0] as { dateFrom?: string } | undefined;
        const secondArg = call[1];
        return (
          secondArg === undefined &&
          firstArg?.dateFrom === `${currentYear}-01-01`
        );
      });
      expect(hasYtdCall).toBe(true);
    });
  });

  it('opens and closes the trade details dialog from symbol action', async () => {
    render(<StatisticsView />);

    fireEvent.click(
      screen.getByRole('button', { name: 'View trade details AAPL' })
    );

    await waitFor(() => {
      expect(screen.getByText('Trade Details · AAPL')).toBeInTheDocument();
      expect(screen.getByText('Position ID')).toBeInTheDocument();
    });

    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText(formatCurrency(20))).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Close trade details' })
    );

    await waitFor(() => {
      expect(
        screen.queryByText('Trade Details · AAPL')
      ).not.toBeInTheDocument();
    });
  });

  it('navigates to next trade details from the dialog', async () => {
    render(<StatisticsView />);

    fireEvent.click(
      screen.getByRole('button', { name: 'View trade details AAPL' })
    );

    await waitFor(() => {
      expect(screen.getByText('Trade Details · AAPL')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Next trade details' }));

    await waitFor(() => {
      expect(screen.getByText('Trade Details · TSLA')).toBeInTheDocument();
      expect(screen.getByText('p-2')).toBeInTheDocument();
    });
  });
});
