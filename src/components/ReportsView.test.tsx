// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const {
  useTaxReportsMock,
  useTradingAccountsMock,
  useTaxReportDetailMock,
  useGenerateTaxReportMock,
  downloadTaxReportPdfMock,
} = vi.hoisted(() => ({
  useTaxReportsMock: vi.fn(),
  useTradingAccountsMock: vi.fn(),
  useTaxReportDetailMock: vi.fn(),
  useGenerateTaxReportMock: vi.fn(),
  downloadTaxReportPdfMock: vi.fn(),
}));

const STABLE_ACCOUNTS = [{ id: 'acc-1', name: 'My Portfolio' }];
const STABLE_REPORTS = [
  {
    id: 'r1',
    financialYearStartYear: 2025,
    financialYearLabel: 'FY2025-26',
    accountIds: ['acc-1'],
    generatedAt: '2026-07-24T00:00:00.000Z',
    totalProceedsAud: 1490,
    totalCostBaseAud: 1020,
    totalCapitalGainGrossAud: 470,
    totalCapitalLossAud: 0,
    carriedForwardLossOpeningAud: 0,
    discountAppliedAud: 235,
    netCapitalGainAud: 235,
    carriedForwardLossClosingAud: 0,
    pdfSizeBytes: 4096,
  },
];

vi.mock('@/hooks/api', () => ({
  useTaxReports: useTaxReportsMock,
  useTradingAccounts: useTradingAccountsMock,
  useTaxReportDetail: useTaxReportDetailMock,
  useGenerateTaxReport: useGenerateTaxReportMock,
}));

vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ show: vi.fn() }),
}));

vi.mock('@/lib/api-client', () => ({
  apiClient: {
    downloadTaxReportPdf: downloadTaxReportPdfMock,
  },
}));

import ReportsView from './ReportsView';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  vi.clearAllMocks();
  useTradingAccountsMock.mockReturnValue({ data: STABLE_ACCOUNTS });
  useTaxReportDetailMock.mockReturnValue({ data: undefined, isLoading: false });
  useGenerateTaxReportMock.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
});

describe('ReportsView', () => {
  it('shows the empty state and a CTA when there are no reports', () => {
    useTaxReportsMock.mockReturnValue({ data: [], isLoading: false });

    render(<ReportsView />);

    expect(
      screen.getByText('No tax reports generated yet.')
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Generate your first report' })
    ).toBeInTheDocument();
  });

  it('lists generated reports with FY label, account chips, and net gain', () => {
    useTaxReportsMock.mockReturnValue({
      data: STABLE_REPORTS,
      isLoading: false,
    });

    render(<ReportsView />);

    expect(screen.getByText('FY2025-26')).toBeInTheDocument();
    expect(screen.getByText('My Portfolio')).toBeInTheDocument();
    expect(screen.getByText('$235.00')).toBeInTheDocument();
  });

  it('opens the generate dialog from the header action button', () => {
    useTaxReportsMock.mockReturnValue({ data: [], isLoading: false });

    render(<ReportsView />);

    fireEvent.click(screen.getByRole('button', { name: 'Generate report' }));

    expect(
      screen.getByText('Generate Capital Gains Report')
    ).toBeInTheDocument();
  });

  it('downloads the PDF via a Blob URL when Download PDF is clicked', async () => {
    useTaxReportsMock.mockReturnValue({
      data: STABLE_REPORTS,
      isLoading: false,
    });
    downloadTaxReportPdfMock.mockResolvedValue(new Blob(['%PDF-fake']));
    const createObjectURL = vi.fn().mockReturnValue('blob:fake-url');
    const revokeObjectURL = vi.fn();
    vi.stubGlobal('URL', { ...URL, createObjectURL, revokeObjectURL });

    render(<ReportsView />);
    fireEvent.click(screen.getByRole('button', { name: 'Download PDF' }));

    await screen.findByRole('button', { name: 'Download PDF' });
    expect(downloadTaxReportPdfMock).toHaveBeenCalledWith('r1');
  });
});
