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

const { rows, updateCloseEventMock, updatePositionMock, deletePositionMock } =
  vi.hoisted(() => ({
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
  }));

vi.mock('@/hooks/api', () => ({
  useClosedPositions: () => ({ data: rows, isLoading: false }),
  useUpdateCloseEvent: () => ({ mutateAsync: updateCloseEventMock }),
  useUpdatePosition: () => ({ mutateAsync: updatePositionMock }),
  useDeletePosition: () => ({ mutateAsync: deletePositionMock }),
}));

vi.mock('@/components/PageHeader', () => ({
  default: () => <div>History header</div>,
}));

vi.mock('@/components/EditClosedTradeDialog', () => ({
  default: ({
    trade,
    onSave,
  }: {
    trade: (typeof rows)[number];
    onSave: (updated: (typeof rows)[number]) => Promise<void>;
  }) => (
    <button
      onClick={() =>
        void onSave({
          ...trade,
          openDate: '2026-01-05',
          closeDate: '2026-02-05',
        })
      }
    >
      Save edited dates
    </button>
  ),
}));

import HistoryPage from './page';

beforeEach(() => {
  vi.clearAllMocks();
  updatePositionMock.mockResolvedValue({ success: true });
  updateCloseEventMock.mockResolvedValue({ success: true });
});

afterEach(cleanup);

describe('HistoryPage', () => {
  it('persists edited open and close dates to their owning records', async () => {
    render(<HistoryPage />);

    fireEvent.click(screen.getByRole('button', { name: 'AAPL' }));
    fireEvent.click(screen.getByRole('button', { name: 'Save edited dates' }));

    await waitFor(() => {
      expect(updatePositionMock).toHaveBeenCalledWith({
        id: 'position-1',
        payload: { openDate: '2026-01-05' },
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
});
