// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { MASKED_VALUE } from '@/lib/format';

vi.mock('@/lib/theme-context', () => ({
  useTheme: () => ({ resolvedTheme: 'light' }),
}));
vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ show: vi.fn() }),
}));

const mockAccounts = [
  { id: 'acc-1', name: 'Account 1', status: 'ACTIVE' as const },
  { id: 'acc-2', name: 'Account 2', status: 'ACTIVE' as const },
];

const {
  mockRouter,
  mockSearchParams,
  emptyPortfolio,
  useTradingAccountsMock,
  createAccountMock,
  openingPreviewMock,
  capitalFlowMock,
  privacyState,
  historyState,
  portfolioState,
} = vi.hoisted(() => ({
  mockRouter: { replace: vi.fn() },
  mockSearchParams: new URLSearchParams(),
  emptyPortfolio: [] as unknown[],
  useTradingAccountsMock: vi.fn(),
  createAccountMock: vi.fn(),
  openingPreviewMock: vi.fn(),
  capitalFlowMock: vi.fn(),
  privacyState: { hidden: false },
  historyState: {
    data: [{ date: '2026-10-01', equity: 100 }] as
      | { date: string; equity: number }[]
      | undefined,
    isFetched: true,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  },
  portfolioState: {
    data: [] as unknown[] | undefined,
    isFetched: true,
    isLoading: false,
    isError: false,
    isFetching: false,
    refetch: vi.fn(),
  },
}));

vi.mock('@/hooks/api', () => ({
  useOpeningStatements: () => ({ isLoading: false, isError: false }),
  useSaveOpeningStatement: () => ({ isPending: false }),
  useOpeningPreview: () => ({
    mutateAsync: openingPreviewMock,
    isPending: false,
  }),
  usePostAccountCapitalFlow: () => ({
    mutateAsync: capitalFlowMock,
    isPending: false,
  }),
  usePostAccountCashTransfer: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePostAccountFxConversion: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  usePostAccountReinvestment: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useIncomeEligibleAssets: () => ({
    data: [],
    isFetching: false,
    isError: false,
  }),
  useAccountTradeCapability: () => ({
    data: { mode: 'LEGACY', nextSequence: null },
    isFetching: false,
    isError: false,
  }),
  useLiveCapitalOperations: () => ({
    data: {
      items: [],
      total: 0,
      limit: 100,
      offset: 0,
      activity: [],
      activityTotal: 0,
      auditOperations: [],
      auditTotal: 0,
      accountStatus: 'ACTIVE',
      ledgerState: 'ACTIVE',
      openingBoundary: {
        date: '2026-10-01',
        timezone: 'Australia/Sydney',
        type: 'END_OF_DAY',
      },
      reviewedAsOfDate: '2026-10-31',
      checkedAt: '2026-11-08T00:00:00.000Z',
      sourceFreshness: {
        status: 'CURRENT',
        acceptedFingerprint: 'a'.repeat(64),
        currentFingerprint: 'a'.repeat(64),
      },
      cashCompleteness: 'COMPLETE',
      unsupportedEvents: [],
      sourceReviewIssues: [],
      evidence: [],
      evidenceStatus: 'NO_ATTESTATION',
      auditNumber: 1,
      sourceFingerprint: 'a'.repeat(64),
      replay: {
        accountId: 'account-1',
        openingDate: '2026-10-01',
        funded: true,
        balances: [],
        activity: [],
        fundingIssues: [],
      },
    },
    isLoading: false,
    isFetching: false,
    error: null,
    refetch: vi.fn(),
  }),
  useCorrectLiveCapitalOperation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
  useTradingAccounts: useTradingAccountsMock,
  useCreateAccount: () => ({
    mutateAsync: createAccountMock,
    isPending: false,
  }),
  useCloseAccount: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useDeleteAccount: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useReopenAccount: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useUpdateAccount: () => ({ mutateAsync: vi.fn(), isPending: false }),
  useCreatePortfolioSnapshot: () => ({ mutate: vi.fn(), isPending: false }),
  usePortfolioHistory: () => historyState,
  useUserPortfolio: () => portfolioState,
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/',
  useRouter: () => mockRouter,
  useSearchParams: () => mockSearchParams,
}));

