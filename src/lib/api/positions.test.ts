import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createPositionsApi } from './positions';

const response = {
  success: true,
  data: {
    operationId: 'op1',
    transactionId: 'tx1',
    created: true,
    replay: { funded: true, balances: [], activity: [], fundingIssues: [] },
  },
};
const client = axios.create();
const post = vi.spyOn(client, 'post');
const api = createPositionsApi(client);

beforeEach(() => {
  vi.clearAllMocks();
  post.mockImplementation(async () => ({ data: response }) as never);
});

describe('account trade API', () => {
  it('posts exact decimal strings to the encoded account trade route', async () => {
    const input = {
      kind: 'BUY' as const,
      assetId: 'asset/1',
      idempotencyKey: 'buy-1',
      effectiveDate: '2026-10-02',
      sequence: 2,
      quantity: '0.125',
      price: '12.345678901234',
      fees: '0.25',
    };
    expect(await api.postAccountTrade('account/1', input)).toEqual(
      response.data
    );
    expect(post).toHaveBeenCalledWith('/accounts/account%2F1/trades', input);
  });

  it('posts the audited live sale correction without losing exact values', async () => {
    const input = {
      idempotencyKey: 'correction-1',
      expectedRevisionId: 'revision/1',
      expectedSourceFingerprint: 'a'.repeat(64),
      reason: 'Broker statement correction',
      effectiveDate: '2026-10-03',
      sequence: 3,
      price: '12.345678901234',
      fees: '0.00000001',
    };
    expect(
      await api.correctLiveManualSale('account/1', 'transaction/1', input)
    ).toEqual(response.data);
    expect(post).toHaveBeenCalledWith(
      '/accounts/account%2F1/trades/transaction%2F1/corrections',
      input
    );
  });

  it('posts exact total bought quantity to the encoded live acquisition correction route', async () => {
    const input = {
      idempotencyKey: 'correction-1',
      expectedRevisionId: 'revision/1',
      expectedSourceFingerprint: 'a'.repeat(64),
      reason: 'Broker purchase correction',
      effectiveDate: '2026-10-03',
      sequence: 3,
      quantity: '2.000000000001',
      price: '12.345678901234',
      fees: '0.00000001',
    };
    expect(
      await api.correctLiveManualAcquisition(
        'account/1',
        'transaction/1',
        input
      )
    ).toEqual(response.data);
    expect(post).toHaveBeenCalledWith(
      '/accounts/account%2F1/trades/transaction%2F1/acquisition-corrections',
      input
    );
    post.mockRejectedValueOnce(new Error('Funding deficit'));
    await expect(
      api.correctLiveManualAcquisition('a1', 'tx1', input)
    ).rejects.toThrow('Funding deficit');
  });
});
