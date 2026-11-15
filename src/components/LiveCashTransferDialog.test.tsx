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
import type { ReactNode } from 'react';

const mocks = vi.hoisted(() => ({
  mutate: vi.fn(),
  hide: vi.fn(),
  toast: vi.fn(),
  state: { online: true, hidden: false, pending: false, mode: 'LIVE_LEDGER' },
}));
vi.mock('@/hooks/api', () => ({
  usePostAccountCashTransfer: () => ({
    mutateAsync: mocks.mutate,
    isPending: mocks.state.pending,
  }),
  useAccountTradeCapability: () => ({
    data: { mode: mocks.state.mode, nextSequence: 1 },
    isFetching: false,
    isError: false,
  }),
}));
vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mocks.state.online,
}));
vi.mock('@/lib/privacy-context', () => ({
  usePrivacy: () => ({ hidden: mocks.state.hidden }),
}));
vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ show: mocks.toast }),
}));
vi.mock('./AppDialog', () => ({
  default: ({
    children,
    footer,
  }: {
    children: ReactNode;
    footer: ReactNode;
  }) => (
    <div>
      {children}
      {footer}
    </div>
  ),
}));
vi.mock('primereact/dropdown', () => ({
  Dropdown: ({
    value,
    options,
    onChange,
    disabled,
  }: {
    value: string;
    options: { id: string; name: string }[];
    onChange: (event: { value: string }) => void;
    disabled: boolean;
  }) => (
    <select
      aria-label='Destination account'
      value={value}
      onChange={event => onChange({ value: event.target.value })}
      disabled={disabled}
    >
      <option value=''>Select account</option>
      {options.map(option => (
        <option key={option.id} value={option.id}>
          {option.name}
        </option>
      ))}
    </select>
  ),
}));

import LiveCashTransferDialog from './LiveCashTransferDialog';

const account = { id: 'a1', name: 'Source' };
const accounts = [
  account,
  { id: 'a2', name: 'Destination' },
  { id: 'demo', name: 'Practice', isDemo: true },
  { id: 'archived', name: 'Archived', status: 'CLOSED' as const },
];
beforeEach(() => {
  vi.resetAllMocks();
  Object.assign(mocks.state, {
    online: true,
    hidden: false,
    pending: false,
    mode: 'LIVE_LEDGER',
  });
});
afterEach(cleanup);

function fill() {
  fireEvent.change(screen.getByLabelText('Destination account'), {
    target: { value: 'a2' },
  });
  fireEvent.change(screen.getByLabelText('Principal amount'), {
    target: { value: '40.000000000001' },
  });
  fireEvent.change(screen.getByLabelText('Sender-paid fee'), {
    target: { value: '0.5' },
  });
  fireEvent.change(screen.getByLabelText('Source reference'), {
    target: { value: 'statement-transfer-1' },
  });
  fireEvent.click(screen.getByRole('checkbox'));
}

describe('LiveCashTransferDialog', () => {
  it('filters endpoints, requires acknowledgement, and submits exact amounts with stable retries', async () => {
    mocks.mutate
      .mockRejectedValueOnce(new Error('Network response lost'))
      .mockResolvedValueOnce({ created: false });
    render(
      <LiveCashTransferDialog
        account={account}
        accounts={accounts}
        onHide={mocks.hide}
      />
    );
    expect(
      screen.queryByRole('option', { name: 'Source' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Practice' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('option', { name: 'Archived' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Record paired transfer' })
    ).toBeDisabled();
    fill();
    fireEvent.click(
      screen.getByRole('button', { name: 'Record paired transfer' })
    );
    expect(
      await screen.findByText('Network response lost')
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Record paired transfer' })
    );
    await waitFor(() => expect(mocks.hide).toHaveBeenCalledOnce());
    expect(mocks.mutate.mock.calls[0][0]).toMatchObject({
      accountId: 'a1',
      input: {
        toAccountId: 'a2',
        amount: '40.000000000001',
        fee: '0.5',
        sourceSequence: 1,
        destinationSequence: 1,
        currency: 'AUD',
        sourceReference: 'statement-transfer-1',
      },
    });
    expect(mocks.mutate.mock.calls[0][0].input.idempotencyKey).toBe(
      mocks.mutate.mock.calls[1][0].input.idempotencyKey
    );
    expect(mocks.toast).toHaveBeenCalledWith(
      expect.objectContaining({ severity: 'success' })
    );
  });

  it.each(['offline', 'privacy', 'legacy', 'pending'])(
    'blocks %s transfers without submitting',
    mode => {
      if (mode === 'offline') mocks.state.online = false;
      if (mode === 'privacy') mocks.state.hidden = true;
      if (mode === 'legacy') mocks.state.mode = 'LEGACY';
      if (mode === 'pending') mocks.state.pending = true;
      render(
        <LiveCashTransferDialog
          account={account}
          accounts={accounts}
          onHide={mocks.hide}
        />
      );
      expect(
        screen.getByRole('button', { name: 'Record paired transfer' })
      ).toBeDisabled();
      expect(mocks.mutate).not.toHaveBeenCalled();
    }
  );
});
