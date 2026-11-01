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
import { PrivacyProvider } from '@/lib/privacy-context';
import type { OpeningPreview, OpeningStatement } from '@/lib/types';

const mocks = vi.hoisted(() => ({
  mutateAsync: vi.fn(),
  online: true,
  save: vi.fn(),
  refetch: vi.fn(),
  drafts: {
    data: {
      statements: [] as OpeningStatement[],
      nextBeforeVersion: null as number | null,
    },
    isLoading: false,
    isError: false,
    error: null as unknown,
  },
}));
vi.mock('@/hooks/api', () => ({
  useOpeningStatements: (_accountId: string, beforeVersion?: number) =>
    beforeVersion === undefined
      ? { ...mocks.drafts, refetch: mocks.refetch }
      : {
          isError: true,
          error: new Error('Older history unavailable'),
          refetch: mocks.refetch,
        },
  useSaveOpeningStatement: () => ({
    mutateAsync: mocks.save,
    isPending: false,
  }),
  useOpeningPreview: () => ({
    mutateAsync: mocks.mutateAsync,
    isPending: false,
  }),
}));
vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mocks.online,
}));
vi.mock('primereact/calendar', () => ({
  Calendar: ({
    inputId,
    value,
    onChange,
  }: {
    inputId: string;
    value: Date | null;
    onChange: (event: { value: Date }) => void;
  }) => (
    <input
      id={inputId}
      type='date'
      value={value ? '2026-10-01' : ''}
      onChange={event =>
        onChange({ value: new Date(`${event.target.value}T00:00:00`) })
      }
    />
  ),
}));
import OpeningPreviewDialog from './OpeningPreviewDialog';

const result: OpeningPreview = {
  accountId: 'a1',
  openingDate: '2026-10-01',
  timezone: 'Australia/Sydney',
  boundary: 'END_OF_DAY',
  asOfDate: '2026-10-31',
  mode: 'PREVIEW_ONLY',
  sourceFingerprint: 'snapshot',
  parcels: [
    {
      positionId: 'p1',
      symbol: 'ABC.AX',
      currency: 'AUD',
      openingQuantity: '10',
      expectedCurrentQuantity: '6',
      recordedCurrentQuantity: '6',
    },
  ],
  cashBalances: [
    {
      currency: 'AUD',
      openingAmount: '1000',
      tradeOnlyEndingAmount: '1475',
      minimumTradeOnlyAmount: '1000',
    },
  ],
  counts: { parcels: 1, postBoundaryTrades: 1, blockingIssues: 1 },
  issues: [
    {
      code: 'FUNDING_GAP',
      severity: 'BLOCKING',
      message: 'Recorded trades need actual funding records.',
      sourceId: 'b',
    },
  ],
};
const draft: OpeningStatement = {
  id: 's1',
  accountId: 'a1',
  version: 1,
  openingDate: '2026-10-01',
  timezone: 'Australia/Sydney',
  state: 'DRAFT',
  sourceFingerprint: 'old-snapshot',
  createdAt: '2026-10-31T00:00:00Z',
  cashBalances: [{ currency: 'AUD', amount: '1000' }],
  parcelCount: 1,
};
function setup(hidden = false) {
  render(
    <PrivacyProvider initialHidden={hidden}>
      <OpeningPreviewDialog
        account={{ id: 'a1', name: 'Main', status: 'ACTIVE', closedAt: null }}
        onHide={vi.fn()}
      />
    </PrivacyProvider>
  );
}
function submit() {
  fireEvent.change(screen.getByLabelText('Opening date'), {
    target: { value: '2026-10-01' },
  });
  fireEvent.change(screen.getByLabelText('Cash balance 1'), {
    target: { value: '1000' },
  });
  fireEvent.click(screen.getByRole('button', { name: 'Preview balances' }));
}
beforeEach(() => {
  vi.clearAllMocks();
  mocks.online = true;
  mocks.mutateAsync.mockResolvedValue(result);
  mocks.save.mockResolvedValue({ created: true, statement: draft });
  mocks.drafts.data = { statements: [], nextBeforeVersion: null };
  mocks.drafts.isError = false;
  mocks.drafts.error = null;
});
afterEach(cleanup);

