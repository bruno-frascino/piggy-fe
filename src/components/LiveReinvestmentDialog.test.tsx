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
  refresh: vi.fn(),
  assets: [
    {
      assetId: 'asset-1',
      symbol: 'ETF',
      name: 'Example fund',
      assetType: 'ETF',
    },
  ],
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
  usePostAccountReinvestment: () => ({
    mutateAsync: mocks.mutate,
    isPending: mocks.state.pending,
  }),
  useAccountTradeCapability: () => ({
    data: { mode: mocks.state.mode },
    isFetching: mocks.state.fetching,
    isError: mocks.state.error,
    refetch: mocks.refresh,
  }),
  useIncomeEligibleAssets: () => ({
    data: mocks.assets,
    isFetching: mocks.state.fetching,
    isError: mocks.state.error,
    refetch: mocks.refresh,
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
    inputId,
    value,
    options,
    disabled,
    onChange,
  }: {
    inputId: string;
    value: string;
    options: { value: string; label: string }[];
    disabled: boolean;
    onChange: (event: { value: string }) => void;
  }) => (
    <select
      id={inputId}
      value={value}
      disabled={disabled}
      onChange={event => onChange({ value: event.target.value })}
    >
      <option value=''>Select asset</option>
      {options.map(option => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  ),
}));
import LiveReinvestmentDialog from './LiveReinvestmentDialog';

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
function show() {
  return render(
    <LiveReinvestmentDialog
      accountId='a1'
      accountName='Main'
      onHide={mocks.hide}
    />
  );
}
function fill() {
  fireEvent.change(screen.getByLabelText('Distribution asset'), {
    target: { value: 'asset-1' },
  });
  for (const [label, value] of [
    ['Gross distribution', '100.000000000001'],
    ['Withholding', '15'],
    ['Franked amount', '60'],
    ['Unfranked amount', '40.000000000001'],
    ['Franking credit (AUD)', '25.714285714286'],
    ['New parcel units', '4'],
    ['Acquisition unit price', '20'],
    ['Acquisition fees', '1'],
    ['Residual paid to account cash', '4.000000000001'],
    ['Statement reference', 'issuer-statement'],
  ])
    fireEvent.change(screen.getByLabelText(label), { target: { value } });
  fireEvent.click(screen.getByRole('checkbox'));
}

describe('statement-supported reinvestment entry', () => {
  it('retains exact tax/residual amounts and the identical request key after a lost response', async () => {
    mocks.mutate
      .mockRejectedValueOnce(new Error('Response lost'))
      .mockResolvedValueOnce({});
    show();
    fill();
    fireEvent.click(
      screen.getByRole('button', { name: 'Record linked reinvestment' })
    );
    expect(await screen.findByText('Response lost')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Record linked reinvestment' })
    );
    await waitFor(() => expect(mocks.hide).toHaveBeenCalledOnce());
    const first = mocks.mutate.mock.calls[0][0];
    expect(first).toMatchObject({
      accountId: 'a1',
      input: {
        income: {
          assetId: 'asset-1',
          grossAmount: '100.000000000001',
          frankingCreditAud: '25.714285714286',
          sourceReference: 'issuer-statement',
          sequence: 1,
        },
        acquisition: { quantity: '4', price: '20', fees: '1', sequence: 2 },
        residualAmount: '4.000000000001',
        residualDisposition: 'ACCOUNT_CASH',
        statementConfirmed: true,
      },
    });
    expect(first.input.idempotencyKey).toBe(
      mocks.mutate.mock.calls[1][0].input.idempotencyKey
    );
  });
  it('requires acknowledgement and refuses a residual mismatch instead of adding funding', () => {
    show();
    expect(
      screen.getByRole('button', { name: 'Record linked reinvestment' })
    ).toBeDisabled();
    fill();
    fireEvent.change(screen.getByLabelText('Residual paid to account cash'), {
      target: { value: '5' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Record linked reinvestment' })
    );
    expect(
      screen.getByText(/net income must exactly fund/)
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
      show();
      expect(
        screen.getByRole('button', { name: 'Record linked reinvestment' })
      ).toBeDisabled();
      if (mode === 'privacy')
        expect(
          screen.queryByLabelText('Gross distribution')
        ).not.toBeInTheDocument();
      expect(mocks.mutate).not.toHaveBeenCalled();
    }
  );
});
