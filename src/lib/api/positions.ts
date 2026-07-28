import { AxiosInstance } from 'axios';
import type { ClosedTrade } from '../types';
import { exchanges } from '../mock-portfolio';
import { getHoldingsForExchange } from '../mock-holdings';
import type { HoldingPosition } from '../types';
import {
  mapCloseEventToClosedTrade,
  mapPositionToHolding,
  unwrapArray,
} from './mappers';

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

export function createPositionsApi(client: AxiosInstance) {
  return {
    async createPosition(payload: {
      symbol: string;
      exchangeCode: string;
      accountId?: string;
      accountName?: string;
      openDate: string;
      entryPrice: number;
      quantity: number;
      buyFees?: number;
      assetName?: string;
      industry?: string;
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
        currentPrice?: number;
        maxDrawdownPercent?: number | null;
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
      });
      return response.data;
    },

    async recalculateDrawdown(
      id: string
    ): Promise<{ maxDrawdownPercent: number | null; message: string }> {
      if (USE_MOCK_API) {
        return {
          maxDrawdownPercent: null,
          message: 'Not implemented in mock mode',
        };
      }
      const response = await client.post(
        `/positions/${id}/recalculate-drawdown`
      );
      return response.data;
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
      const response = await client.get('/positions', {
        params: {
          status: 'OPEN,PARTIAL',
          limit: 100,
          ...(exchangeName ? { exchangeCode: exchangeName } : {}),
          ...(accountId ? { accountId } : {}),
        },
      });
      return unwrapArray<unknown>(response.data)
        .map(mapPositionToHolding)
        .filter((h): h is HoldingPosition => h !== null);
    },

    async getClosedPositions(): Promise<ClosedTrade[]> {
      if (USE_MOCK_API) {
        // Not implemented in mock mode — mock-holdings.ts has no closed-trade
        // fixtures yet; the History page will show "no closed positions".
        return [];
      }

      const response = await client.get('/positions/close-events');
      return unwrapArray<unknown>(response.data)
        .map(mapCloseEventToClosedTrade)
        .filter((t): t is ClosedTrade => t !== null);
    },

    async updateCloseEvent(
      id: string,
      data: {
        closeDate?: string;
        exitPrice?: number;
        sellFees?: number;
        notes?: string;
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

    async deleteCloseEvent(id: string) {
      if (USE_MOCK_API) {
        return { success: true };
      }

      const response = await client.delete(`/positions/close-events/${id}`);
      return response.data;
    },

    async closePosition(
      id: string,
      closeDate: string,
      exitPrice: number,
      quantity?: number,
      fees?: number,
      notes?: string
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