vi.mock('react-chartjs-2', () => ({
  Line: () => <div data-testid='chart-stub' />,
}));

vi.mock('@/components/HoldingsTable', () => ({
  default: () => <div data-testid='holdings-table-stub' />,
}));

vi.mock('@/lib/privacy-context', () => ({
  usePrivacy: () => ({
    hidden: privacyState.hidden,
    toggle: vi.fn(),
    hide: vi.fn(),
    mask: (v: string) => (privacyState.hidden ? MASKED_VALUE : v),
  }),
}));

import DashboardView from './DashboardView';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  localStorage.clear();
  privacyState.hidden = false;
  historyState.data = [{ date: '2026-10-01', equity: 100 }];
  historyState.isError = false;
  historyState.isLoading = false;
  portfolioState.isError = false;
  portfolioState.isLoading = false;
  portfolioState.data = emptyPortfolio;
  useTradingAccountsMock.mockReturnValue({
    data: mockAccounts,
    isLoading: false,
  });
});

useTradingAccountsMock.mockReturnValue({
  data: mockAccounts,
  isLoading: false,
});

describe('DashboardView accounts', () => {
  it('opens reinvestment entry without enabling a legacy account', async () => {
    render(<DashboardView />);
    fireEvent.click(
      await screen.findByRole('button', {
        name: 'Record dividend reinvestment',
      })
    );
    expect(
      await screen.findByRole('dialog', {
        name: 'Record dividend reinvestment - Account 1',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Record linked reinvestment' })
    ).toBeDisabled();
    expect(
      screen.getByText(/This form never activates an account/)
    ).toBeInTheDocument();
  });
  it('opens manual FX entry but never enables a legacy account', async () => {
    render(<DashboardView />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Record FX conversion' })
    );
    expect(
      await screen.findByRole('dialog', {
        name: 'Record FX conversion - Account 1',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/This form never activates accounts/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Record linked FX conversion' })
    ).toBeDisabled();
  });
  it('opens paired transfer entry without activating either legacy account', async () => {
    render(<DashboardView />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Transfer cash' })
    );
    expect(
      await screen.findByRole('dialog', { name: 'Transfer cash - Account 1' })
    ).toBeInTheDocument();
    expect(screen.getByText(/No account is activated/)).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Record paired transfer' })
    ).toBeDisabled();
  });

  it('opens the read-only preview for the selected real account', async () => {
    render(<DashboardView />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Opening-balance preview' })
    );
    expect(
      await screen.findByRole('dialog', {
        name: 'Opening-balance preview - Account 1',
      })
    ).toBeInTheDocument();
    expect(openingPreviewMock).not.toHaveBeenCalled();
  });

  it('offers live cash review for the selected real account', async () => {
    render(<DashboardView />);
    expect(
      await screen.findByRole('button', { name: 'Live cash review' })
    ).toBeInTheDocument();
  });

  it('does not offer accounting setup for a demo account', async () => {
    useTradingAccountsMock.mockReturnValue({
      data: [{ id: 'demo', name: 'Practice', status: 'ACTIVE', isDemo: true }],
      isLoading: false,
    });
    render(<DashboardView />);
    expect(
      screen.queryByRole('button', { name: 'Opening-balance preview' })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Stock splits' })
    ).not.toBeInTheDocument();
  });

  it('opens the separate live cash form without presenting it as activation', async () => {
    render(<DashboardView />);
    fireEvent.click(
      await screen.findByRole('button', { name: 'Record ledger cash flow' })
    );
    expect(
      await screen.findByRole('dialog', {
        name: 'Record account cash - Account 1',
      })
    ).toBeInTheDocument();
    expect(
      screen.getByText(/does not activate the account or create a trade/)
    ).toBeInTheDocument();
    expect(capitalFlowMock).not.toHaveBeenCalled();
  });

  it('shows an account retry rather than a misleading welcome state on initial failure', () => {
    const refetch = vi.fn();
    useTradingAccountsMock.mockReturnValue({
      data: undefined,
      isError: true,
      isLoading: false,
      refetch,
    });
    render(<DashboardView />);
    expect(screen.queryByText('Welcome to Truffles')).not.toBeInTheDocument();
    expect(screen.getByText(/Could not load accounts/)).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Retry accounts' }));
    expect(refetch).toHaveBeenCalledOnce();
  });

  it('keeps loaded accounts visible during a failed background refresh', () => {
    useTradingAccountsMock.mockReturnValue({
      data: mockAccounts,
      isError: true,
      isLoading: false,
    });
    render(<DashboardView />);
    expect(screen.getByText('Account 1')).toBeInTheDocument();
    expect(screen.getByText(/Could not refresh accounts/)).toBeInTheDocument();
  });

  it('shows layout-matched placeholders while accounts load', () => {
    useTradingAccountsMock.mockReturnValue({ isLoading: true });
    render(<DashboardView />);
    expect(
      screen.getByRole('status', { name: 'Loading portfolio' })
    ).toHaveAttribute('aria-busy', 'true');
    expect(screen.queryByText('Welcome to Truffles')).not.toBeInTheDocument();
  });

  it('explains empty chart periods and preserves the timeframe controls', () => {
    historyState.data = [];
    render(<DashboardView />);
    expect(
      screen.getByText(/No equity points for this period/)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ALL' })).toBeInTheDocument();
  });

  it('keeps cached history visible on failure and exposes a scoped retry', () => {
    historyState.isError = true;
    render(<DashboardView />);
    expect(screen.getByTestId('chart-stub')).toBeInTheDocument();
    expect(
      screen.getByText(/Could not refresh equity history/)
    ).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Retry equity history' })
    );
    expect(historyState.refetch).toHaveBeenCalledOnce();
  });
  it('expands and collapses the existing chart without resetting its timeframe or hiding holdings', () => {
    render(<DashboardView />);
    const chart = screen.getByTestId('chart-stub');
    const container = chart.parentElement;
    const expand = screen.getByRole('button', { name: 'Expand chart' });
    expect(expand).toHaveAttribute('aria-expanded', 'false');
    expect(expand).toHaveAttribute('aria-controls', container?.id);
    expect(container).not.toHaveClass('portfolio-chart-expanded');
    fireEvent.click(screen.getByRole('button', { name: '3M' }));

    fireEvent.click(expand);
    expect(container).toHaveClass('portfolio-chart-expanded');
    const collapse = screen.getByRole('button', { name: 'Collapse chart' });
    expect(collapse).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByTestId('chart-stub')).toBe(chart);
    expect(screen.getByTestId('holdings-table-stub')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '3M' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );

    fireEvent.click(collapse);
    expect(container).not.toHaveClass('portfolio-chart-expanded');
    expect(
      screen.getByRole('button', { name: 'Expand chart' })
    ).toHaveAttribute('aria-expanded', 'false');
  });

  it('exposes the chart timeframe selection as a pressed button', () => {
    render(<DashboardView />);
    expect(
      screen.getByRole('heading', { name: 'Your portfolio' })
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'ALL' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    fireEvent.click(screen.getByRole('button', { name: '3M' }));
    expect(screen.getByRole('button', { name: '3M' })).toHaveAttribute(
      'aria-pressed',
      'true'
    );
    expect(screen.getByRole('button', { name: 'ALL' })).toHaveAttribute(
      'aria-pressed',
      'false'
    );
  });

  it('shows only the selected account in the bar, with a switcher and a single actions trigger', () => {
    render(<DashboardView />);

    expect(screen.getByText('Account 1')).toBeInTheDocument();
    expect(screen.queryByText('Account 2')).not.toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Switch account' })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Actions for account Account 1' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Rename account/ })
    ).not.toBeInTheDocument();
    expect(screen.queryByTitle('Close account')).not.toBeInTheDocument();
    expect(screen.queryByTitle('Delete account permanently')).not
      .toBeInTheDocument;
  });

  it('switches accounts via the dropdown', () => {
    render(<DashboardView />);

    fireEvent.click(screen.getByRole('button', { name: 'Switch account' }));
    fireEvent.click(screen.getByText('Account 2'));

    expect(
      screen.getByRole('button', { name: 'Actions for account Account 2' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Actions for account Account 1' })
    ).not.toBeInTheDocument();
  });

  it('opens the actions menu and triggers rename', () => {
    render(<DashboardView />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for account Account 1' })
    );
    fireEvent.click(screen.getByText('Rename'));

    expect(screen.getByText('Rename Account 1')).toBeInTheDocument();
  });

  it('opens the actions menu and triggers close confirmation', () => {
    render(<DashboardView />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for account Account 1' })
    );
    fireEvent.click(screen.getByText('Close'));

    expect(screen.getByText('Close Account 1?')).toBeInTheDocument();
  });

  it('opens the actions menu and triggers delete confirmation', () => {
    render(<DashboardView />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for account Account 1' })
    );
    fireEvent.click(screen.getByText('Delete permanently'));

    expect(
      screen.getByText('Delete Account 1 permanently?')
    ).toBeInTheDocument();
  });
});

describe('DashboardView empty state', () => {
  it('shows a welcome CTA and no accounts bar when there are zero accounts', () => {
    useTradingAccountsMock.mockReturnValue({ data: [], isLoading: false });

    render(<DashboardView />);

    expect(screen.getByText('Welcome to Truffles')).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Create your first account' })
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Actions for account/ })
    ).not.toBeInTheDocument();
  });

  it('opens the Add Account dialog from the empty-state CTA', () => {
    useTradingAccountsMock.mockReturnValue({ data: [], isLoading: false });

    render(<DashboardView />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Create your first account' })
    );

    expect(screen.getByText('Add Account')).toBeInTheDocument();
  });
});

