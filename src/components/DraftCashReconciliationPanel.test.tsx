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
import type {
  DraftCashEvidencePreview,
  DraftOpeningReconciliation,
} from '@/lib/types';

const mocks = vi.hoisted(() => ({
  report: {
    data: null as DraftOpeningReconciliation | null,
    isLoading: false,
    isError: false,
    error: null as unknown,
    refetch: vi.fn(),
  },
  preview: vi.fn(),
  record: vi.fn(),
  operation: vi.fn(),
  importedOperation: vi.fn(),
  manualOperation: vi.fn(),
  correction: vi.fn(),
  importedCorrection: vi.fn(),
  saleCorrection: vi.fn(),
  acquisitionCorrection: vi.fn(),
  online: true,
}));

vi.mock('@/hooks/api', () => ({
  useDraftOpeningReconciliation: () => mocks.report,
  usePreviewDraftCashEvidence: () => ({
    mutateAsync: mocks.preview,
    isPending: false,
  }),
  useRecordDraftCashEvidence: () => ({
    mutateAsync: mocks.record,
    isPending: false,
  }),
  useSaveDraftReconciliationCashOperation: () => ({
    mutateAsync: mocks.operation,
    isPending: false,
  }),
  useStageDraftImportedExecutionCash: () => ({
    mutateAsync: mocks.importedOperation,
    isPending: false,
  }),
  useStageDraftManualExecutionCash: () => ({
    mutateAsync: mocks.manualOperation,
    isPending: false,
  }),
  useCorrectDraftReconciliationCashOperation: () => ({
    mutateAsync: mocks.correction,
    isPending: false,
  }),
  useCorrectDraftImportedExecutionCash: () => ({
    mutateAsync: mocks.importedCorrection,
    isPending: false,
  }),
  useCorrectDraftRecordedSale: () => ({
    mutateAsync: mocks.saleCorrection,
    isPending: false,
  }),
  useCorrectDraftRecordedAcquisition: () => ({
    mutateAsync: mocks.acquisitionCorrection,
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
    onChange: (event: { value: Date | null }) => void;
  }) => (
    <input
      id={inputId}
      type='date'
      value={value ? value.toISOString().slice(0, 10) : ''}
      onChange={event =>
        onChange({
          value: event.target.value
            ? new Date(`${event.target.value}T00:00:00`)
            : null,
        })
      }
    />
  ),
}));

vi.mock('primereact/checkbox', () => ({
  Checkbox: ({
    inputId,
    checked,
    onChange,
  }: {
    inputId: string;
    checked: boolean;
    onChange: (event: { checked: boolean }) => void;
  }) => (
    <input
      id={inputId}
      type='checkbox'
      checked={checked}
      onChange={event => onChange({ checked: event.target.checked })}
    />
  ),
}));

vi.mock('primereact/dropdown', () => ({
  Dropdown: ({
    inputId,
    value,
    options,
    optionLabel,
    optionValue,
    onChange,
  }: {
    inputId: string;
    value: string;
    options: Record<string, string>[];
    optionLabel: string;
    optionValue: string;
    onChange: (event: { value: string }) => void;
  }) => (
    <select
      id={inputId}
      value={value}
      onChange={event => onChange({ value: event.target.value })}
    >
      <option value=''>Choose</option>
      {options.map(option => (
        <option key={option[optionValue]} value={option[optionValue]}>
          {option[optionLabel]}
        </option>
      ))}
    </select>
  ),
}));

import DraftCashReconciliationPanel from './DraftCashReconciliationPanel';

