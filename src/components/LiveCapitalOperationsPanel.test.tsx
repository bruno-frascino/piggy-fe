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

const { mutateAsyncMock, queryState } = vi.hoisted(() => ({
  mutateAsyncMock: vi.fn(),
  queryState: {
    data: {
      items: [
        {
          operationId: 'operation-1',
          kind: 'DEPOSIT',
          currency: 'AUD',
          sourceReference: 'bank-ref-1',
          expectedRevisionId: 'revision-1',
          original: {
            effectiveDate: '2026-10-02',
            sequence: 1,
            amount: '100',
          },
          current: {
            effectiveDate: '2026-10-03',
            sequence: 2,
            amount: '90',
          },
          revisions: [
            {
              revisionId: 'revision-1',
              auditNumber: 2,
              reason: 'Corrected from statement',
              recordedAt: '2026-11-08T00:00:00.000Z',
              before: {
                effectiveDate: '2026-10-02',
                sequence: 1,
                amount: '100',
              },
              replacement: {
                effectiveDate: '2026-10-03',
                sequence: 2,
                amount: '90',
              },
              postings: [
                { phase: 'REVERSAL', currency: 'AUD', amount: '-100' },
                { phase: 'REPLACEMENT', currency: 'AUD', amount: '90' },
              ],
            },
          ],
        },
      ],
      total: 1,
      limit: 100,
      offset: 0,
      auditNumber: 2,
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
    error: null,
    isLoading: false,
    isFetching: false,
    refetch: vi.fn(),
  },
}));

vi.mock('@/hooks/api', () => ({
  useLiveCapitalOperations: () => queryState,
  useCorrectLiveCapitalOperation: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
}));

vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => true,
}));

vi.mock('@/lib/privacy-context', () => ({
  usePrivacy: () => ({
    hidden: false,
    mask: (value: string) => value,
  }),
}));

import LiveCapitalOperationsPanel from './LiveCapitalOperationsPanel';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('LiveCapitalOperationsPanel', () => {
  it('distinguishes original and effective capital and displays immutable revision legs', () => {
    render(<LiveCapitalOperationsPanel accountId='account-1' />);
    expect(
      screen.getByText('Original: 2026-10-02 · sequence 1 · AUD 100')
    ).toBeInTheDocument();
    expect(
      screen.getByText('Current effective: 2026-10-03 · sequence 2 · AUD 90')
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Revision 2 · recorded .*Corrected from statement/)
    ).toBeInTheDocument();
    expect(screen.getByText(/Reversal AUD -100/)).toBeInTheDocument();
    expect(screen.getByText(/Replacement AUD 90/)).toBeInTheDocument();
  });

  it('posts a replacement with exact values and the displayed audit head', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'stable-capital-revision' });
    mutateAsyncMock.mockResolvedValue({ created: true });
    render(<LiveCapitalOperationsPanel accountId='account-1' />);
    fireEvent.click(screen.getByRole('button', { name: 'Correct or reverse' }));
    fireEvent.change(screen.getByLabelText('Exact amount (AUD)'), {
      target: { value: '80.0001' },
    });
    fireEvent.change(screen.getByLabelText('Audit reason'), {
      target: { value: 'Verified against the bank' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Save correction' }));
    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledOnce());
    expect(mutateAsyncMock).toHaveBeenCalledWith({
      accountId: 'account-1',
      operationId: 'operation-1',
      input: {
        idempotencyKey: 'stable-capital-revision',
        expectedRevisionId: 'revision-1',
        expectedAuditNumber: 2,
        expectedSourceFingerprint: 'a'.repeat(64),
        reason: 'Verified against the bank',
        replacement: {
          effectiveDate: '2026-10-03',
          sequence: 2,
          amount: '80.0001',
        },
      },
    });
    expect(queryState.refetch).toHaveBeenCalled();
  });

  it('requires explicit acknowledgement and an audit reason before terminal reversal', async () => {
    vi.stubGlobal('crypto', { randomUUID: () => 'stable-capital-reversal' });
    mutateAsyncMock.mockResolvedValue({ created: true });
    render(<LiveCapitalOperationsPanel accountId='account-1' />);
    fireEvent.click(screen.getByRole('button', { name: 'Correct or reverse' }));
    fireEvent.change(screen.getByLabelText('Audit reason'), {
      target: { value: 'Confirmed duplicate bank line' },
    });
    fireEvent.click(
      screen.getByRole('button', { name: 'Reverse permanently' })
    );
    expect(
      await screen.findByText(
        'Acknowledge that reversal is terminal before submitting.'
      )
    ).toBeInTheDocument();
    expect(mutateAsyncMock).not.toHaveBeenCalled();

    fireEvent.click(
      screen.getByLabelText(
        'I understand that reversing this operation is permanent and may affect funding for later activity.'
      )
    );
    fireEvent.click(
      screen.getByRole('button', { name: 'Reverse permanently' })
    );
    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledOnce());
    expect(mutateAsyncMock.mock.calls[0][0].input.replacement).toBeNull();
  });
});
