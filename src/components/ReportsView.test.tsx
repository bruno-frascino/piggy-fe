// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MASKED_VALUE } from '@/lib/format';

const {
  useTaxReportsMock,
  useTradingAccountsMock,
  useTaxReportDetailMock,
  useGenerateTaxReportMock,
  useDownloadTaxReportPdfMock,
  downloadTaxReportPdfMock,
  privacyState,
} = vi.hoisted(() => ({
  useTaxReportsMock: vi.fn(),
  useTradingAccountsMock: vi.fn(),
  useTaxReportDetailMock: vi.fn(),
  useGenerateTaxReportMock: vi.fn(),
  useDownloadTaxReportPdfMock: vi.fn(),
  downloadTaxReportPdfMock: vi.fn(),
  privacyState: { hidden: false },
}));

const STABLE_ACCOUNTS = [{ id: 'acc-1', name: 'My Portfolio' }];
const STABLE_REPORTS = [
  {
    id: 'r1',
    financialYearStartYear: 2025,
    financialYearLabel: 'FY2025-26',
    accountIds: ['acc-1'],
    version: 1,
    supersededAt: null,
    isCurrent: true,
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
  useDownloadTaxReportPdf: useDownloadTaxReportPdfMock,
}));

vi.mock('@/lib/toast-context', () => ({
  useToast: () => ({ show: vi.fn() }),
}));

vi.mock('@/lib/privacy-context', () => ({
  usePrivacy: () => ({
    hidden: privacyState.hidden,
    toggle: vi.fn(),
    hide: vi.fn(),
    mask: (v: string) => (privacyState.hidden ? MASKED_VALUE : v),
  }),
}));

import ReportsView from './ReportsView';

afterEach(() => {
  cleanup();
  privacyState.hidden = false;
});

beforeEach(() => {
  vi.clearAllMocks();
  useTradingAccountsMock.mockReturnValue({ data: STABLE_ACCOUNTS });
  useTaxReportDetailMock.mockReturnValue({ data: undefined, isLoading: false });
  useGenerateTaxReportMock.mockReturnValue({
    mutateAsync: vi.fn(),
    isPending: false,
  });
  useDownloadTaxReportPdfMock.mockReturnValue({
    mutateAsync: downloadTaxReportPdfMock,
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

  it('badges the revision number and superseded state, and toggles history', () => {
    const REVISIONS = [
      { ...STABLE_REPORTS[0], id: 'r2', version: 2 },
      {
        ...STABLE_REPORTS[0],
        id: 'r1',
        version: 1,
        isCurrent: false,
        supersededAt: '2026-08-01T00:00:00.000Z',
      },
    ];
    useTaxReportsMock.mockReturnValue({ data: REVISIONS, isLoading: false });

    render(<ReportsView />);

    expect(screen.getByText('v2')).toBeInTheDocument();
    expect(screen.getByText('Superseded')).toBeInTheDocument();

    fireEvent.click(
      screen.getByRole('button', { name: 'Show earlier revisions' })
    );

    expect(useTaxReportsMock).toHaveBeenLastCalledWith(true);
  });

  it('does not offer revision history when every report is v1', () => {
    useTaxReportsMock.mockReturnValue({
      data: STABLE_REPORTS,
      isLoading: false,
    });

    render(<ReportsView />);

    expect(
      screen.queryByRole('button', { name: 'Show earlier revisions' })
    ).not.toBeInTheDocument();
  });

  it('opens the generate dialog from the header action button', () => {
    useTaxReportsMock.mockReturnValue({
      data: STABLE_REPORTS,
      isLoading: false,
    });

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

describe('ReportsView privacy mode', () => {
  it('masks the net capital gain amount when values are hidden', () => {
    privacyState.hidden = true;
    useTaxReportsMock.mockReturnValue({
      data: STABLE_REPORTS,
      isLoading: false,
    });

    render(<ReportsView />);

    expect(screen.queryByText('$235.00')).not.toBeInTheDocument();
    expect(screen.getAllByText(MASKED_VALUE).length).toBeGreaterThan(0);
  });
});