const report: DraftOpeningReconciliation = {
  mode: 'RECONCILIATION_ONLY',
  state: 'DRAFT',
  accountingActive: false,
  activationReady: false,
  statementId: 's1',
  accountId: 'a1',
  openingDate: '2026-10-01',
  asOfDate: '2026-10-31',
  source: {
    reviewedAsOfDate: '2026-10-31',
    savedFingerprint: 'saved',
    currentFingerprint: 'current',
    acceptedFingerprint: 'current',
    correctionCount: 0,
    changed: false,
  },
  cash: {
    accountId: 'a1',
    openingDate: '2026-10-01',
    funded: true,
    verification: 'UNVERIFIED',
    balances: [
      {
        currency: 'AUD',
        openingAmount: '1000',
        endingAmount: '900',
        minimumAmount: '900',
        netExternalContribution: '0',
      },
    ],
    activity: [
      {
        idempotencyKey: 'deposit-1',
        effectiveDate: '2026-10-10',
        sequence: 1,
        kind: 'DEPOSIT',
        changes: [{ currency: 'AUD', amount: '50', balanceAfter: '900' }],
      },
    ],
    fundingIssues: [],
  },
  cashOperations: [
    {
      operationId: 'op1',
      currentRevisionId: 'op1',
      idempotencyKey: 'deposit-1',
      kind: 'DEPOSIT',
      effectiveDate: '2026-10-10',
      sequence: 1,
      sourceOrigin: 'MANUAL',
      sourceReference: 'Bank transfer 1',
      cash: { currency: 'AUD', amount: '50' },
      revisions: [],
      status: 'EFFECTIVE',
    },
  ],
  cashManualExecutions: [],
  cashImportExecutions: [
    {
      eventId: 'event-1',
      batchId: 'batch-1',
      externalId: 'KRAKEN:order:1',
      kind: 'BUY',
      occurredAt: '2026-10-12T00:00:00.000Z',
      effectiveDate: '2026-10-12',
      quoteCurrency: 'AUD',
      grossValue: '50',
      fee: '1',
      feeCurrency: 'AUD',
      transactionIds: ['t-import-1'],
      positionIds: ['p-import-1'],
      stageable: true,
      reason: null,
      operationId: null,
    },
  ],
  cashEvidence: [],
  inventory: [
    {
      positionId: 'p1',
      openingParcelKey: null,
      openingQuantity: null,
      liveOpeningQuantity: '10',
      openingDifference: null,
      proposedRemaining: null,
      liveExpectedRemaining: '10',
      liveRecordedRemaining: '9',
      scenarioDifference: null,
    },
  ],
  proposedParcels: [],
  tradeSources: [
    {
      transactionId: 't1',
      positionId: 'p1',
      kind: 'SELL',
      effectiveDate: '2026-10-12',
      quantity: '1',
      operationId: null,
      linkage: 'UNLINKED',
      potentialOverlapOperationIds: ['op1'],
    },
  ],
  excludedLinkedSources: [],
  previewIssues: [
    {
      code: 'FUNDING_GAP',
      severity: 'BLOCKING',
      message: 'A funding record is missing.',
      sourceId: 't1',
    },
  ],
  reviewReasons: [],
};

const previewResult: DraftCashEvidencePreview = {
  asOfDate: '2026-10-31',
  replay: report.cash,
  comparison: {
    matchesReplay: false,
    variances: [
      {
        currency: 'AUD',
        expectedAmount: '900',
        statementAmount: '850',
        difference: '-50',
      },
    ],
    decisions: [],
  },
};

function setup(hidden = false) {
  render(
    <PrivacyProvider initialHidden={hidden}>
      <DraftCashReconciliationPanel
        accountId='a1'
        statementId='s1'
        onClose={vi.fn()}
      />
    </PrivacyProvider>
  );
}

beforeEach(() => {
  vi.clearAllMocks();
  mocks.online = true;
  mocks.report.data = report;
  mocks.report.isLoading = false;
  mocks.report.isError = false;
  mocks.report.error = null;
  mocks.preview.mockResolvedValue(previewResult);
  mocks.record.mockResolvedValue({
    evidenceId: 'e1',
    created: true,
    replay: report.cash,
    comparison: previewResult.comparison,
  });
  mocks.operation.mockResolvedValue({
    operationId: 'op1',
    created: true,
    replay: report.cash,
  });
  mocks.importedOperation.mockResolvedValue({
    operationId: 'op-import',
    state: 'DRAFT',
    created: true,
    replay: report.cash,
  });
  mocks.correction.mockResolvedValue({
    operationId: 'op1',
    revisionId: 'rev1',
    state: 'DRAFT',
    created: true,
    replay: report.cash,
  });
  mocks.importedCorrection.mockResolvedValue({
    operationId: 'op-import',
    revisionId: 'rev-import',
    state: 'DRAFT',
    created: true,
    replay: report.cash,
  });
});

afterEach(cleanup);

