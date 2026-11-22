import { AxiosInstance } from 'axios';
import type {
  CloseReason,
  ClosedTrade,
  ClosedTradesPage,
  ClosedTradesQuery,
  AssetType,
  AccountTradeInput,
  AccountTradeResult,
  AccountTradeCapability,
  AccountTradeResponse,
  AccountCapitalFlowInput,
  AccountFxConversionInput,
  AccountFxConversionResult,
  AccountFxConversionResponse,
  AccountFxCorrectionInput,
  AccountFxCorrectionResult,
  AccountFxCorrectionResponse,
  LiveFxConversionReview,
  AccountCapitalFlowResult,
  AccountCashTransferInput,
  AccountCashTransferResult,
  AccountCashTransferResponse,
  AccountCashTransferCorrectionInput,
  AccountCashTransferCorrectionResult,
  AccountCashTransferCorrectionResponse,
  LiveCashTransferReview,
  AccountIncomeReceiptInput,
  AccountReinvestmentInput,
  AccountReinvestmentResult,
  AccountReinvestmentResponse,
  ReinvestmentCorrectionInput,
  ReinvestmentCorrectionResponse,
  ReinvestmentCorrectionResult,
  LiveReinvestmentReview,
  AccountIncomeReceiptResult,
  AccountIncomeReceiptCorrectionInput,
  AccountIncomeReceiptCorrectionResult,
  AccountCapitalCorrectionInput,
  AccountCapitalCorrectionResult,
  LiveCapitalOperationsPage,
  DraftSaleCorrectionInput,
  DraftAcquisitionCorrectionInput,
  LiveImportedExecutionCorrectionInput,
  LiveSaleCorrectionResult,
  LiveExecutionCorrectionResponse,
  ManualTradeVoidInput,
  ManualTradeVoidsPage,
  SplitStopLossReviewInput,
  SplitStopLossReviewResult,
  AccountSplitInput,
  AccountSplitResult,
  AccountSplitHistory,
  AccountSplitReversalInput,
  AccountSplitReversalResult,
} from '../types';
import { exchanges } from '../mock-portfolio';
import { getHoldingsForExchange } from '../mock-holdings';
import type { HoldingPosition } from '../types';
import {
  isRecord,
  mapCloseEventToClosedTrade,
  mapPositionToHolding,
  unwrapArray,
} from './mappers';

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

export async function fetchOpenPositionRecords(
  client: AxiosInstance,
  filters: { accountId?: string; exchangeCode?: string; status?: string }
): Promise<unknown[]> {
  const positions: unknown[] = [];
  const limit = 100;
  let page: unknown[];
  do {
    const response = await client.get('/positions', {
      params: {
        status: filters.status ?? 'OPEN,PARTIAL',
        limit,
        ...(positions.length ? { offset: positions.length } : {}),
        ...(filters.exchangeCode ? { exchangeCode: filters.exchangeCode } : {}),
        ...(filters.accountId ? { accountId: filters.accountId } : {}),
      },
    });
    page = unwrapArray<unknown>(response.data);
    positions.push(...page);
  } while (page.length === limit);
  return positions;
}

