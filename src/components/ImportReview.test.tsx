// @vitest-environment jsdom

import '@testing-library/jest-dom/vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { ImportDetail, ImportPlan } from '@/lib/types';

const m = vi.hoisted(() => ({
  useImport: vi.fn(),
  resolveMutate: vi.fn(),
  commitMutate: vi.fn(),
  discardMutate: vi.fn(),
  push: vi.fn(),
  show: vi.fn(),
}));

vi.mock('@/hooks/api', () => ({
  useImport: m.useImport,
  useResolveImportEvent: () => ({ mutate: m.resolveMutate, isPending: false }),
  useCommitImport: () => ({ mutate: m.commitMutate, isPending: false }),
  useDiscardImport: () => ({ mutate: m.discardMutate, isPending: false }),
}));
vi.mock('next/navigation', () => ({ useRouter: () => ({ push: m.push }) }));
vi.mock('@/lib/toast-context', () => ({ useToast: () => ({ show: m.show }) }));

import ImportReview from './ImportReview';

const basePlan: ImportPlan = {
  newPositions: [
    {
      ref: 'event:KRAKEN:order:B1',
      origin: 'IMPORT_TRADE',
      externalRef: 'KRAKEN:order:B1',
      symbol: 'BTC-AUD',
      baseAsset: 'BTC',
      quoteCurrency: 'AUD',
      exchangeCode: 'KRAKEN',
      openDate: '2026-05-03T00:00:00.000Z',
      quantity: '0.03197303',
      entryPrice: '108982',
      totalBuyValue: '3484.48',
      buyFees: '13.99',
      notes: 'Imported from Kraken (order B1)',
    },
  ],
  sells: [
    {
      eventId: 'sell-1',
      externalId: 'KRAKEN:order:S1',
      occurredAt: '2026-05-16T09:31:04.770Z',
      sellDate: '2026-05-16T00:00:00.000Z',
      baseAsset: 'BTC',
      quoteCurrency: 'AUD',
      quantity: '0.03197303',
      orderType: 'limit',
      closeReason: null,
      allocations: [
        {
          positionRef: 'event:KRAKEN:order:B1',
          quantity: '0.03197303',
          price: '109270',
          totalValue: '3493.69',
          fees: '10.48',
          notes: null,
        },
      ],
      userOverridden: false,
      dustIgnored: null,
      resolved: true,
      eligible: [
        {
          positionRef: 'event:KRAKEN:order:B1',
          remaining: '0.03197303',
          acquiredAt: '2026-05-03T00:00:00.000Z',
          currency: 'AUD',
        },
      ],
    },
  ],
  staking: [
    {
      key: 'KRAKEN:staking:SOL:2026-03',
      baseAsset: 'SOL',
      month: '2026-03',
      eventIds: ['r1'],
      quantity: '0.001',
      fmvAud: '0.20',
      status: 'DUST',
    },
    {
      key: 'KRAKEN:staking:SOL:2026-10',
      baseAsset: 'SOL',
      month: '2026-10',
      eventIds: ['r2'],
      quantity: '0.001',
      fmvAud: '0',
      status: 'DEFERRED',
    },
  ],
  unsupported: [
    {
      eventId: 'u1',
      externalId: 'KRAKEN:ledger:U1',
      reason: 'Margin trades are not supported',
    },
  ],
  skipped: [],
  issues: [],
  reconciliation: { reconciled: true, rows: [] },
  summary: {
    buys: 1,
    sells: 1,
    stakingMonthsApplied: 0,
    stakingMonthsDust: 1,
    stakingMonthsDeferred: 1,
    dustTotalAud: '0.2',
    unsupported: 1,
    skipped: 0,
    blockingIssues: 0,
  },
};

function detail(
  overrides: Partial<ImportDetail> = {},
  plan: Partial<ImportPlan> = {}
): ImportDetail {
  return {
    batch: {
      id: 'imp-1',
      accountId: 'acc-1',
      source: 'KRAKEN',
      method: 'CSV',
      status: 'PENDING_REVIEW',
      fileNames: ['trades.csv', 'ledgers.csv'],
      warnings: [],
      createdAt: '2026-10-18T00:00:00.000Z',
      committedAt: null,
    },
    plan: { ...basePlan, ...plan },
    eventCounts: { PENDING: 5 },
    ...overrides,
  };
}

