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
    // accounts
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
    { name: 'getHoldings', call: () => apiClient.getHoldings() },
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
    { name: 'searchStocks', call: () => apiClient.searchStocks('AAPL') },
    { name: 'getQuotes', call: () => apiClient.getQuotes(['AAPL']) },
    // statistics
    {
      name: 'getStatisticsSummary',
      call: () => apiClient.getStatisticsSummary(),
    },
    {
      name: 'getStatisticsTimeSeries',
      call: () =>
        apiClient.getStatisticsTimeSeries({
          metric: 'equity',
        }),
    },
    {
      name: 'getStatisticsClosedTrades',
      call: () => apiClient.getStatisticsClosedTrades({}),
    },
    {
      name: 'getStatisticsDistributions',
      call: () => apiClient.getStatisticsDistributions(),
    },
    {
      name: 'getStatisticsRisk',
      call: () => apiClient.getStatisticsRisk(),
    },
    {
      name: 'getStatisticsBreakdowns',
      call: () =>
        apiClient.getStatisticsBreakdowns({
          by: 'assetType',
          metric: 'marketValue',
        }),
    },
    // tax reports
    { name: 'getTaxReports', call: () => apiClient.getTaxReports() },
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
    const covered = new Set(cases.map(c => c.name));
    const actualMethods = Object.keys(apiClient);
    const missing = actualMethods.filter(m => !covered.has(m));
    expect(missing).toEqual([]);
  });
});
