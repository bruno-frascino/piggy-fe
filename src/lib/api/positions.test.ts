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
});
