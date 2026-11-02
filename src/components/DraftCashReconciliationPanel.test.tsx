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
      idempotencyKey: 'deposit-1',
      kind: 'DEPOSIT',
      effectiveDate: '2026-10-10',
      sequence: 1,
      sourceOrigin: 'MANUAL',
      sourceReference: 'Bank transfer 1',
      status: 'EFFECTIVE',
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
});

afterEach(cleanup);

describe('DraftCashReconciliationPanel', () => {
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
});
