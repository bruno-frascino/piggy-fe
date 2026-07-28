import { AxiosInstance } from 'axios';
import { exchanges } from '../mock-portfolio';
import type { EquityPoint, ExchangePortfolio } from '../types';
import { isRecord, mapSnapshotToEquityPoint, unwrapArray } from './mappers';

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

function aggregateMockPortfolioSeries(): EquityPoint[] {
  const dateTotals = new Map<string, number>();
  for (const exchange of exchanges) {
    for (const point of exchange.equitySeries) {
      dateTotals.set(
        point.date,
        (dateTotals.get(point.date) ?? 0) + point.equity
      );
    }
  }

  return Array.from(dateTotals.entries())
    .sort((a, b) => a[0].localeCompare(b[0]))
    .map(([date, equity]) => ({
      date,
      equity: Number(equity.toFixed(2)),
    }));
}

export function createPortfolioApi(client: AxiosInstance) {
  return {
    // User portfolio methods (exchanges the user actually has)
    async getUserPortfolio(accountId?: string): Promise<ExchangePortfolio[]> {
      if (USE_MOCK_API) {
        await new Promise(resolve => setTimeout(resolve, 300));
        return exchanges;
      }

      const response = await client.get('/positions', {
        params: {
          status: 'OPEN',
          limit: 100,
          ...(accountId ? { accountId } : {}),
        },
      });

      const positions = unwrapArray<unknown>(response.data);
      const exchangeMap = new Map<
        string,
        {
          types: Set<string>;
          currency: string;
          points: Map<string, number>;
          totalCurrent: number;
        }
      >();

      for (const pos of positions) {
        if (!isRecord(pos)) continue;
        const asset = isRecord(pos.asset) ? pos.asset : null;
        if (!asset) continue;
        const exch = isRecord(asset.exchange) ? asset.exchange : null;
        if (!exch) continue;

        const code =
          (typeof exch.code === 'string' && exch.code) ||
          (typeof exch.name === 'string' && exch.name) ||
          null;
        if (!code) continue;

        if (!exchangeMap.has(code)) {
          const currency =
            typeof exch.currency === 'string' ? exch.currency : 'USD';
          exchangeMap.set(code, {
            types: new Set(),
            currency,
            points: new Map<string, number>(),
            totalCurrent: 0,
          });
        }

        const entry = exchangeMap.get(code)!;

        if (typeof asset.assetType === 'string') {
          entry.types.add(asset.assetType);
        }

        const rawOpenDate = pos.openDate;
        const openDate =
          typeof rawOpenDate === 'string'
            ? rawOpenDate.slice(0, 10)
            : rawOpenDate instanceof Date
              ? rawOpenDate.toISOString().slice(0, 10)
              : null;

        const invested = Number(pos.capitalAllocated) || 0;
        const unrealized = Number(pos.unrealizedPnL) || 0;
        const currentValue = invested + unrealized;

        if (openDate) {
          entry.points.set(
            openDate,
            (entry.points.get(openDate) ?? 0) + invested
          );
        }
        entry.totalCurrent += currentValue;
      }

      return Array.from(exchangeMap.entries()).map(([code, meta]) => {
        const hasCrypto = meta.types.has('CRYPTO');
        const hasStocks = meta.types.has('EQUITY') || meta.types.has('ETF');
        const type: ExchangePortfolio['type'] =
          hasCrypto && hasStocks ? 'mixed' : hasCrypto ? 'crypto' : 'stocks';

        const sortedDates = Array.from(meta.points.keys()).sort((a, b) =>
          a.localeCompare(b)
        );
        let running = 0;
        const equitySeries: EquityPoint[] = sortedDates.map(date => {
          running += meta.points.get(date) ?? 0;
          return {
            date,
            equity: Number(running.toFixed(2)),
          };
        });

        const today = new Date().toISOString().slice(0, 10);
        const currentPoint = {
          date: today,
          equity: Number(meta.totalCurrent.toFixed(2)),
        };
        if (
          equitySeries.length &&
          equitySeries[equitySeries.length - 1].date === today
        ) {
          equitySeries[equitySeries.length - 1] = currentPoint;
        } else {
          equitySeries.push(currentPoint);
        }

        return {
          name: code,
          equitySeries,
          type,
          baseCurrency: meta.currency,
        };
      });
    },

    async getPortfolioHistory(
      accountId?: string,
      exchangeCode?: string
    ): Promise<EquityPoint[]> {
      if (USE_MOCK_API) {
        await new Promise(resolve => setTimeout(resolve, 250));
        return aggregateMockPortfolioSeries();
      }

      if (!accountId || !exchangeCode) {
        return [];
      }

      const response = await client.get('/portfolio/history', {
        params: { accountId, exchangeCode },
      });
      return unwrapArray<unknown>(response.data)
        .map(mapSnapshotToEquityPoint)
        .filter((p): p is EquityPoint => p !== null);
    },

    async createPortfolioSnapshot(
      accountId?: string,
      exchangeCode?: string
    ): Promise<EquityPoint | null> {
      if (USE_MOCK_API) {
        // In mock mode the series is generated in-memory.
        return null;
      }

      if (!accountId || !exchangeCode) {
        return null;
      }

      const response = await client.post('/portfolio/snapshot', {
        accountId,
        exchangeCode,
      });
      return mapSnapshotToEquityPoint(
        isRecord(response.data) ? response.data.data : null
      );
    },
  };
}