function mockQuery(
  data: ImportDetail | undefined,
  extra: Record<string, unknown> = {}
) {
  m.useImport.mockReturnValue({
    data,
    isLoading: false,
    isError: false,
    ...extra,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  mockQuery(detail());
});
afterEach(cleanup);

describe('ImportReview', () => {
  it('summarises the plan and shows the reconciliation banner', () => {
    render(<ImportReview importId='imp-1' />);
    expect(screen.getByText(/Reconciled ✓/)).toBeInTheDocument();
    expect(screen.getByText(/1 new positions from buys/)).toBeInTheDocument();
    expect(screen.getByText(/1 skipped as dust/)).toBeInTheDocument();
    expect(screen.getByText('BTC-AUD')).toBeInTheDocument();
    expect(screen.getByText('03/05/2026')).toBeInTheDocument();
    expect(screen.getByText(/Sell .* BTC · 16\/05\/2026/)).toBeInTheDocument();
    expect(screen.getByText('03/2026')).toBeInTheDocument();
    expect(screen.queryByText('2026-05-03')).not.toBeInTheDocument();
    expect(screen.queryByText('2026-03')).not.toBeInTheDocument();
    expect(screen.getByText('Skipped (below A$1)')).toBeInTheDocument();
    expect(
      screen.getByText('Deferred — month not finished')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Margin trades are not supported/)
    ).toBeInTheDocument();
  });

  it('shows per-asset differences when it does not reconcile', () => {
    mockQuery(
      detail(
        {},
        {
          reconciliation: {
            reconciled: false,
            rows: [
              { asset: 'SOL', expected: '3', simulated: '1', difference: '-2' },
            ],
          },
        }
      )
    );
    render(<ImportReview importId='imp-1' />);
    expect(screen.getByText(/do not match the ledger/)).toBeInTheDocument();
    expect(screen.getByText('-2')).toBeInTheDocument();
  });

  it('commits when nothing blocks', () => {
    render(<ImportReview importId='imp-1' />);
    expect(
      screen.getByText(/nothing has been added to your portfolio yet/)
    ).toBeInTheDocument();
    expect(
      screen.getByText(/then click Commit at the bottom/)
    ).toBeInTheDocument();
    const commit = screen.getByRole('button', { name: /Commit 2 items/ });
    expect(
      screen.getByRole('region', { name: 'Import actions' })
    ).toContainElement(commit);
    expect(screen.getByRole('region', { name: 'Import actions' })).toHaveClass(
      'import-review-actions'
    );
    expect(
      screen.getByRole('region', { name: 'Import actions' }).parentElement
    ).toHaveClass('import-review--editable');
    expect(commit).toBeEnabled();
    fireEvent.click(commit);
    expect(m.commitMutate).toHaveBeenCalledWith(undefined, expect.any(Object));
  });

  it('explains how to finish a partially committed import', () => {
    const data = detail();
    data.batch.status = 'PARTIALLY_APPLIED';
    mockQuery(data);
    render(<ImportReview importId='imp-1' />);
    expect(
      screen.getByText(/Some events are already committed/)
    ).toBeInTheDocument();
    expect(
      screen.queryByText(/nothing has been added to your portfolio yet/)
    ).not.toBeInTheDocument();
  });

  it('links to positions and History after commit and explains account selection', () => {
    const data = detail();
    data.batch.status = 'COMMITTED';
    data.eventCounts = { APPLIED: 2 };
    mockQuery(data);
    render(<ImportReview importId='imp-1' />);
    expect(
      screen.getByText(/links below open this import's trading account/)
    ).toBeInTheDocument();
    expect(
      screen.getByRole('link', { name: 'View open positions' })
    ).toHaveAttribute('href', '/?accountId=acc-1&venue=KRAKEN');
    expect(screen.getByRole('link', { name: 'View History' })).toHaveAttribute(
      'href',
      '/history?accountId=acc-1&period=all'
    );
    expect(
      screen.queryByRole('button', { name: /Commit/ })
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('region', { name: 'Import actions' })
    ).not.toBeInTheDocument();
  });
  it('disables commit while blocking issues remain', () => {
    mockQuery(
      detail(
        {},
        {
          summary: { ...basePlan.summary, blockingIssues: 1 },
          issues: [
            {
              type: 'INSUFFICIENT_HOLDINGS',
              blocking: true,
              eventId: 'sell-1',
              externalId: 'KRAKEN:order:S1',
              message: 'Only 0 of 1 BTC is available to sell',
            },
          ],
        }
      )
    );
    render(<ImportReview importId='imp-1' />);
    expect(screen.getByRole('button', { name: /Commit/ })).toBeDisabled();
    expect(screen.getByText('1 issue to resolve')).toBeInTheDocument();
    expect(screen.getByText('1 issue to resolve')).toHaveClass(
      'import-review-actions-issues'
    );
    expect(
      screen.getByRole('region', { name: 'Import actions' }).parentElement
    ).toHaveClass('import-review--blocked');
    expect(
      screen.getByText('Only 0 of 1 BTC is available to sell')
    ).toBeInTheDocument();
  });

  it('lets the user skip a sale', () => {
    render(<ImportReview importId='imp-1' />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip sale' }));
    expect(m.resolveMutate).toHaveBeenCalledWith(
      { eventId: 'sell-1', resolution: { skip: true } },
      expect.any(Object)
    );
  });

  it('asks for a manual AUD value when a staking reward cannot be valued', () => {
    mockQuery(
      detail(
        {},
        {
          staking: [{ ...basePlan.staking[0], status: 'BLOCKED' }],
          issues: [
            {
              type: 'MISSING_FMV',
              blocking: true,
              eventId: 'r1',
              externalId: 'KRAKEN:ledger:R1',
              message:
                'Cannot determine the AUD value of this SOL reward — enter it manually',
            },
          ],
          summary: { ...basePlan.summary, blockingIssues: 1 },
        }
      )
    );
    render(<ImportReview importId='imp-1' />);
    const save = screen.getByRole('button', { name: 'Save value' });
    expect(save).toBeDisabled();
    fireEvent.change(screen.getByLabelText('AUD value'), {
      target: { value: '12.5' },
    });
    fireEvent.click(save);
    expect(m.resolveMutate).toHaveBeenCalledWith(
      { eventId: 'r1', resolution: { fmvAud: '12.5' } },
      expect.any(Object)
    );
  });

  it('discards and returns to the list', () => {
    m.discardMutate.mockImplementation((_v, opts) => opts.onSuccess());
    render(<ImportReview importId='imp-1' />);
    fireEvent.click(screen.getByRole('button', { name: 'Discard' }));
    expect(m.push).toHaveBeenCalledWith('/imports');
  });

  it('hides commit controls once committed', () => {
    mockQuery(
      detail({
        batch: { ...detail().batch, status: 'COMMITTED' },
        eventCounts: { APPLIED: 10 },
      })
    );
    render(<ImportReview importId='imp-1' />);
    expect(
      screen.getByText(/Committed — 10 events applied/)
    ).toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: /Commit/ })
    ).not.toBeInTheDocument();
  });

  it('shows a load error', () => {
    mockQuery(undefined, {
      isError: true,
      error: { response: { data: { message: 'Import batch not found' } } },
    });
    render(<ImportReview importId='nope' />);
    expect(screen.getByText('Import batch not found')).toBeInTheDocument();
  });
});

