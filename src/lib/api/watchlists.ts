import { AxiosInstance } from 'axios';
import type {
  AddWatchlistItemPayload,
  Watchlist,
  WatchlistDetail,
  WatchlistItem,
} from '../types';
import { isRecord, unwrapArray } from './mappers';

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

function mapToWatchlist(row: unknown): Watchlist | null {
  if (!isRecord(row)) return null;
  const id = typeof row.id === 'string' ? row.id : null;
  const name = typeof row.name === 'string' ? row.name : null;
  if (!id || !name) return null;

  const count = isRecord(row._count) ? row._count.items : undefined;
  return {
    id,
    name,
    itemCount: typeof count === 'number' ? count : undefined,
    createdAt: typeof row.createdAt === 'string' ? row.createdAt : undefined,
    updatedAt: typeof row.updatedAt === 'string' ? row.updatedAt : undefined,
  };
}

function mapToWatchlistItem(row: unknown): WatchlistItem | null {
  if (!isRecord(row)) return null;
  const id = typeof row.id === 'string' ? row.id : null;
  const asset = isRecord(row.asset) ? row.asset : null;
  if (!id || !asset) return null;

  const symbol = typeof asset.symbol === 'string' ? asset.symbol : null;
  const name = typeof asset.name === 'string' ? asset.name : symbol;
  const exchange = isRecord(asset.exchange) ? asset.exchange.code : undefined;
  if (!symbol) return null;

  return {
    id,
    symbol,
    name: name ?? symbol,
    exchange: typeof exchange === 'string' ? exchange : '',
    assetType: typeof asset.assetType === 'string' ? asset.assetType : 'EQUITY',
    sector: typeof asset.sector === 'string' ? asset.sector : null,
    industry: typeof asset.industry === 'string' ? asset.industry : null,
    marketCap: typeof asset.marketCap === 'number' ? asset.marketCap : null,
    addedAt: typeof row.addedAt === 'string' ? row.addedAt : undefined,
  };
}

export function createWatchlistsApi(client: AxiosInstance) {
  return {
    async getWatchlists(): Promise<Watchlist[]> {
      if (USE_MOCK_API) return [];

      const response = await client.get('/watchlists');
      return unwrapArray<unknown>(response.data)
        .map(mapToWatchlist)
        .filter((w): w is Watchlist => w !== null);
    },

    async getWatchlist(id: string): Promise<WatchlistDetail | null> {
      if (USE_MOCK_API) return null;

      const response = await client.get(`/watchlists/${id}`);
      const payload = isRecord(response.data)
        ? response.data.data
        : response.data;
      if (!isRecord(payload)) return null;

      const base = mapToWatchlist(payload);
      if (!base) return null;

      const items = Array.isArray(payload.items)
        ? payload.items
            .map(mapToWatchlistItem)
            .filter((i): i is WatchlistItem => i !== null)
        : [];

      return { ...base, items };
    },

    async createWatchlist(name: string): Promise<Watchlist | null> {
      if (USE_MOCK_API) {
        return { id: `mock-${Date.now()}`, name, itemCount: 0 };
      }

      const response = await client.post('/watchlists', { name });
      const payload = isRecord(response.data)
        ? response.data.data
        : response.data;
      return mapToWatchlist(payload);
    },

    async renameWatchlist(id: string, name: string): Promise<Watchlist | null> {
      if (USE_MOCK_API) return { id, name };

      const response = await client.patch(`/watchlists/${id}`, { name });
      const payload = isRecord(response.data)
        ? response.data.data
        : response.data;
      return mapToWatchlist(payload);
    },

    async deleteWatchlist(id: string) {
      if (USE_MOCK_API) return { success: true };
      const response = await client.delete(`/watchlists/${id}`);
      return response.data;
    },

    async addWatchlistItem(
      watchlistId: string,
      item: AddWatchlistItemPayload
    ): Promise<WatchlistItem | null> {
      if (USE_MOCK_API) {
        return {
          id: `mock-item-${Date.now()}`,
          symbol: item.symbol,
          name: item.name ?? item.symbol,
          exchange: item.exchangeCode,
          assetType: item.assetType ?? 'EQUITY',
          sector: item.sector ?? null,
          industry: item.industry ?? null,
          marketCap: item.marketCap ?? null,
        };
      }

      const response = await client.post(
        `/watchlists/${watchlistId}/items`,
        item
      );
      const payload = isRecord(response.data)
        ? response.data.data
        : response.data;
      return mapToWatchlistItem(payload);
    },

    async removeWatchlistItem(watchlistId: string, itemId: string) {
      if (USE_MOCK_API) return { success: true };
      const response = await client.delete(
        `/watchlists/${watchlistId}/items/${itemId}`
      );
      return response.data;
    },
  };
}