describe('DraftCashReconciliationPanel', () => {
  const manualExecution = {
    transactionId: 'manual-1',
    positionId: 'p1',
    kind: 'BUY',
    effectiveDate: '2026-10-02',
    currency: 'AUD',
    grossValue: '60',
    fee: '1',
    price: '60',
    quantity: '1',
    occurredAt: '2026-10-02T00:00:00.000Z',
    stageable: true,
    reason: null,
    operationId: null,
  };
  const saleOperation: DraftOpeningReconciliation['cashOperations'][number] = {
    ...report.cashOperations[0],
    kind: 'SELL',
    effectiveDate: '2026-10-03',
    sourceReference: 'manual-transaction:sale-1',
    cash: null,
  };
  const saleReport: DraftOpeningReconciliation = {
    ...report,
    source: {
      ...report.source,
      currentFingerprint: 'a'.repeat(64),
      acceptedFingerprint: 'a'.repeat(64),
    },
    cashOperations: [saleOperation],
    cashManualExecutions: [
      {
        ...manualExecution,
        kind: 'SELL',
        transactionId: 'sale-1',
        operationId: 'op1',
        stageable: false,
        reason: 'ALREADY_LINKED',
        effectiveDate: '2026-10-03',
        price: '80',
        grossValue: '40',
      },
    ],
  };
  const openSaleCorrection = () =>
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Correct recorded sale manual-transaction:sale-1',
      })
    );
  const purchaseReport: DraftOpeningReconciliation = {
    ...saleReport,
    cashOperations: [
      {
        ...saleOperation,
        kind: 'BUY',
        sourceReference: 'manual-transaction:manual-1',
        effectiveDate: '2026-10-02',
      },
    ],
    cashManualExecutions: [
      {
        ...manualExecution,
        operationId: 'op1',
        stageable: false,
        reason: 'ALREADY_LINKED',
      },
    ],
  };
  it('corrects purchase quantity and cost basis with explicit acknowledgement and retained retry identity', async () => {
    mocks.report.data = purchaseReport;
    mocks.acquisitionCorrection
      .mockRejectedValueOnce(new Error('Funding deficit'))
      .mockResolvedValueOnce({ state: 'DRAFT' });
    setup(true);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Correct recorded acquisition manual-transaction:manual-1',
      })
    );
    expect(
      screen.getByText(/cost basis and realized gains/)
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Corrected acquisition quantity')).toHaveValue(
      '1'
    );
    expect(
      screen.getByLabelText('Corrected acquisition quantity')
    ).toHaveAttribute('type', 'password');
    fireEvent.change(screen.getByLabelText('Corrected acquisition quantity'), {
      target: { value: '1.25' },
    });
    fireEvent.change(
      screen.getByLabelText('Acquisition correction audit reason'),
      {
        target: { value: 'Correct purchase from statement' },
      }
    );
    fireEvent.click(
      screen.getByLabelText(
        'I reviewed the live acquisition change and retained audit history.'
      )
    );
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Save acquisition and cash correction',
      })
    );
    await screen.findByText('Funding deficit');
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Save acquisition and cash correction',
      })
    );
    await screen.findByText(
      /Live acquisition and draft cash corrected atomically/
    );
    expect(mocks.acquisitionCorrection.mock.calls[0][0]).toEqual(
      mocks.acquisitionCorrection.mock.calls[1][0]
    );
    expect(mocks.acquisitionCorrection.mock.calls[0][0]).toMatchObject({
      accountId: 'a1',
      statementId: 's1',
      operationId: 'op1',
      input: {
        quantity: '1.25',
        price: '60',
        fees: '1',
        effectiveDate: '2026-10-02',
        expectedSourceFingerprint: 'a'.repeat(64),
        expectedRevisionId: 'op1',
      },
    });
    expect(mocks.saleCorrection).not.toHaveBeenCalled();
  });
  it('rejects empty or zero acquisition quantity and clears review when quantity changes', async () => {
    mocks.report.data = purchaseReport;
    setup();
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Correct recorded acquisition manual-transaction:manual-1',
      })
    );
    fireEvent.change(screen.getByLabelText('Corrected acquisition quantity'), {
      target: { value: '0' },
    });
    fireEvent.change(
      screen.getByLabelText('Acquisition correction audit reason'),
      { target: { value: 'Review quantity' } }
    );
    const checkbox = screen.getByLabelText(
      'I reviewed the live acquisition change and retained audit history.'
    );
    fireEvent.click(checkbox);
    fireEvent.click(
      screen.getByRole('button', {
        name: 'Save acquisition and cash correction',
      })
    );
    await screen.findByText(/Review the correction/);
    expect(mocks.acquisitionCorrection).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Corrected acquisition quantity'), {
      target: { value: '1.5' },
    });
    expect(checkbox).not.toBeChecked();
    expect(
      screen.getByRole('button', {
        name: 'Save acquisition and cash correction',
      })
    ).toBeDisabled();
    fireEvent.click(
      screen.getByRole('button', { name: 'Cancel acquisition correction' })
    );
    expect(
      screen.queryByLabelText('Corrected acquisition quantity')
    ).not.toBeInTheDocument();
  });
  const reviewSale = () => {
    fireEvent.change(screen.getByLabelText('Sale correction audit reason'), {
      target: { value: 'Correct transcription from statement' },
    });
    fireEvent.click(
      screen.getByLabelText(
        'I reviewed the live sale change and retained audit history.'
      )
    );
  };
  it('corrects a live manual sale with exact strings and a retained retry identity, not a cash-only adjustment', async () => {
    mocks.report.data = saleReport;
    mocks.saleCorrection
      .mockRejectedValueOnce(new Error('Connection interrupted'))
      .mockResolvedValueOnce({ state: 'DRAFT' });
    setup(true);
    openSaleCorrection();
    expect(screen.getByText(/This changes the LIVE sale/)).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Correction action')
    ).not.toBeInTheDocument();
    expect(screen.getByLabelText('Corrected sale price (AUD)')).toHaveAttribute(
      'type',
      'password'
    );
    expect(screen.getByLabelText('Corrected sale fees (AUD)')).toHaveAttribute(
      'type',
      'password'
    );
    fireEvent.change(screen.getByLabelText('Corrected sale price (AUD)'), {
      target: { value: '100.123456789012' },
    });
    fireEvent.change(screen.getByLabelText('Corrected sale fees (AUD)'), {
      target: { value: '1.12345678' },
    });
    reviewSale();
    fireEvent.click(
      screen.getByRole('button', { name: 'Save sale and cash correction' })
    );
    await screen.findByText('Connection interrupted');
    fireEvent.click(
      screen.getByRole('button', { name: 'Save sale and cash correction' })
    );
    await screen.findByText(/Live sale and draft cash corrected atomically/);
    expect(mocks.saleCorrection.mock.calls[0][0]).toEqual(
      mocks.saleCorrection.mock.calls[1][0]
    );
    expect(mocks.saleCorrection.mock.calls[0][0]).toMatchObject({
      accountId: 'a1',
      statementId: 's1',
      operationId: 'op1',
      input: {
        expectedRevisionId: 'op1',
        expectedSourceFingerprint: 'a'.repeat(64),
        effectiveDate: '2026-10-03',
        sequence: 1,
        price: '100.123456789012',
        fees: '1.12345678',
        reason: 'Correct transcription from statement',
      },
    });
  });
  it('resets the acknowledgement and retry key on edits, rejects invalid input, and disables a stale sale editor', async () => {
    mocks.report.data = saleReport;
    mocks.saleCorrection.mockRejectedValue(new Error('Connection interrupted'));
    const view = render(
      <PrivacyProvider initialHidden={false}>
        <DraftCashReconciliationPanel
          accountId='a1'
          statementId='s1'
          onClose={vi.fn()}
        />
      </PrivacyProvider>
    );
    openSaleCorrection();
    fireEvent.change(screen.getByLabelText('Corrected sale price (AUD)'), {
      target: { value: '0' },
    });
    reviewSale();
    fireEvent.click(
      screen.getByRole('button', { name: 'Save sale and cash correction' })
    );
    await screen.findByText(/Review the correction and enter/);
    expect(mocks.saleCorrection).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Corrected sale price (AUD)'), {
      target: { value: '90' },
    });
    expect(
      screen.getByLabelText(
        'I reviewed the live sale change and retained audit history.'
      )
    ).not.toBeChecked();
    fireEvent.click(
      screen.getByLabelText(
        'I reviewed the live sale change and retained audit history.'
      )
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Save sale and cash correction' })
    );
    await screen.findByText('Connection interrupted');
    const first = mocks.saleCorrection.mock.calls[0][0].input.idempotencyKey;
    fireEvent.change(screen.getByLabelText('Corrected sale sequence'), {
      target: { value: '2' },
    });
    fireEvent.click(
      screen.getByLabelText(
        'I reviewed the live sale change and retained audit history.'
      )
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Save sale and cash correction' })
    );
    await waitFor(() => expect(mocks.saleCorrection).toHaveBeenCalledTimes(2));
    expect(mocks.saleCorrection.mock.calls[1][0].input.idempotencyKey).not.toBe(
      first
    );
    mocks.report.data = {
      ...saleReport,
      source: { ...saleReport.source, currentFingerprint: 'b'.repeat(64) },
    };
    view.rerender(
      <PrivacyProvider initialHidden={false}>
        <DraftCashReconciliationPanel
          accountId='a1'
          statementId='s1'
          onClose={vi.fn()}
        />
      </PrivacyProvider>
    );
    expect(
      screen.getByRole('button', { name: 'Save sale and cash correction' })
    ).toBeDisabled();
    expect(screen.getByLabelText('Corrected sale price (AUD)')).toBeDisabled();
    expect(
      screen.getByText(/Cancel and reopen from the refreshed report/)
    ).toBeInTheDocument();
  });
  it('disables live sale correction offline', () => {
    mocks.online = false;
    mocks.report.data = saleReport;
    setup();
    expect(
      screen.getByRole('button', {
        name: 'Correct recorded sale manual-transaction:sale-1',
      })
    ).toBeDisabled();
  });
  it.each([
    { sourceOrigin: 'IMPORT', status: 'EFFECTIVE' },
    { sourceOrigin: 'MANUAL', status: 'REVERSED' },
  ] as const)(
    'does not offer live sale correction for $sourceOrigin/$status operations',
    fields => {
      mocks.report.data = {
        ...saleReport,
        cashOperations: [{ ...saleOperation, ...fields }],
      };
      setup();
      expect(
        screen.queryByRole('button', {
          name: 'Correct recorded sale manual-transaction:sale-1',
        })
      ).not.toBeInTheDocument();
    }
  );
  it('requires an explicit manual sequence and stages only the persisted transaction identity', async () => {
    mocks.report.data = { ...report, cashManualExecutions: [manualExecution] };
    mocks.manualOperation.mockResolvedValue({ state: 'DRAFT' });
    setup();
    const button = screen.getByRole('button', {
      name: 'Stage manual cash manual-1',
    });
    expect(button).toBeDisabled();
    fireEvent.change(
      screen.getByLabelText('Stable sequence for manual transaction manual-1'),
      { target: { value: '3' } }
    );
    fireEvent.click(button);
    await waitFor(() =>
      expect(mocks.manualOperation).toHaveBeenCalledWith({
        accountId: 'a1',
        statementId: 's1',
        transactionId: 'manual-1',
        input: { sequence: 3 },
      })
    );
    expect(
      await screen.findByText(
        /Manual execution cash staged from its persisted transaction/
      )
    ).toBeInTheDocument();
  });
  it('shows manual staging conflicts without hiding the entry or changing its retry sequence', async () => {
    mocks.report.data = { ...report, cashManualExecutions: [manualExecution] };
    mocks.manualOperation.mockRejectedValueOnce(
      new Error('Opening source changed')
    );
    setup();
    fireEvent.change(
      screen.getByLabelText('Stable sequence for manual transaction manual-1'),
      { target: { value: '2' } }
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Stage manual cash manual-1' })
    );
    expect(
      await screen.findByText('Opening source changed')
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Stable sequence for manual transaction manual-1')
    ).toHaveValue('2');
  });
  it('disables manual staging offline and shows reserved transaction identities as unavailable', () => {
    mocks.online = false;
    mocks.report.data = {
      ...report,
      cashManualExecutions: [
        manualExecution,
        {
          ...manualExecution,
          transactionId: 'reserved-1',
          stageable: false,
          reason: 'ALREADY_LINKED',
          operationId: 'cash-original',
        },
      ],
    };
    setup();
    expect(
      screen.getByRole('button', { name: 'Stage manual cash manual-1' })
    ).toBeDisabled();
    expect(
      screen.getByLabelText('Stable sequence for manual transaction manual-1')
    ).toBeDisabled();
    expect(
      screen.queryByRole('button', { name: 'Stage manual cash reserved-1' })
    ).not.toBeInTheDocument();
    expect(
      screen.getByText('ALREADY LINKED · cash-original')
    ).toBeInTheDocument();
  });
  it('only exposes sequence and audit inputs for imported execution corrections and retains retry identity', async () => {
    mocks.report.data = {
      ...report,
      cashOperations: [
        {
          ...report.cashOperations[0],
          operationId: 'op-import',
          currentRevisionId: 'op-import',
          kind: 'BUY',
          sourceOrigin: 'IMPORT',
          sourceReference: 'KRAKEN:order:1',
          cash: null,
        },
      ],
    };
    mocks.importedCorrection.mockRejectedValueOnce(
      new Error('Connection interrupted')
    );
    setup();
    fireEvent.click(
      screen.getByRole('button', { name: 'Correct sequence KRAKEN:order:1' })
    );
    expect(
      screen.getByText('Correct imported execution sequence')
    ).toBeInTheDocument();
    expect(
      screen.queryByLabelText('Correction action')
    ).not.toBeInTheDocument();
    expect(
      screen.queryByLabelText('Corrected effective date')
    ).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Corrected amount/)).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Corrected stable sequence'), {
      target: { value: '0' },
    });
    fireEvent.change(screen.getByLabelText('Correction audit reason'), {
      target: { value: 'Broker order confirmed' },
    });
    fireEvent.click(screen.getByLabelText(/I reviewed this correction/));
    fireEvent.click(
      screen.getByRole('button', { name: 'Save audited correction' })
    );
    await screen.findByText(/positive safe integer sequence/);
    expect(mocks.importedCorrection).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Corrected stable sequence'), {
      target: { value: '3' },
    });
    fireEvent.click(screen.getByLabelText(/I reviewed this correction/));
    fireEvent.click(
      screen.getByRole('button', { name: 'Save audited correction' })
    );
    await screen.findByText('Connection interrupted');
    fireEvent.click(
      screen.getByRole('button', { name: 'Save audited correction' })
    );
    await screen.findByText(/Audited correction saved/);
    expect(mocks.importedCorrection.mock.calls[0][0]).toEqual(
      mocks.importedCorrection.mock.calls[1][0]
    );
    expect(mocks.importedCorrection).toHaveBeenLastCalledWith({
      accountId: 'a1',
      statementId: 's1',
      operationId: 'op-import',
      input: {
        idempotencyKey: expect.any(String),
        expectedRevisionId: 'op-import',
        reason: 'Broker order confirmed',
        sequence: 3,
      },
    });
    expect(mocks.correction).not.toHaveBeenCalled();
  });

  it('surfaces funding errors and requires a fresh review after changing a failed correction', async () => {
    mocks.correction.mockRejectedValueOnce({
      response: {
        status: 422,
        data: {
          message: 'Correction would leave insufficient cash on 12/10/2026',
        },
      },
    });
    setup();
    fireEvent.click(
      screen.getByRole('button', { name: 'Correct Bank transfer 1' })
    );
    fireEvent.change(screen.getByLabelText('Corrected amount (AUD)'), {
      target: { value: '0' },
    });
    fireEvent.change(screen.getByLabelText('Correction audit reason'), {
      target: { value: 'Fix amount' },
    });
    fireEvent.click(screen.getByLabelText(/I reviewed this correction/));
    fireEvent.click(
      screen.getByRole('button', { name: 'Save audited correction' })
    );
    expect(
      await screen.findByText(/positive decimal amount/)
    ).toBeInTheDocument();
    expect(mocks.correction).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('Corrected amount (AUD)'), {
      target: { value: '1' },
    });
    expect(
      screen.getByRole('button', { name: 'Save audited correction' })
    ).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/I reviewed this correction/));
    fireEvent.click(
      screen.getByRole('button', { name: 'Save audited correction' })
    );
    expect(
      await screen.findByText(/Correction would leave insufficient cash/)
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Corrected amount (AUD)')).toHaveValue('1');
  });

  it('blocks submission if refreshed report shows a newer revision while the editor is open', () => {
    const renderPanel = () => (
      <PrivacyProvider initialHidden={false}>
        <DraftCashReconciliationPanel
          accountId='a1'
          statementId='s1'
          onClose={vi.fn()}
        />
      </PrivacyProvider>
    );
    const { rerender } = render(renderPanel());
    fireEvent.click(
      screen.getByRole('button', { name: 'Correct Bank transfer 1' })
    );
    mocks.report.data = {
      ...report,
      cashOperations: [
        { ...report.cashOperations[0], currentRevisionId: 'newer-revision' },
      ],
    };
    rerender(renderPanel());
    expect(
      screen.getByText(/Cancel and reopen the correction/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: 'Save audited correction' })
    ).toBeDisabled();
    expect(screen.getByLabelText('Corrected amount (AUD)')).toBeDisabled();
    expect(mocks.correction).not.toHaveBeenCalled();
  });

  it('reviews a capital replacement with the expected revision, audit reason and retained currency', async () => {
    setup();
    fireEvent.click(
      screen.getByRole('button', { name: 'Correct Bank transfer 1' })
    );
    fireEvent.change(screen.getByLabelText('Corrected amount (AUD)'), {
      target: { value: '40.25' },
    });
    fireEvent.change(screen.getByLabelText('Correction audit reason'), {
      target: { value: 'Correct statement amount' },
    });
    const save = screen.getByRole('button', {
      name: 'Save audited correction',
    });
    expect(save).toBeDisabled();
    fireEvent.click(screen.getByLabelText(/I reviewed this correction/));
    fireEvent.click(save);
    await screen.findByText(/Audited correction saved in the inactive draft/);
    expect(mocks.correction).toHaveBeenCalledWith({
      accountId: 'a1',
      statementId: 's1',
      operationId: 'op1',
      input: {
        idempotencyKey: expect.any(String),
        expectedRevisionId: 'op1',
        reason: 'Correct statement amount',
        replacement: {
          effectiveDate: '2026-10-10',
          sequence: 1,
          amount: '40.25',
        },
      },
    });
    expect(
      screen.queryByRole('region', { name: 'Correct inactive cash operation' })
    ).not.toBeInTheDocument();
  });

  it('retains the retry identity after an uncertain failure and sends an explicit terminal reversal', async () => {
    mocks.correction.mockRejectedValueOnce(new Error('Connection interrupted'));
    setup();
    fireEvent.click(
      screen.getByRole('button', { name: 'Correct Bank transfer 1' })
    );
    fireEvent.change(screen.getByLabelText('Correction action'), {
      target: { value: 'REVERSE' },
    });
    expect(
      screen.queryByLabelText('Corrected amount (AUD)')
    ).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText('Correction audit reason'), {
      target: { value: 'Duplicate entry' },
    });
    fireEvent.click(screen.getByLabelText(/I reviewed this correction/));
    fireEvent.click(
      screen.getByRole('button', { name: 'Save audited correction' })
    );
    await screen.findByText('Connection interrupted');
    fireEvent.click(
      screen.getByRole('button', { name: 'Save audited correction' })
    );
    await screen.findByText(/Audited correction saved/);
    expect(mocks.correction.mock.calls[0][0]).toEqual(
      mocks.correction.mock.calls[1][0]
    );
    expect(mocks.correction.mock.calls[0][0].input.replacement).toBeNull();
  });

  it('shows correction audit reasons and does not permit correction of reversed entries', () => {
    mocks.report.data = {
      ...report,
      cashOperations: [
        {
          ...report.cashOperations[0],
          status: 'REVERSED',
          currentRevisionId: 'rev1',
          revisions: [
            {
              revisionId: 'rev1',
              reason: 'Duplicate bank entry',
              replacement: false,
              executionAudit: null,
            },
          ],
        },
      ],
    };
    setup();
    expect(
      screen.getByText('Reversal: Duplicate bank entry')
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Correct Bank transfer 1' })
    ).not.toBeInTheDocument();
  });

  it('disables correction while offline and hides a selected correction after switching account', () => {
    mocks.online = false;
    const { rerender } = render(
      <PrivacyProvider initialHidden={false}>
        <DraftCashReconciliationPanel
          accountId='a1'
          statementId='s1'
          onClose={vi.fn()}
        />
      </PrivacyProvider>
    );
    expect(
      screen.getByRole('button', { name: 'Correct Bank transfer 1' })
    ).toBeDisabled();
    mocks.online = true;
    rerender(
      <PrivacyProvider initialHidden={false}>
        <DraftCashReconciliationPanel
          accountId='a1'
          statementId='s1'
          onClose={vi.fn()}
        />
      </PrivacyProvider>
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Correct Bank transfer 1' })
    );
    expect(
      screen.getByRole('region', { name: 'Correct inactive cash operation' })
    ).toBeInTheDocument();
    rerender(
      <PrivacyProvider initialHidden={false}>
        <DraftCashReconciliationPanel
          accountId='a2'
          statementId='s2'
          onClose={vi.fn()}
        />
      </PrivacyProvider>
    );
    expect(
      screen.queryByRole('region', { name: 'Correct inactive cash operation' })
    ).not.toBeInTheDocument();
    expect(mocks.correction).not.toHaveBeenCalled();
  });
  it('keeps the report explicitly unverified and surfaces source, inventory, and trade issues', () => {
    setup();
    expect(
      screen.getByText(
        /Cash evidence is user-attested, not externally verified/
      )
    ).toBeInTheDocument();
    expect(screen.getByText(/UNLINKED/)).toBeInTheDocument();
    expect(screen.getByText(/possible overlap with op1/)).toBeInTheDocument();
    expect(screen.getByText(/FUNDING_GAP/)).toBeInTheDocument();
    expect(screen.getByText('MANUAL · Bank transfer 1')).toBeInTheDocument();
    expect(screen.getAllByText('Not comparable')).toHaveLength(2);
    expect(
      screen.queryByRole('button', { name: /activate|confirm/i })
    ).not.toBeInTheDocument();
  });

  it('previews exact differences, requires a reason and note, then records attested evidence', async () => {
    setup();
    fireEvent.change(screen.getByLabelText('Statement date'), {
      target: { value: '2026-10-31' },
    });
    fireEvent.change(screen.getByLabelText('Statement source'), {
      target: { value: 'Broker statement' },
    });
    fireEvent.change(screen.getByLabelText('Statement reference'), {
      target: { value: 'October PDF page 1' },
    });
    fireEvent.change(screen.getByLabelText('AUD statement balance'), {
      target: { value: '850' },
    });
    fireEvent.click(screen.getByLabelText(/I attest these balances/));
    fireEvent.click(
      screen.getByRole('button', { name: 'Preview exact variances' })
    );

    await screen.findByText(/difference -50/);
    const record = screen.getByRole('button', {
      name: 'Record immutable evidence',
    });
    expect(record).toBeDisabled();
    fireEvent.change(screen.getByLabelText('Review reason'), {
      target: { value: 'TIMING_DIFFERENCE' },
    });
    fireEvent.change(screen.getByLabelText('Review note'), {
      target: { value: 'Broker posted the transfer the following day.' },
    });
    expect(record).toBeEnabled();
    fireEvent.click(record);

    await screen.findByText(
      /variance remains unresolved until dated replay matches/i
    );
    const previewInput = mocks.preview.mock.calls[0][0].input;
    const recordInput = mocks.record.mock.calls[0][0].input;
    expect(previewInput).toMatchObject({
      asOfDate: '2026-10-31',
      source: 'Broker statement',
      reference: 'October PDF page 1',
      attested: true,
      cashBalances: [{ currency: 'AUD', amount: '850' }],
      decisions: [],
    });
    expect(recordInput).toMatchObject({
      ...previewInput,
      decisions: [
        {
          currency: 'AUD',
          reason: 'TIMING_DIFFERENCE',
          note: 'Broker posted the transfer the following day.',
        },
      ],
    });
    expect(recordInput.idempotencyKey).toBe(previewInput.idempotencyKey);
  });

  it('stages only an explicitly dated and sourced deposit or withdrawal', async () => {
    setup();
    fireEvent.change(screen.getByLabelText('Effective date'), {
      target: { value: '2026-10-12' },
    });
    fireEvent.change(screen.getByLabelText('Stable sequence for this date'), {
      target: { value: '2' },
    });
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '50.25' },
    });
    fireEvent.change(screen.getByLabelText('Actual source reference'), {
      target: { value: 'Bank transfer 123' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Stage dated operation' })
    );

    await screen.findByText(/Dated operation staged in the inactive draft/);
    expect(mocks.operation).toHaveBeenCalledWith(
      expect.objectContaining({
        accountId: 'a1',
        statementId: 's1',
        input: expect.objectContaining({
          effectiveDate: '2026-10-12',
          sequence: 2,
          kind: 'DEPOSIT',
          currency: 'AUD',
          amount: '50.25',
          sourceReference: 'Bank transfer 123',
        }),
      })
    );
    await waitFor(() => expect(mocks.operation).toHaveBeenCalledTimes(1));
  });

  it('requires an explicit sequence and stages imported cash from its event identity', async () => {
    setup();
    const stage = screen.getByRole('button', {
      name: 'Stage imported cash KRAKEN:order:1',
    });
    expect(stage).toBeDisabled();
    fireEvent.change(
      screen.getByLabelText(
        'Stable sequence for imported execution KRAKEN:order:1'
      ),
      { target: { value: '3' } }
    );
    expect(stage).toBeEnabled();
    fireEvent.click(stage);

    await screen.findByText(/persisted Kraken record/);
    expect(mocks.importedOperation).toHaveBeenCalledWith({
      accountId: 'a1',
      statementId: 's1',
      eventId: 'event-1',
      input: { sequence: 3 },
    });
  });

  it('explains when an imported execution is already represented by another draft operation', () => {
    mocks.report.data = {
      ...report,
      cashImportExecutions: [
        {
          ...report.cashImportExecutions[0],
          stageable: false,
          reason: 'TRANSACTION_ALREADY_LINKED',
          operationId: 'op-existing',
        },
      ],
    };
    setup();

    expect(
      screen.getByText(
        'Transaction is already represented by a draft cash operation · op-existing'
      )
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', {
        name: /Stage imported cash KRAKEN:order:1/,
      })
    ).not.toBeInTheDocument();
  });
});
