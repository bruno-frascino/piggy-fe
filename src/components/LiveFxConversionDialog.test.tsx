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
  state: {
    online: true,
    hidden: false,
    pending: false,
    fetching: false,
    error: false,
    mode: 'LIVE_LEDGER',
  },
}));
vi.mock('@/hooks/api', () => ({
  usePostAccountFxConversion: () => ({
    mutateAsync: mocks.mutate,
    isPending: mocks.state.pending,
  }),
  useAccountTradeCapability: () => ({
    data: { mode: mocks.state.mode },
    isFetching: mocks.state.fetching,
    isError: mocks.state.error,
    error: mocks.state.error ? new Error('Source changed') : null,
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
import LiveFxConversionDialog from './LiveFxConversionDialog';

beforeEach(() => {
  vi.resetAllMocks();
  Object.assign(mocks.state, {
    online: true,
    hidden: false,
    pending: false,
    fetching: false,
    error: false,
    mode: 'LIVE_LEDGER',
  });
});
afterEach(cleanup);
function fill() {
  for (const [label, value] of [
    ['Amount exchanged (before fees)', '1500.000000000001'],
    ['Amount received (before fees)', '975'],
    ['Fee in from currency', '5'],
    ['Fee in to currency', '2'],
    ['Statement reference', 'broker-statement'],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole('checkbox'));
}

describe('explicit FX form', () => {
  it('preserves exact statement amounts and both fee currencies, retaining identical retry identity after an ambiguous error', async () => {
    mocks.mutate
      .mockRejectedValueOnce(new Error('Response lost'))
      .mockResolvedValueOnce({});
    render(
      <LiveFxConversionDialog
        accountId='a1'
        accountName='Main'
        onHide={mocks.hide}
      />
    );
    fill();
    fireEvent.click(
      screen.getByRole('button', { name: 'Record linked FX conversion' })
    );
    expect(await screen.findByText('Response lost')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Record linked FX conversion' })
    );
    await waitFor(() => expect(mocks.hide).toHaveBeenCalledOnce());
    expect(mocks.mutate.mock.calls[0][0]).toMatchObject({
      accountId: 'a1',
      input: {
        from: { currency: 'AUD', amount: '1500.000000000001' },
        to: { currency: 'USD', amount: '975' },
        fees: [
          { currency: 'AUD', amount: '5' },
          { currency: 'USD', amount: '2' },
        ],
        sourceReference: 'broker-statement',
      },
    });
    expect(mocks.mutate.mock.calls[0][0].input.idempotencyKey).toBe(
      mocks.mutate.mock.calls[1][0].input.idempotencyKey
    );
  });

  it('rejects same-currency conversion and requires explicit acknowledgement', () => {
    render(
      <LiveFxConversionDialog
        accountId='a1'
        accountName='Main'
        onHide={mocks.hide}
      />
    );
    expect(
      screen.getByRole('button', { name: 'Record linked FX conversion' })
    ).toBeDisabled();
    fill();
    fireEvent.change(screen.getByLabelText('To currency'), {
      target: { value: 'AUD' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Record linked FX conversion' })
    );
    expect(
      screen.getByText(/Enter two distinct currencies/)
    ).toBeInTheDocument();
    expect(mocks.mutate).not.toHaveBeenCalled();
  });

  it.each(['offline', 'privacy', 'pending', 'fetching', 'error', 'legacy'])(
    'blocks %s posting',
    mode => {
      if (mode === 'offline') mocks.state.online = false;
      if (mode === 'privacy') mocks.state.hidden = true;
      if (mode === 'pending') mocks.state.pending = true;
      if (mode === 'fetching') mocks.state.fetching = true;
      if (mode === 'error') mocks.state.error = true;
      if (mode === 'legacy') mocks.state.mode = 'LEGACY';
      render(
        <LiveFxConversionDialog
          accountId='a1'
          accountName='Main'
          onHide={mocks.hide}
        />
      );
      expect(
        screen.getByRole('button', { name: 'Record linked FX conversion' })
      ).toBeDisabled();
      expect(mocks.mutate).not.toHaveBeenCalled();
    }
  );
});
