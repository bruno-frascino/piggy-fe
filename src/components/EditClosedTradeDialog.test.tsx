// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ClosedTrade } from '@/lib/types';
import EditClosedTradeDialog from './EditClosedTradeDialog';

afterEach(cleanup);

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
});
