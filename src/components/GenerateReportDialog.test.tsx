// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useTradingAccountsMock,
  useGenerateTaxReportMock,
  mutateAsyncMock,
  showToastMock,
} = vi.hoisted(() => ({
  useTradingAccountsMock: vi.fn(),
  useGenerateTaxReportMock: vi.fn(),
  mutateAsyncMock: vi.fn(),
  showToastMock: vi.fn(),
}));

const STABLE_ACCOUNTS = [
  { id: 'acc-1', name: 'My Portfolio' },
  { id: 'acc-2', name: "Wife's Portfolio" },
];

vi.mock('@/hooks/api', () => ({
  useTradingAccounts: useTradingAccountsMock,
  useGenerateTaxReport: useGenerateTaxReportMock,
}));

vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ show: showToastMock }),
}));

import GenerateReportDialog from './GenerateReportDialog';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  useTradingAccountsMock.mockReturnValue({ data: STABLE_ACCOUNTS });
  useGenerateTaxReportMock.mockReturnValue({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  });
});

describe('GenerateReportDialog', () => {
  it('does not render when not visible', () => {
    render(<GenerateReportDialog visible={false} onHide={vi.fn()} />);
    expect(
      screen.queryByText('Generate Capital Gains Report')
    ).not.toBeInTheDocument();
  });

  it('shows a validation error when no accounts are selected', async () => {
    render(<GenerateReportDialog visible onHide={vi.fn()} />);

    fireEvent.click(screen.getByRole('button', { name: 'Generate' }));

    expect(
      await screen.findByText(
        'Select at least one account to include in this report.'
      )
    ).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();
  });

  it('lists only non-demo accounts and explains why demo ones are missing', () => {
    useTradingAccountsMock.mockReturnValue({
      data: [
        { id: 'acc-1', name: 'My Portfolio' },
        { id: 'demo-1', name: 'Practice', isDemo: true },
      ],
    });

    const { container } = render(
      <GenerateReportDialog visible onHide={vi.fn()} />
    );

    fireEvent.click(container.ownerDocument.querySelector('.p-multiselect')!);
    expect(screen.getByText('My Portfolio')).toBeInTheDocument();
    expect(screen.queryByText('Practice')).not.toBeInTheDocument();
    expect(
      screen.getByText('Demo accounts are excluded from tax reports.')
    ).toBeInTheDocument();
  });

  it('does not mention demo accounts when there are none', () => {
    render(<GenerateReportDialog visible onHide={vi.fn()} />);

    expect(
      screen.queryByText('Demo accounts are excluded from tax reports.')
    ).not.toBeInTheDocument();
  });

  it('renders the not-tax-advice disclaimer', () => {
    render(<GenerateReportDialog visible onHide={vi.fn()} />);

    expect(
      screen.getByText(/not professional tax advice/i)
    ).toBeInTheDocument();
  });
});
