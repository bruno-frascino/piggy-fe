// @vitest-environment jsdom

import { afterAll, beforeAll, describe, expect, it } from 'vitest';

// Walks the entire apiClient facade with NEXT_PUBLIC_USE_MOCK_API=true and
// asserts every method has an explicit, intentional mock-mode branch — i.e.
// none of them silently fall through to a real network call via axios.
// See piggy-fe copilot-instructions.md: "When adding a new API endpoint, add
// a corresponding mock implementation... if a realistic mock is not provided
// yet, return a clear not-implemented stub in mock mode."
//
// Any method missing a mock branch will hit the sentinel axios mock below and
// reject with NETWORK_ATTEMPTED_SENTINEL, failing its test case.

const NETWORK_ATTEMPTED_SENTINEL = 'NETWORK_CALL_ATTEMPTED_IN_MOCK_MODE';

let originalMockFlag: string | undefined;
let apiClient: typeof import('./api-client').apiClient;

beforeAll(async () => {
  originalMockFlag = process.env.NEXT_PUBLIC_USE_MOCK_API;
  process.env.NEXT_PUBLIC_USE_MOCK_API = 'true';

  const axiosModule = await import('axios');
  const networkCall = () =>
    Promise.reject(new Error(NETWORK_ATTEMPTED_SENTINEL));
  const sentinelClient = Object.assign(networkCall, {
    get: networkCall,
    post: networkCall,
    patch: networkCall,
    delete: networkCall,
    defaults: { headers: { common: {} as Record<string, string> } },
    interceptors: {
      request: { use: () => 0 },
      response: { use: () => 0 },
    },
  });
  // @ts-expect-error - stubbing axios.create for this test file only
  axiosModule.default.create = () => sentinelClient;

  const mod = await import('./api-client');
  apiClient = mod.apiClient;
});

afterAll(() => {
  process.env.NEXT_PUBLIC_USE_MOCK_API = originalMockFlag;
});

type Case = {
  name: string;
  call: () => Promise<unknown>;
  // Some domains (tax report generation/download) intentionally throw a
  // clear "not available in mock mode" error instead of a silent stub.
  expectRejection?: RegExp;
};

const realApiOnlyMethods = new Set([
  'getStatisticsSummary',
  'getStatisticsTimeSeries',
  'getStatisticsClosedTrades',
  'getStatisticsDistributions',
  'getStatisticsRisk',
  'getStatisticsBreakdowns',
]);