describe('ImportSellAllocation (via review)', () => {
  it('validates a manual allocation, saves it and resets to FIFO', () => {
    const sell = {
      ...basePlan.sells[0],
      quantity: '1.5',
      allocations: [{ ...basePlan.sells[0].allocations[0], quantity: '1' }],
      eligible: [
        {
          positionRef: 'p1',
          remaining: '1',
          acquiredAt: '2026-01-01T00:00:00.000Z',
          currency: 'AUD',
        },
        {
          positionRef: 'p2',
          remaining: '2',
          acquiredAt: '2026-01-02T00:00:00.000Z',
          currency: 'AUD',
        },
      ],
    };
    sell.allocations[0].positionRef = 'p1';
    mockQuery(detail({}, { sells: [sell] }));
    render(<ImportReview importId='imp-1' />);

    fireEvent.click(screen.getByRole('button', { name: 'Choose parcels' }));
    expect(screen.getByText('01/01/2026')).toBeInTheDocument();
    expect(screen.getByText('02/01/2026')).toBeInTheDocument();
    expect(screen.getByTestId('remaining-to-allocate')).toHaveTextContent(
      '0.5'
    );
    const save = screen.getByRole('button', { name: 'Save allocation' });
    expect(save).toBeDisabled();

    fireEvent.change(
      screen.getByLabelText('Quantity from parcel acquired 02/01/2026'),
      { target: { value: '0.5' } }
    );
    expect(screen.getByTestId('remaining-to-allocate')).toHaveTextContent(
      'Remaining to allocate: 0 BTC'
    );
    expect(save).toBeEnabled();
    fireEvent.click(save);
    expect(m.resolveMutate).toHaveBeenCalledWith(
      {
        eventId: 'sell-1',
        resolution: {
          allocations: [
            { positionRef: 'p1', quantity: '1' },
            { positionRef: 'p2', quantity: '0.5' },
          ],
        },
      },
      expect.any(Object)
    );

    fireEvent.click(screen.getByRole('button', { name: 'Reset to FIFO' }));
    expect(m.resolveMutate).toHaveBeenLastCalledWith(
      { eventId: 'sell-1', resolution: { allocations: null } },
      expect.any(Object)
    );
  });

  it('changes the close reason', () => {
    render(<ImportReview importId='imp-1' />);
    fireEvent.click(document.querySelector('.p-dropdown') as HTMLElement);
    fireEvent.click(screen.getByText('Stop loss'));
    expect(m.resolveMutate).toHaveBeenCalledWith(
      { eventId: 'sell-1', resolution: { closeReason: 'STOP_LOSS' } },
      expect.any(Object)
    );
  });
});
