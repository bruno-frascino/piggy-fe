import axios from 'axios';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createAccountsApi } from './accounts';

const response = { success: true, data: { mode: 'RECONCILIATION_ONLY' } };
const client = axios.create();
const get = vi.spyOn(client, 'get');
const post = vi.spyOn(client, 'post');
const api = createAccountsApi(client);

beforeEach(() => {
  vi.clearAllMocks();
  get.mockImplementation(async () => ({ data: response }) as never);
  post.mockImplementation(async () => ({ data: response }) as never);
});

describe('opening reconciliation API', () => {
  it('posts only the manual execution sequence to the encoded source identity route', async () => {
    await api.stageDraftManualExecutionCash(
      'account/1',
      'statement 2',
      'tx/1',
      { sequence: 4 }
    );
    expect(post).toHaveBeenCalledWith(
      '/accounts/account%2F1/opening-statements/statement%202/transactions/tx%2F1/cash-operation',
      { sequence: 4 }
    );
  });
  it('posts imported sequence corrections to their encoded source-aware route', async () => {
    const input = {
      idempotencyKey: 'fix',
      expectedRevisionId: 'op1',
      reason: 'Broker sequence',
      sequence: 3,
    };
    await api.correctDraftImportedExecutionCash(
      'account/1',
      'statement 2',
      'op/1',
      input
    );
    expect(post).toHaveBeenCalledWith(
      '/accounts/account%2F1/opening-statements/statement%202/imported-cash-operations/op%2F1/corrections',
      input
    );
  });
  it('posts an exact correction to its encoded account, statement and operation route', async () => {
    const input = {
      idempotencyKey: 'correction-1',
      expectedRevisionId: 'op1',
      reason: 'Duplicate entry',
      replacement: null,
    };
    await api.correctDraftReconciliationCashOperation(
      'account/1',
      'statement 2',
      'op/1',
      input
    );
    expect(post).toHaveBeenCalledWith(
      '/accounts/account%2F1/opening-statements/statement%202/cash-operations/op%2F1/corrections',
      input
    );
  });
  it('loads the account-scoped reconciliation report', async () => {
    await api.getDraftOpeningReconciliation('account/1', 'statement 2');

    expect(get).toHaveBeenCalledWith(
      '/accounts/account%2F1/opening-statements/statement%202/reconciliation'
    );
  });

  it('previews statement evidence without changing the request body', async () => {
    const input = {
      idempotencyKey: 'key-1',
      asOfDate: '2026-10-31',
      source: 'Broker',
      reference: 'Statement 1',
      attested: true as const,
      cashBalances: [{ currency: 'AUD', amount: '100' }],
      decisions: [],
    };

    await api.previewDraftCashEvidence('account-1', 'statement-1', input);

    expect(post).toHaveBeenCalledWith(
      '/accounts/account-1/opening-statements/statement-1/cash-evidence/preview',
      input
    );
  });

  it('records evidence and stages dated operations on their protected routes', async () => {
    const evidence = {
      idempotencyKey: 'evidence-1',
      asOfDate: '2026-10-31',
      source: 'Broker',
      reference: 'Statement 1',
      attested: true as const,
      cashBalances: [{ currency: 'AUD', amount: '100' }],
      decisions: [],
    };
    const operation = {
      idempotencyKey: 'operation-1',
      effectiveDate: '2026-10-31',
      sequence: 1,
      kind: 'DEPOSIT' as const,
      currency: 'AUD',
      amount: '100',
      sourceReference: 'Bank transfer 1',
    };
    const importedExecution = { sequence: 2 };

    await api.recordDraftCashEvidence('account-1', 'statement-1', evidence);
    await api.saveDraftReconciliationCashOperation(
      'account-1',
      'statement-1',
      operation
    );
    await api.stageDraftImportedExecutionCash(
      'account-1',
      'statement-1',
      'event/1',
      importedExecution
    );

    expect(post).toHaveBeenNthCalledWith(
      1,
      '/accounts/account-1/opening-statements/statement-1/cash-evidence',
      evidence
    );
    expect(post).toHaveBeenNthCalledWith(
      2,
      '/accounts/account-1/opening-statements/statement-1/cash-operations',
      operation
    );
    expect(post).toHaveBeenNthCalledWith(
      3,
      '/accounts/account-1/opening-statements/statement-1/import-events/event%2F1/cash-operation',
      importedExecution
    );
  });
});