describe('OpeningPreviewDialog', () => {
  it('allows returning to latest drafts when fetching an older page fails', async () => {
    mocks.drafts.data = { statements: [draft], nextBeforeVersion: 1 };
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Earlier drafts' }));
    await screen.findByText('Older history unavailable');
    fireEvent.click(screen.getByRole('button', { name: 'Latest drafts' }));
    expect(
      screen.getByRole('button', { name: 'Load draft v1' })
    ).toBeInTheDocument();
  });
  it('requires a reviewed preview before explicitly saving an inactive draft', async () => {
    setup();
    const save = screen.getByRole('button', { name: 'Save inactive draft' });
    expect(save).toBeDisabled();
    submit();
    await screen.findByText('1475');
    expect(save).toBeEnabled();
    fireEvent.click(save);
    await screen.findByText(/Opening draft v1 saved/);
    expect(mocks.save).toHaveBeenCalledWith({
      accountId: 'a1',
      input: {
        openingDate: result.openingDate,
        cashBalances: [{ currency: 'AUD', amount: '1000' }],
        sourceFingerprint: result.sourceFingerprint,
      },
    });
    expect(save).toBeDisabled();
    expect(
      screen.getByText(/cash and trading behavior have not changed/)
    ).toBeInTheDocument();
  });
  it('loads saved inputs but requires a new preview and warns on changed source records', async () => {
    mocks.drafts.data.statements = [draft];
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Load draft v1' }));
    expect(screen.getByLabelText('Cash balance 1')).toHaveValue('1000');
    expect(
      screen.getByRole('button', { name: 'Save inactive draft' })
    ).toBeDisabled();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: 'Preview balances' }));
    await screen.findByText(/saved draft differs from the current preview/);
  });
  it('shows a save conflict without claiming success or replacing the preview', async () => {
    mocks.save.mockRejectedValue({
      response: {
        status: 409,
        data: { message: 'Preview changed; preview again' },
      },
    });
    setup();
    submit();
    await screen.findByText('1475');
    fireEvent.click(
      screen.getByRole('button', { name: 'Save inactive draft' })
    );
    await screen.findByText('Preview changed; preview again');
    expect(
      screen.queryByText(/Opening draft v1 saved/)
    ).not.toBeInTheDocument();
  });
  it('surfaces saved-history loading failures with an explicit retry', () => {
    mocks.drafts.isError = true;
    mocks.drafts.error = new Error('History unavailable');
    setup();
    expect(screen.getByText('History unavailable')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry loading drafts' })
    );
    expect(mocks.refetch).toHaveBeenCalled();
  });
  it('requires explicit date and cash, with no suggested funding', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Preview balances' }));
    expect(
      screen.getByText(/Choose an opening date and enter actual cash/)
    ).toBeInTheDocument();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
    expect(screen.getByLabelText('Cash balance 1')).toHaveValue('');
  });
  it('submits decimal strings and displays reconciliation without a confirm action', async () => {
    setup();
    submit();
    await waitFor(() =>
      expect(
        screen.getByRole('region', { name: 'Opening preview results' })
      ).toBeInTheDocument()
    );
    expect(mocks.mutateAsync).toHaveBeenCalledWith({
      accountId: 'a1',
      input: {
        openingDate: '2026-10-01',
        cashBalances: [{ currency: 'AUD', amount: '1000' }],
      },
    });
    expect(screen.getByText('1475')).toBeInTheDocument();
    expect(screen.getByText(/FUNDING_GAP/)).toBeInTheDocument();
    expect(screen.getByText('Preview as of 31/10/2026')).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /confirm/i })
    ).not.toBeInTheDocument();
    expect(screen.getByRole('dialog')).toHaveClass('task-dialog');
    expect(
      screen
        .getByRole('button', { name: 'Preview balances' })
        .closest('.p-dialog-footer')
    ).not.toBeNull();
  });
  it('removes stale results when input changes', async () => {
    setup();
    submit();
    await screen.findByText('1475');
    fireEvent.change(screen.getByLabelText('Cash balance 1'), {
      target: { value: '2000' },
    });
    expect(
      screen.queryByRole('region', { name: 'Opening preview results' })
    ).not.toBeInTheDocument();
  });
  it('supports adding and removing separate currency balances', () => {
    setup();
    fireEvent.click(screen.getByRole('button', { name: 'Add currency' }));
    fireEvent.change(screen.getByLabelText('Currency 2'), {
      target: { value: 'usd' },
    });
    expect(screen.getByLabelText('Currency 2')).toHaveValue('USD');
    fireEvent.click(screen.getByRole('button', { name: 'Remove currency 2' }));
    expect(screen.queryByLabelText('Currency 2')).not.toBeInTheDocument();
  });
  it('masks cash and units under the existing privacy setting', async () => {
    setup(true);
    expect(screen.getByLabelText('Cash balance 1')).toHaveAttribute(
      'type',
      'password'
    );
    submit();
    await screen.findByRole('region', { name: 'Opening preview results' });
    expect(screen.queryByText('1475')).not.toBeInTheDocument();
    expect(screen.queryByText('10')).not.toBeInTheDocument();
  });
  it('disables preview offline rather than queueing requests', () => {
    mocks.online = false;
    setup();
    expect(
      screen.getByRole('button', { name: 'Preview balances' })
    ).toBeDisabled();
    expect(
      screen.getByText(/Offline requests are not queued/)
    ).toBeInTheDocument();
    expect(mocks.mutateAsync).not.toHaveBeenCalled();
  });
  it('shows client errors and sanitizes server failures', async () => {
    mocks.mutateAsync.mockRejectedValue({
      response: { status: 400, data: { message: 'Currencies must be unique' } },
    });
    setup();
    submit();
    await screen.findByText('Currencies must be unique');
    mocks.mutateAsync.mockRejectedValue({
      response: { status: 500, data: { message: 'Private database details' } },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Preview balances' }));
    await screen.findByText(
      'Opening preview is temporarily unavailable. Please try again.'
    );
    expect(
      screen.queryByText('Private database details')
    ).not.toBeInTheDocument();
  });
});
