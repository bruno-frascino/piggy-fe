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

const { mutateAsyncMock } = vi.hoisted(() => ({
  mutateAsyncMock: vi.fn(),
}));

vi.mock('@/hooks/api', () => ({
  usePostAccountCapitalFlow: () => ({
    mutateAsync: mutateAsyncMock,
    isPending: false,
  }),
  useLiveCapitalOperations: () => ({
    data: {
      items: [],
      total: 0,
      limit: 100,
      offset: 0,
      auditNumber: 0,
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
  }),
  useCorrectLiveCapitalOperation: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}));

vi.mock('@/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => true,
}));

vi.mock('@/lib/privacy-context', () => ({
  usePrivacy: () => ({ mask: (value: string) => value }),
}));

import LiveCapitalFlowDialog from './LiveCapitalFlowDialog';

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  vi.unstubAllGlobals();
});

describe('LiveCapitalFlowDialog', () => {
  it('submits exact amount and source identity with a stable retry key', async () => {
    const operationResult = {
      operationId: 'operation-1',
      created: true,
      replay: {
        accountId: 'account-1',
        openingDate: '2026-10-01',
        funded: true,
        balances: [
          {
            currency: 'AUD',
            openingAmount: '0',
            endingAmount: '12.3400',
            minimumAmount: '0',
            netExternalContribution: '12.3400',
          },
        ],
        activity: [],
        fundingIssues: [],
      },
    };
    mutateAsyncMock.mockResolvedValue(operationResult);
    vi.stubGlobal('crypto', { randomUUID: () => 'stable-operation-key' });
    render(
      <LiveCapitalFlowDialog
        accountId='account-1'
        accountName='Main'
        onHide={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '12.3400' },
    });
    fireEvent.change(screen.getByLabelText('Currency'), {
      target: { value: 'aud' },
    });
    fireEvent.change(screen.getByLabelText('Source reference'), {
      target: { value: 'bank-transfer-123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record deposit' }));

    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledOnce());
    const expectedDate = new Intl.DateTimeFormat('en-CA', {
      timeZone: 'Australia/Sydney',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date());
    expect(mutateAsyncMock).toHaveBeenCalledWith({
      accountId: 'account-1',
      input: {
        kind: 'DEPOSIT',
        idempotencyKey: 'stable-operation-key',
        effectiveDate: expectedDate,
        sequence: 1,
        currency: 'AUD',
        amount: '12.3400',
        sourceReference: 'bank-transfer-123',
      },
    });
    expect(
      await screen.findByText(/Cash operation recorded/)
    ).toBeInTheDocument();
    expect(screen.getByText(/AUD 12\.3400/)).toBeInTheDocument();
  });

  it('surfaces a funding conflict without discarding the retry identity', async () => {
    mutateAsyncMock.mockRejectedValueOnce(
      Object.assign(new Error('Withdrawal would leave cash unfunded'), {
        response: {
          status: 422,
          data: { message: 'Withdrawal would leave cash unfunded' },
        },
      })
    );
    vi.stubGlobal('crypto', { randomUUID: () => 'stable-operation-key' });
    render(
      <LiveCapitalFlowDialog
        accountId='account-1'
        accountName='Main'
        onHide={vi.fn()}
      />
    );
    fireEvent.change(screen.getByLabelText('Amount'), {
      target: { value: '100' },
    });
    fireEvent.change(screen.getByLabelText('Source reference'), {
      target: { value: 'bank-ref' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Record deposit' }));
    expect(
      await screen.findByText('Withdrawal would leave cash unfunded')
    ).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Record deposit' }));
    await waitFor(() => expect(mutateAsyncMock).toHaveBeenCalledTimes(2));
    expect(mutateAsyncMock.mock.calls[0][0].input.idempotencyKey).toBe(
      mutateAsyncMock.mock.calls[1][0].input.idempotencyKey
    );
  });
});
