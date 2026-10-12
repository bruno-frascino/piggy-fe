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

const mockAccounts = [
  { id: 'acc-1', name: 'Account 1', status: 'ACTIVE' as const },
  { id: 'acc-2', name: 'Account 2', status: 'ACTIVE' as const },
];

const {
  mockRouter,
  mockSearchParams,
  emptyPortfolio,
  emptyHistory,
  useTradingAccountsMock,
  createAccountMock,
  privacyState,
} = vi.hoisted(() => ({
  mockRouter: { replace: vi.fn() },
  mockSearchParams: new URLSearchParams(),
  emptyPortfolio: [] as unknown[],
  emptyHistory: [] as unknown[],
  useTradingAccountsMock: vi.fn(),
  createAccountMock: vi.fn(),
  privacyState: { hidden: false },
}));

vi.mock('@/hooks/api', () => ({
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
  usePortfolioHistory: () => ({ data: emptyHistory, isFetched: true }),
  useUserPortfolio: () => ({
    data: emptyPortfolio,
    isLoading: false,
    isFetched: true,
  }),
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
    fireEvent.click(
      screen.getByLabelText(/Demo account \(practice — excluded from tax/)
    );
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