describe('DashboardView demo accounts', () => {
  it('creates a real account by default (no isDemo flag)', async () => {
    useTradingAccountsMock.mockReturnValue({ data: [], isLoading: false });
    createAccountMock.mockResolvedValue({ id: 'new' });

    render(<DashboardView />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Create your first account' })
    );
    fireEvent.change(screen.getByPlaceholderText(/Account name/), {
      target: { value: 'Real' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() =>
      expect(createAccountMock).toHaveBeenCalledWith({ name: 'Real' })
    );
  });

  it('sends isDemo when the demo checkbox is ticked', async () => {
    useTradingAccountsMock.mockReturnValue({ data: [], isLoading: false });
    createAccountMock.mockResolvedValue({ id: 'new' });

    render(<DashboardView />);
    fireEvent.click(
      screen.getByRole('button', { name: 'Create your first account' })
    );
    fireEvent.change(screen.getByPlaceholderText(/Account name/), {
      target: { value: 'Practice' },
    });
    const demoCheckbox = screen.getByLabelText(
      /Demo account \(practice — excluded from tax/
    );
    expect(demoCheckbox.closest('.flex')).toHaveClass('pt-2');
    fireEvent.click(demoCheckbox);
    fireEvent.click(screen.getByRole('button', { name: 'Create Account' }));

    await waitFor(() =>
      expect(createAccountMock).toHaveBeenCalledWith({
        name: 'Practice',
        isDemo: true,
      })
    );
  });

  it('shows a Demo badge next to a selected demo account', () => {
    useTradingAccountsMock.mockReturnValue({
      data: [
        { id: 'demo-1', name: 'Practice', status: 'ACTIVE', isDemo: true },
      ],
      isLoading: false,
    });

    render(<DashboardView />);

    expect(screen.getAllByText('Demo').length).toBeGreaterThan(0);
  });

  it('does not offer the demo checkbox when renaming an account', () => {
    render(<DashboardView />);

    fireEvent.click(
      screen.getByRole('button', { name: 'Actions for account Account 1' })
    );
    fireEvent.click(screen.getByText('Rename'));

    expect(screen.queryByLabelText(/Demo account/)).not.toBeInTheDocument();
  });
});

describe('DashboardView privacy mode', () => {
  it('masks the equity/P&L summary cards when values are hidden', () => {
    privacyState.hidden = true;

    render(<DashboardView />);

    expect(screen.getAllByText(MASKED_VALUE).length).toBeGreaterThan(0);
    expect(screen.queryByText('$0')).not.toBeInTheDocument();
  });
});