describe('apiClient mock-mode parity', () => {
  const cases: Case[] = [
    // auth
    { name: 'login', call: () => apiClient.login('a@b.com', 'pw') },
    { name: 'logout', call: () => apiClient.logout('refresh') },
    { name: 'signup', call: () => apiClient.signup('A', 'a@b.com', 'pw') },
    { name: 'forgotPassword', call: () => apiClient.forgotPassword('a@b.com') },
    {
      name: 'resetPassword',
      call: () => apiClient.resetPassword('tok', 'password123'),
    },
    {
      name: 'restoreAccount',
      call: () => apiClient.restoreAccount('a@b.com', 'pw'),
    },
    {
      name: 'deleteCurrentUser',
      call: () => apiClient.deleteCurrentUser('pw'),
    },
    // accounts
    {
      name: 'correctDraftRecordedAcquisition',
      call: () =>
        apiClient.correctDraftRecordedAcquisition('a1', 's1', 'op1', {
          idempotencyKey: 'buy-fix',
          expectedRevisionId: 'op1',
          expectedSourceFingerprint: 'a'.repeat(64),
          reason: 'Correct purchase',
          effectiveDate: '2026-10-02',
          sequence: 1,
          price: '12',
          fees: '1',
          quantity: '1.25',
        }),
      expectRejection: /require the real API/i,
    },
    {
      name: 'correctDraftRecordedSale',
      call: () =>
        apiClient.correctDraftRecordedSale('a1', 's1', 'op1', {
          idempotencyKey: 'sale-fix',
          expectedRevisionId: 'op1',
          expectedSourceFingerprint: 'a'.repeat(64),
          reason: 'Correct fees',
          effectiveDate: '2026-10-03',
          sequence: 2,
          price: '12',
          fees: '1',
        }),
      expectRejection: /require the real API/i,
    },
    {
      name: 'correctLiveManualSale',
      call: () =>
        apiClient.correctLiveManualSale('a1', 'tx1', {
          idempotencyKey: 'sale-fix',
          expectedRevisionId: 'op1',
          expectedSourceFingerprint: 'a'.repeat(64),
          reason: 'Correct fees',
          effectiveDate: '2026-10-03',
          sequence: 2,
          price: '12',
          fees: '1',
        }),
      expectRejection: /require the real API/i,
    },
    {
      name: 'correctLiveManualAcquisition',
      call: () =>
        apiClient.correctLiveManualAcquisition('a1', 'buy1', {
          idempotencyKey: 'buy-fix',
          expectedRevisionId: 'op1',
          expectedSourceFingerprint: 'a'.repeat(64),
          reason: 'Correct purchase',
          effectiveDate: '2026-10-03',
          sequence: 1,
          quantity: '2',
          price: '10',
          fees: '1',
        }),
      expectRejection: /require the real API/i,
    },
    {
      name: 'stageDraftManualExecutionCash',
      call: () =>
        apiClient.stageDraftManualExecutionCash('a1', 's1', 't1', {
          sequence: 1,
        }),
      expectRejection: /requires the real API/i,
    },
    {
      name: 'correctDraftImportedExecutionCash',
      call: () =>
        apiClient.correctDraftImportedExecutionCash('a1', 's1', 'op1', {
          idempotencyKey: 'fix',
          expectedRevisionId: 'op1',
          reason: 'Broker sequence',
          sequence: 3,
        }),
      expectRejection: /require the real API/i,
    },
    {
      name: 'correctDraftReconciliationCashOperation',
      call: () =>
        apiClient.correctDraftReconciliationCashOperation('a1', 's1', 'op1', {
          idempotencyKey: 'correction-1',
          expectedRevisionId: 'op1',
          reason: 'Duplicate entry',
          replacement: null,
        }),
      expectRejection: /require the real API/i,
    },
    {
      name: 'getOpeningStatements',
      call: () => apiClient.getOpeningStatements('acc-1'),
      expectRejection: /require the real API/i,
    },
    {
      name: 'saveOpeningStatement',
      call: () =>
        apiClient.saveOpeningStatement('acc-1', {
          openingDate: '2026-10-01',
          cashBalances: [{ currency: 'AUD', amount: '0' }],
          sourceFingerprint: 'a'.repeat(64),
        }),
      expectRejection: /require the real API/i,
    },
    {
      name: 'getDraftOpeningReconciliation',
      call: () => apiClient.getDraftOpeningReconciliation('acc-1', 'stmt-1'),
      expectRejection: /requires the real API/i,
    },
    {
      name: 'previewDraftCashEvidence',
      call: () =>
        apiClient.previewDraftCashEvidence('acc-1', 'stmt-1', {
          idempotencyKey: 'key-1',
          asOfDate: '2026-10-31',
          source: 'Broker',
          reference: 'Statement 1',
          attested: true,
          cashBalances: [{ currency: 'AUD', amount: '100' }],
          decisions: [],
        }),
      expectRejection: /requires the real API/i,
    },
    {
      name: 'recordDraftCashEvidence',
      call: () =>
        apiClient.recordDraftCashEvidence('acc-1', 'stmt-1', {
          idempotencyKey: 'key-1',
          asOfDate: '2026-10-31',
          source: 'Broker',
          reference: 'Statement 1',
          attested: true,
          cashBalances: [{ currency: 'AUD', amount: '100' }],
          decisions: [],
        }),
      expectRejection: /requires the real API/i,
    },
    {
      name: 'saveDraftReconciliationCashOperation',
      call: () =>
        apiClient.saveDraftReconciliationCashOperation('acc-1', 'stmt-1', {
          idempotencyKey: 'key-1',
          effectiveDate: '2026-10-31',
          sequence: 1,
          kind: 'DEPOSIT',
          currency: 'AUD',
          amount: '100',
          sourceReference: 'Bank transfer 1',
        }),
      expectRejection: /require the real API/i,
    },
    {
      name: 'stageDraftImportedExecutionCash',
      call: () =>
        apiClient.stageDraftImportedExecutionCash(
          'acc-1',
          'stmt-1',
          'event-1',
          { sequence: 1 }
        ),
      expectRejection: /requires the real API/i,
    },
    {
      name: 'previewAccountOpening',
      call: () =>
        apiClient.previewAccountOpening('acc-1', {
          openingDate: '2026-10-01',
          cashBalances: [{ currency: 'AUD', amount: '0' }],
        }),
      expectRejection: /require the real API/i,
    },
    { name: 'getTradingAccounts', call: () => apiClient.getTradingAccounts() },
    { name: 'getAccounts', call: () => apiClient.getAccounts() },
    {
      name: 'createAccount',
      call: () => apiClient.createAccount({ name: 'Spouse' }),
    },
    { name: 'deleteAccount', call: () => apiClient.deleteAccount('acc-1') },
    { name: 'closeAccount', call: () => apiClient.closeAccount('acc-1') },
    { name: 'reopenAccount', call: () => apiClient.reopenAccount('acc-1') },
    {
      name: 'updateAccount',
      call: () => apiClient.updateAccount('acc-1', { name: 'Renamed' }),
    },
    // user
    { name: 'getCurrentUser', call: () => apiClient.getCurrentUser() },
    {
      name: 'updateCurrentUser',
      call: () => apiClient.updateCurrentUser({ name: 'New Name' }),
    },
    // portfolio
    { name: 'getUserPortfolio', call: () => apiClient.getUserPortfolio() },
    {
      name: 'getPortfolioHistory',
      call: () => apiClient.getPortfolioHistory('acc-1', 'NASDAQ'),
    },
    {
      name: 'createPortfolioSnapshot',
      call: () => apiClient.createPortfolioSnapshot('acc-1', 'NASDAQ'),
    },
    // positions / holdings
    {
      name: 'postAccountTrade',
      call: () =>
        apiClient.postAccountTrade('acc-1', {
          kind: 'BUY',
          assetId: 'asset-1',
          idempotencyKey: 'buy-1',
          effectiveDate: '2026-01-02',
          sequence: 1,
          quantity: '1',
          price: '10',
          fees: '0',
        }),
      expectRejection: /requires the real API/,
    },
    {
      name: 'createPosition',
      call: () =>
        apiClient.createPosition({
          symbol: 'AAPL',
          exchangeCode: 'NASDAQ',
          openDate: '2026-01-01',
          entryPrice: 100,
          quantity: 1,
        }),
    },
    {
      name: 'updatePosition',
      call: () => apiClient.updatePosition('pos-1', { notes: 'x' }),
    },
    {
      name: 'recalculateDrawdown',
      call: () => apiClient.recalculateDrawdown('pos-1'),
    },
    {
      name: 'checkStopLoss',
      call: () => apiClient.checkStopLoss('pos-1', 90),
    },
    { name: 'getHoldings', call: () => apiClient.getHoldings() },
    {
      name: 'getRealizedPnL',
      call: () => apiClient.getRealizedPnL('acc-1', 'NASDAQ'),
    },
    { name: 'getClosedPositions', call: () => apiClient.getClosedPositions() },
    {
      name: 'updateCloseEvent',
      call: () => apiClient.updateCloseEvent('evt-1', { notes: 'x' }),
    },
    {
      name: 'closePosition',
      call: () => apiClient.closePosition('pos-1', '2026-02-01', 110),
    },
    { name: 'deletePosition', call: () => apiClient.deletePosition('pos-1') },
    // stocks
    {
      name: 'getExchanges',
      call: () => apiClient.getExchanges('equity'),
      expectRejection: /not available in mock mode/i,
    },
    {
      name: 'searchKrakenAssets',
      call: () => apiClient.searchKrakenAssets('BTC', 'AUD'),
      expectRejection: /not available in mock mode/i,
    },
    { name: 'searchStocks', call: () => apiClient.searchStocks('AAPL') },
    { name: 'getQuotes', call: () => apiClient.getQuotes(['AAPL']) },
    // tax reports
    { name: 'getTaxReports', call: () => apiClient.getTaxReports() },
    {
      name: 'getTaxReportPositionUsage',
      call: () => apiClient.getTaxReportPositionUsage(),
    },
    {
      name: 'getTaxReportDetail',
      call: () => apiClient.getTaxReportDetail('rep-1'),
    },
    {
      name: 'generateTaxReport',
      call: () =>
        apiClient.generateTaxReport({
          financialYearStartYear: 2025,
          accountIds: ['acc-1'],
        }),
      expectRejection: /not available in mock mode/i,
    },
    {
      name: 'downloadTaxReportPdf',
      call: () => apiClient.downloadTaxReportPdf('rep-1'),
      expectRejection: /not available in mock mode/i,
    },
    { name: 'deleteTaxReport', call: () => apiClient.deleteTaxReport('rep-1') },
    // imports (online-only, no realistic mock)
    { name: 'getImports', call: () => apiClient.getImports() },
    {
      name: 'createImport',
      call: () =>
        apiClient.createImport({
          source: 'KRAKEN',
          accountId: 'acc-1',
          files: [],
        }),
      expectRejection: /not available in mock mode/i,
    },
    {
      name: 'getImport',
      call: () => apiClient.getImport('imp-1'),
      expectRejection: /not available in mock mode/i,
    },
    {
      name: 'resolveImportEvent',
      call: () => apiClient.resolveImportEvent('imp-1', 'e-1', { skip: true }),
      expectRejection: /not available in mock mode/i,
    },
    {
      name: 'commitImport',
      call: () => apiClient.commitImport('imp-1'),
      expectRejection: /not available in mock mode/i,
    },
    {
      name: 'discardImport',
      call: () => apiClient.discardImport('imp-1'),
      expectRejection: /not available in mock mode/i,
    },
    // screener
    {
      name: 'runScreener',
      call: () => apiClient.runScreener({ symbol: 'AAPL' }),
    },
    {
      name: 'getUpcomingDividends',
      call: () => apiClient.getUpcomingDividends(['AAPL']),
    },
    { name: 'getSavedScreens', call: () => apiClient.getSavedScreens() },
    {
      name: 'createSavedScreen',
      call: () => apiClient.createSavedScreen('My screen', { sector: 'Tech' }),
    },
    {
      name: 'deleteSavedScreen',
      call: () => apiClient.deleteSavedScreen('screen-1'),
    },
    // watchlists
    { name: 'getWatchlists', call: () => apiClient.getWatchlists() },
    { name: 'getWatchlist', call: () => apiClient.getWatchlist('w-1') },
    {
      name: 'createWatchlist',
      call: () => apiClient.createWatchlist('Tech'),
    },
    {
      name: 'renameWatchlist',
      call: () => apiClient.renameWatchlist('w-1', 'Tech Growth'),
    },
    { name: 'deleteWatchlist', call: () => apiClient.deleteWatchlist('w-1') },
    {
      name: 'addWatchlistItem',
      call: () =>
        apiClient.addWatchlistItem('w-1', {
          symbol: 'AAPL',
          exchangeCode: 'NASDAQ',
        }),
    },
    {
      name: 'removeWatchlistItem',
      call: () => apiClient.removeWatchlistItem('w-1', 'item-1'),
    },
  ];

  it.each(cases)(
    '$name has an explicit mock-mode branch (never touches the network)',
    async ({ call, expectRejection }) => {
      if (expectRejection) {
        await expect(call()).rejects.toThrow(expectRejection);
        return;
      }
      await expect(call()).resolves.not.toThrow();
    }
  );

  it('covers every public method on the apiClient facade', () => {
    const covered = new Set([...cases.map(c => c.name), ...realApiOnlyMethods]);
    const actualMethods = Object.keys(apiClient);
    const missing = actualMethods.filter(m => !covered.has(m));
    expect(missing).toEqual([]);
  });
});