export function createPositionsApi(client: AxiosInstance) {
  return {
    async voidLiveManualTrade(
      accountId: string,
      transactionId: string,
      input: ManualTradeVoidInput
    ): Promise<LiveSaleCorrectionResult> {
      if (USE_MOCK_API)
        throw new Error('Audited trade voids require the real API.');
      const response = await client.post<LiveExecutionCorrectionResponse>(
        `/accounts/${encodeURIComponent(accountId)}/trades/${encodeURIComponent(transactionId)}/voids`,
        input
      );
      return response.data.data;
    },

    async getLiveManualTradeVoids(
      accountId: string,
      offset = 0
    ): Promise<ManualTradeVoidsPage> {
      if (USE_MOCK_API)
        throw new Error('Retained trade audits require the real API.');
      const response = await client.get<{
        success: boolean;
        data: ManualTradeVoidsPage;
      }>(`/accounts/${encodeURIComponent(accountId)}/trades/voids`, {
        params: { limit: 100, offset },
      });
      return response.data.data;
    },

    async postAccountTrade(
      accountId: string,
      input: AccountTradeInput
    ): Promise<AccountTradeResult> {
      if (USE_MOCK_API)
        throw new Error('Account trade posting requires the real API.');
      const response = await client.post<AccountTradeResponse>(
        `/accounts/${encodeURIComponent(accountId)}/trades`,
        input
      );
      return response.data.data;
    },

    async getAccountTradeCapability(
      accountId: string,
      effectiveDate: string
    ): Promise<AccountTradeCapability> {
      if (USE_MOCK_API)
        throw new Error('Trade capability requires the real API.');
      const response = await client.get<{
        success: boolean;
        data: AccountTradeCapability;
      }>(`/accounts/${encodeURIComponent(accountId)}/trade-capability`, {
        params: { effectiveDate },
      });
      return response.data.data;
    },

    async getLiveCashTransferReview(
      accountId: string,
      operationId: string
    ): Promise<LiveCashTransferReview> {
      if (USE_MOCK_API)
        throw new Error('Paired transfer review requires the real API.');
      const response = await client.get<{
        success: boolean;
        data: LiveCashTransferReview;
      }>(
        `/accounts/${encodeURIComponent(accountId)}/cash-transfers/${encodeURIComponent(operationId)}/corrections`
      );
      return response.data.data;
    },

    async correctLiveCashTransfer(
      accountId: string,
      operationId: string,
      input: AccountCashTransferCorrectionInput
    ): Promise<AccountCashTransferCorrectionResult> {
      if (USE_MOCK_API)
        throw new Error('Paired transfer revisions require the real API.');
      const response = await client.post<AccountCashTransferCorrectionResponse>(
        `/accounts/${encodeURIComponent(accountId)}/cash-transfers/${encodeURIComponent(operationId)}/corrections`,
        input
      );
      return response.data.data;
    },

    async postAccountCashTransfer(
      accountId: string,
      input: AccountCashTransferInput
    ): Promise<AccountCashTransferResult> {
      if (USE_MOCK_API)
        throw new Error('Paired cash transfers require the real API.');
      const response = await client.post<AccountCashTransferResponse>(
        `/accounts/${encodeURIComponent(accountId)}/cash-transfers`,
        input
      );
      return response.data.data;
    },

    async getLiveFxConversionReview(
      accountId: string,
      operationId: string
    ): Promise<LiveFxConversionReview> {
      if (USE_MOCK_API)
        throw new Error('FX revision review requires the real API.');
      const response = await client.get<{
        success: boolean;
        data: LiveFxConversionReview;
      }>(
        `/accounts/${encodeURIComponent(accountId)}/fx-conversions/${encodeURIComponent(operationId)}/corrections`
      );
      return response.data.data;
    },

    async correctLiveFxConversion(
      accountId: string,
      operationId: string,
      input: AccountFxCorrectionInput
    ): Promise<AccountFxCorrectionResult> {
      if (USE_MOCK_API) throw new Error('FX corrections require the real API.');
      const response = await client.post<AccountFxCorrectionResponse>(
        `/accounts/${encodeURIComponent(accountId)}/fx-conversions/${encodeURIComponent(operationId)}/corrections`,
        input
      );
      return response.data.data;
    },

    async postAccountFxConversion(
      accountId: string,
      input: AccountFxConversionInput
    ): Promise<AccountFxConversionResult> {
      if (USE_MOCK_API)
        throw new Error('Explicit FX conversions require the real API.');
      const response = await client.post<AccountFxConversionResponse>(
        `/accounts/${encodeURIComponent(accountId)}/fx-conversions`,
        input
      );
      return response.data.data;
    },

    async postAccountCapitalFlow(
      accountId: string,
      input: AccountCapitalFlowInput
    ): Promise<AccountCapitalFlowResult> {
      if (USE_MOCK_API)
        throw new Error('Live cash operations require the real API.');
      const response = await client.post<{
        success: boolean;
        data: AccountCapitalFlowResult;
      }>(`/accounts/${encodeURIComponent(accountId)}/cash-operations`, input);
      return response.data.data;
    },

    async postAccountIncomeReceipt(
      accountId: string,
      input: AccountIncomeReceiptInput
    ): Promise<AccountIncomeReceiptResult> {
      if (USE_MOCK_API)
        throw new Error('Income receipts require the real API.');
      const response = await client.post<{
        success: boolean;
        data: AccountIncomeReceiptResult;
      }>(`/accounts/${encodeURIComponent(accountId)}/income-receipts`, input);
      return response.data.data;
    },

    async postAccountReinvestment(
      accountId: string,
      input: AccountReinvestmentInput
    ): Promise<AccountReinvestmentResult> {
      if (USE_MOCK_API)
        throw new Error('Dividend reinvestment requires the real API.');
      const response = await client.post<AccountReinvestmentResponse>(
        `/accounts/${encodeURIComponent(accountId)}/reinvestments`,
        input
      );
      return response.data.data;
    },

    async getLiveReinvestmentReview(
      accountId: string,
      operationId: string
    ): Promise<LiveReinvestmentReview> {
      if (USE_MOCK_API)
        throw new Error('Reinvestment review requires the real API.');
      const response = await client.get<{
        success: boolean;
        data: LiveReinvestmentReview;
      }>(
        `/accounts/${encodeURIComponent(accountId)}/reinvestments/${encodeURIComponent(operationId)}/corrections`
      );
      return response.data.data;
    },

    async correctLiveReinvestment(
      accountId: string,
      operationId: string,
      input: ReinvestmentCorrectionInput
    ): Promise<ReinvestmentCorrectionResult> {
      if (USE_MOCK_API)
        throw new Error('Reinvestment revisions require the real API.');
      const response = await client.post<ReinvestmentCorrectionResponse>(
        `/accounts/${encodeURIComponent(accountId)}/reinvestments/${encodeURIComponent(operationId)}/corrections`,
        input
      );
      return response.data.data;
    },

    async correctLiveIncomeReceipt(
      accountId: string,
      operationId: string,
      input: AccountIncomeReceiptCorrectionInput
    ): Promise<AccountIncomeReceiptCorrectionResult> {
      if (USE_MOCK_API)
        throw new Error('Income receipt corrections require the real API.');
      const response = await client.post<{
        success: boolean;
        data: AccountIncomeReceiptCorrectionResult;
      }>(
        `/accounts/${encodeURIComponent(accountId)}/income-receipts/${encodeURIComponent(operationId)}/corrections`,
        input
      );
      return response.data.data;
    },

    async getLiveCapitalOperations(
      accountId: string,
      offset = 0
    ): Promise<LiveCapitalOperationsPage> {
      if (USE_MOCK_API)
        throw new Error('Live capital history requires the real API.');
      const response = await client.get<{
        success: boolean;
        data: LiveCapitalOperationsPage;
      }>(`/accounts/${encodeURIComponent(accountId)}/cash-operations`, {
        params: { limit: 100, offset },
      });
      return response.data.data;
    },

    async correctLiveCapitalOperation(
      accountId: string,
      operationId: string,
      input: AccountCapitalCorrectionInput
    ): Promise<AccountCapitalCorrectionResult> {
      if (USE_MOCK_API)
        throw new Error('Live capital corrections require the real API.');
      const response = await client.post<{
        success: boolean;
        data: AccountCapitalCorrectionResult;
      }>(
        `/accounts/${encodeURIComponent(accountId)}/cash-operations/${encodeURIComponent(operationId)}/corrections`,
        input
      );
      return response.data.data;
    },

    async correctLiveManualSale(
      accountId: string,
      transactionId: string,
      input: DraftSaleCorrectionInput
    ): Promise<LiveSaleCorrectionResult> {
      if (USE_MOCK_API)
        throw new Error('Live sale corrections require the real API.');
      const response = await client.post<{
        success: boolean;
        data: LiveSaleCorrectionResult;
      }>(
        `/accounts/${encodeURIComponent(accountId)}/trades/${encodeURIComponent(transactionId)}/corrections`,
        input
      );
      return response.data.data;
    },

    async correctLiveManualAcquisition(
      accountId: string,
      transactionId: string,
      input: DraftAcquisitionCorrectionInput
    ): Promise<LiveSaleCorrectionResult> {
      if (USE_MOCK_API)
        throw new Error('Live acquisition corrections require the real API.');
      const response = await client.post<LiveExecutionCorrectionResponse>(
        `/accounts/${encodeURIComponent(accountId)}/trades/${encodeURIComponent(transactionId)}/acquisition-corrections`,
        input
      );
      return response.data.data;
    },

    async correctLiveImportedExecution(
      accountId: string,
      eventId: string,
      input: LiveImportedExecutionCorrectionInput
    ): Promise<LiveSaleCorrectionResult> {
      if (USE_MOCK_API)
        throw new Error('Imported execution corrections require the real API.');
      const response = await client.post<LiveExecutionCorrectionResponse>(
        `/accounts/${encodeURIComponent(accountId)}/imported-executions/${encodeURIComponent(eventId)}/corrections`,
        input
      );
      return response.data.data;
    },

    async createPosition(payload: {
      symbol: string;
      assetType?: AssetType;
      exchangeCode: string;
      accountId?: string;
      accountName?: string;
      openDate: string;
      entryPrice: number;
      quantity: number;
      buyFees?: number;
      assetName?: string;
      industry?: string;
      stopLossPrice?: number | null;
      notes?: string;
    }): Promise<void> {
      if (USE_MOCK_API) {
        // No-op success — mirrors the account-mutation mock stubs; positions
        // created in mock mode are not persisted (mock-holdings.ts is a
        // static fixture, not a writable store).
        return;
      }

      const quantity = Number(payload.quantity) || 0;
      const entryPrice = Number(payload.entryPrice) || 0;
      const buyFees = Number(payload.buyFees) || 0;

      await client.post('/positions', {
        symbol: payload.symbol.trim().toUpperCase(),
        ...(payload.assetType ? { assetType: payload.assetType } : {}),
        exchangeCode: payload.exchangeCode.trim().toUpperCase(),
        accountId: payload.accountId,
        accountName: payload.accountName?.trim() || undefined,
        assetName: payload.assetName?.trim() || undefined,
        industry: payload.industry?.trim() || undefined,
        openDate: payload.openDate,
        entryPrice,
        quantity,
        buyFees,
        capitalAllocated: entryPrice * quantity + buyFees,
        ...(typeof payload.stopLossPrice === 'number' &&
        payload.stopLossPrice > 0
          ? { stopLossPrice: payload.stopLossPrice }
          : {}),
        ...(payload.notes?.trim() ? { openReason: payload.notes.trim() } : {}),
      });
    },

    async updatePosition(
      id: string,
      payload: {
        symbol?: string;
        exchangeCode?: string;
        accountId?: string;
        accountName?: string;
        openDate?: string;
        entryPrice?: number;
        quantity?: number;
        buyFees?: number;
        assetName?: string;
        industry?: string;
        stopLossPrice?: number | null;
        takeProfitPrice?: number | null;
        notes?: string;
        openReason?: string | null;
        currentPrice?: number;
        maxDrawdownPercent?: number | null;
        maxRunUpPercent?: number | null;
      }
    ) {
      if (USE_MOCK_API) {
        return { success: true };
      }

      const response = await client.patch(`/positions/${id}`, {
        ...payload,
        symbol: payload.symbol?.trim().toUpperCase(),
        exchangeCode: payload.exchangeCode?.trim().toUpperCase(),
        accountName: payload.accountName?.trim() || undefined,
        assetName: payload.assetName?.trim() || undefined,
        industry: payload.industry?.trim() || undefined,
        notes: payload.notes?.trim() || undefined,
        openReason:
          payload.openReason === null
            ? null
            : payload.openReason?.trim() || undefined,
        quantity:
          payload.quantity !== undefined ? Number(payload.quantity) : undefined,
        entryPrice:
          payload.entryPrice !== undefined
            ? Number(payload.entryPrice)
            : undefined,
        buyFees:
          payload.buyFees !== undefined ? Number(payload.buyFees) : undefined,
        currentPrice:
          payload.currentPrice !== undefined
            ? Number(payload.currentPrice)
            : undefined,
        maxDrawdownPercent:
          payload.maxDrawdownPercent !== undefined
            ? payload.maxDrawdownPercent === null
              ? null
              : Number(payload.maxDrawdownPercent)
            : undefined,
        maxRunUpPercent:
          payload.maxRunUpPercent !== undefined
            ? payload.maxRunUpPercent === null
              ? null
              : Number(payload.maxRunUpPercent)
            : undefined,
      });
      return response.data;
    },

    async recalculateDrawdown(id: string): Promise<{
      maxDrawdownPercent: number | null;
      maxRunUpPercent: number | null;
      message: string;
    }> {
      if (USE_MOCK_API) {
        return {
          maxDrawdownPercent: null,
          maxRunUpPercent: null,
          message: 'Not implemented in mock mode',
        };
      }
      const response = await client.post(
        `/positions/${id}/recalculate-drawdown`
      );
      return response.data;
    },

    async checkStopLoss(
      id: string,
      currentPrice?: number
    ): Promise<{ stopLossHitAt: string | null }> {
      if (USE_MOCK_API) return { stopLossHitAt: null };
      const response = await client.post(
        `/positions/${id}/check-stop-loss`,
        currentPrice !== undefined ? { currentPrice } : {}
      );
      return { stopLossHitAt: response.data?.stopLossHitAt ?? null };
    },

    async reviewSplitAffectedStopLoss(
      id: string,
      input: SplitStopLossReviewInput
    ): Promise<SplitStopLossReviewResult> {
      if (USE_MOCK_API)
        return {
          stopLossPrice: input.stopLossPrice,
          stopLossSetAt: new Date().toISOString(),
        };
      const response = await client.post<{
        success: boolean;
        data: SplitStopLossReviewResult;
      }>(`/positions/${encodeURIComponent(id)}/stop-loss-review`, input);
      return response.data.data;
    },

    async postAccountSplit(
      accountId: string,
      input: AccountSplitInput
    ): Promise<AccountSplitResult> {
      if (USE_MOCK_API)
        throw new Error('Stock split posting requires the real API.');
      const response = await client.post<{
        success: boolean;
        data: AccountSplitResult;
      }>(`/accounts/${encodeURIComponent(accountId)}/splits`, input);
      return response.data.data;
    },

    async getAccountSplitHistory(
      accountId: string,
      limit = 100,
      offset = 0
    ): Promise<AccountSplitHistory> {
      if (USE_MOCK_API)
        throw new Error('Stock split history requires the real API.');
      const response = await client.get<{
        success: boolean;
        data: AccountSplitHistory;
      }>(`/accounts/${encodeURIComponent(accountId)}/splits`, {
        params: { limit, offset },
      });
      return response.data.data;
    },

    async reverseAccountSplit(
      accountId: string,
      actionId: string,
      input: AccountSplitReversalInput
    ): Promise<AccountSplitReversalResult> {
      if (USE_MOCK_API)
        throw new Error('Stock split reversal requires the real API.');
      const response = await client.post<{
        success: boolean;
        data: AccountSplitReversalResult;
      }>(
        `/accounts/${encodeURIComponent(accountId)}/splits/${encodeURIComponent(actionId)}/reversal`,
        input
      );
      return response.data.data;
    },

    // Holdings methods
    async getHoldings(
      exchangeName?: string,
      accountId?: string
    ): Promise<HoldingPosition[]> {
      if (USE_MOCK_API) {
        await new Promise(resolve => setTimeout(resolve, 300));
        if (exchangeName) {
          return getHoldingsForExchange(exchangeName);
        }

        return exchanges.flatMap(exchange =>
          getHoldingsForExchange(exchange.name)
        );
      }
      const positions = await fetchOpenPositionRecords(client, {
        exchangeCode: exchangeName,
        accountId,
      });
      return positions
        .map(mapPositionToHolding)
        .filter((h): h is HoldingPosition => h !== null);
    },

    async getIncomeEligibleAssets(
      accountId: string
    ): Promise<HoldingPosition[]> {
      if (USE_MOCK_API)
        throw new Error('Income asset history requires the real API.');
      const positions = await fetchOpenPositionRecords(client, {
        accountId,
        status: 'OPEN,PARTIAL,CLOSED',
      });
      return positions
        .map(mapPositionToHolding)
        .filter(
          (holding): holding is HoldingPosition =>
            holding !== null &&
            Boolean(holding.assetId) &&
            (holding.assetType === 'EQUITY' || holding.assetType === 'ETF')
        );
    },

    async getClosedPositions(
      params: ClosedTradesQuery = {}
    ): Promise<ClosedTradesPage> {
      if (USE_MOCK_API) {
        // Not implemented in mock mode — mock-holdings.ts has no closed-trade
        // fixtures yet; the History page will show "no closed positions".
        return { trades: [], total: 0 };
      }

      const response = await client.get('/positions/close-events', {
        params: {
          ...(params.accountId ? { accountId: params.accountId } : {}),
          ...(params.dateFrom ? { dateFrom: params.dateFrom } : {}),
          ...(params.dateTo ? { dateTo: params.dateTo } : {}),
          ...(params.limit !== undefined ? { limit: params.limit } : {}),
          ...(params.offset !== undefined ? { offset: params.offset } : {}),
        },
      });

      const trades = unwrapArray<unknown>(response.data)
        .map(mapCloseEventToClosedTrade)
        .filter((t): t is ClosedTrade => t !== null);

      const meta = isRecord(response.data) ? response.data.meta : undefined;
      const total =
        isRecord(meta) && typeof meta.total === 'number'
          ? meta.total
          : trades.length;

      return { trades, total };
    },

    async updateCloseEvent(
      id: string,
      data: {
        closeDate?: string;
        exitPrice?: number;
        sellFees?: number;
        notes?: string;
        closeReason?: CloseReason | null;
      }
    ) {
      if (USE_MOCK_API) {
        return { success: true };
      }

      const normalizedNotes = data.notes?.trim();
      const response = await client.patch(`/positions/close-events/${id}`, {
        ...data,
        ...(data.notes !== undefined
          ? { notes: normalizedNotes || undefined }
          : {}),
      });
      return response.data;
    },

    async closePosition(
      id: string,
      closeDate: string,
      exitPrice: number,
      quantity?: number,
      fees?: number,
      notes?: string,
      closeReason?: CloseReason
    ) {
      if (USE_MOCK_API) {
        return { success: true };
      }

      const normalizedNotes = notes?.trim();
      const response = await client.post(`/positions/${id}/close`, {
        closeDate,
        exitPrice,
        ...(quantity !== undefined && { quantity }),
        ...(fees !== undefined && { fees }),
        ...(normalizedNotes ? { notes: normalizedNotes } : {}),
        ...(closeReason ? { closeReason } : {}),
      });
      return response.data;
    },

    async deletePosition(id: string) {
      if (USE_MOCK_API) {
        return { success: true };
      }

      const response = await client.delete(`/positions/${id}`);
      return response.data;
    },
  };
}
