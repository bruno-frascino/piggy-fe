// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MASKED_VALUE } from '@/lib/format';

const {
  rows,
  updateCloseEventMock,
  updatePositionMock,
  deletePositionMock,
  showToastMock,
  privacyState,
} = vi.hoisted(() => ({
  rows: [
    {
      id: 'close-1',
      positionId: 'position-1',
      symbol: 'AAPL',
      name: 'Apple Inc.',
      exchange: 'NASDAQ',
      openDate: '2026-01-01',
      closeDate: '2026-02-01',
      unitsClosed: 5,
      buyPrice: 100,
      buyFee: 1,
      sellPrice: 120,
      sellFee: 1,
      periodDays: 31,
      baseCurrency: 'USD',
    },
  ],
  updateCloseEventMock: vi.fn(),
  updatePositionMock: vi.fn(),
  deletePositionMock: vi.fn(),
  showToastMock: vi.fn(),
  privacyState: { hidden: false },
}));

vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ show: showToastMock }),
}));

vi.mock('@/hooks/api', () => ({
  useClosedPositions: () => ({
    data: { trades: rows, total: rows.length },
    isLoading: false,
  }),
  useUpdateCloseEvent: () => ({ mutateAsync: updateCloseEventMock }),
  useUpdatePosition: () => ({ mutateAsync: updatePositionMock }),
  useDeletePosition: () => ({ mutateAsync: deletePositionMock }),
  useTaxReportPositionUsage: () => ({
    data: {
      'position-1': [
        {
          reportId: 'r1',
          financialYearLabel: 'FY2025-26',
          generatedAt: '2026-07-24T00:00:00.000Z',
          stale: true,
        },
      ],
    },
  }),
}));

vi.mock('@/components/PageHeader', () => ({
  default: () => <div>History header</div>,
}));

vi.mock('@/components/EditClosedTradeDialog', () => ({
  default: ({
    trade,
    reportUsage,
    onSave,
  }: {
    trade: (typeof rows)[number];
    reportUsage?: { financialYearLabel: string }[];
    onSave: (updated: (typeof rows)[number]) => Promise<void>;
  }) => (
    <>
      <p>usage: {(reportUsage ?? []).map(u => u.financialYearLabel).join()}</p>
      <button
        onClick={() =>
          void onSave({
            ...trade,
            closeDate: '2026-02-05',
            buyComments: 'Breakout entry',
          })
        }
      >
        Save edited dates
      </button>
      <button onClick={() => void onSave({ ...trade })}>
        Save open side untouched
      </button>
    </>
  ),
}));

vi.mock('@/lib/privacy-context', () => ({
  usePrivacy: () => ({
    hidden: privacyState.hidden,
    toggle: vi.fn(),
    hide: vi.fn(),
    mask: (v: string) => (privacyState.hidden ? MASKED_VALUE : v),
  }),
}));

import HistoryPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
  updatePositionMock.mockResolvedValue({ success: true });
  updateCloseEventMock.mockResolvedValue({ success: true });
});

afterEach(() => {
  cleanup();
  privacyState.hidden = false;
});

describe('HistoryPage', () => {
  it('persists edited open-side and close-side fields to their owning records', async () => {
    render(<HistoryPage />);

    fireEvent.click(screen.getByRole('button', { name: 'AAPL' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save edited dates' }));

    await waitFor(() => {
      expect(updatePositionMock).toHaveBeenCalledWith({
        id: 'position-1',
        payload: { openReason: 'Breakout entry' },
      });
      expect(updateCloseEventMock).toHaveBeenCalledWith({
        id: 'close-1',
        data: {
          closeDate: '2026-02-05',
          exitPrice: 120,
          sellFees: 1,
          notes: '',
        },
      });
    });
  });

  it('skips the position request when no open-side field changed', async () => {
    render(<HistoryPage />);

    fireEvent.click(screen.getByRole('button', { name: 'AAPL' }));
    fireEvent.click(
      screen.getByRole('button', { name: 'Save open side untouched' })
    );

    await waitFor(() => expect(updateCloseEventMock).toHaveBeenCalled());
    expect(updatePositionMock).not.toHaveBeenCalled();
  });

  it('flags rows already used by a tax report and passes usage to the dialog', () => {
    render(<HistoryPage />);

    expect(
      screen.getByTitle(
        'Changed since FY2025-26 tax report was generated — regenerate it'
      )
    ).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'AAPL' }));
    expect(screen.getByText('usage: FY2025-26')).toBeInTheDocument();
  });

  it('surfaces an error toast and keeps the dialog open when saving fails', async () => {
    updateCloseEventMock.mockRejectedValue(new Error('Request failed'));

    render(<HistoryPage />);

    fireEvent.click(screen.getByRole('button', { name: 'AAPL' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save edited dates' }));

    await waitFor(() => {
      expect(showToastMock).toHaveBeenCalledWith(
        expect.objectContaining({
          severity: 'error',
          summary: 'Action failed',
          detail: 'Request failed',
        })
      );
    });
    expect(
      screen.getByRole('button', { name: 'Save edited dates' })
    ).toBeInTheDocument();
  });
});

describe('HistoryPage privacy mode', () => {
  it('masks fees and position totals but keeps buy/sell price visible', () => {
    privacyState.hidden = true;

    render(<HistoryPage />);

    expect(screen.getAllByText(MASKED_VALUE).length).toBeGreaterThan(0);
    // Buy price ($100.00) is a per-unit price and stays visible.
    expect(screen.getByText('$100.00')).toBeInTheDocument();
    expect(screen.queryByText('$98.00')).not.toBeInTheDocument();
  });
});
