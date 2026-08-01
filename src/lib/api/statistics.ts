import { AxiosInstance } from 'axios';
import type {
  StatisticsBreakdownsResponse,
  StatisticsBreakdownBy,
  StatisticsBreakdownMetric,
  StatisticsClosedTradesSortBy,
  StatisticsClosedTradesSortDir,
  StatisticsClosedTradeRow,
  StatisticsClosedTradesResponse,
  StatisticsDistributions,
  StatisticsFilters,
  StatisticsRisk,
  StatisticsSummary,
  StatisticsTimeSeries,
} from '../types';
import { isRecord, unwrapArray } from './mappers';

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

type TimeSeriesMetric = 'equity' | 'totalPnL' | 'realizedPnL';
type TimeSeriesGranularity = 'day' | 'week' | 'month';

function toCsv(values: string[] | undefined): string | undefined {
  if (!values || values.length === 0) return undefined;
  return values.join(',');
}

function buildScopeParams(filters: StatisticsFilters) {
  return {
    ...(toCsv(filters.accountIds)
      ? { accountIds: toCsv(filters.accountIds) }
      : {}),
    ...(toCsv(filters.exchangeCodes)
      ? { exchangeCodes: toCsv(filters.exchangeCodes) }
      : {}),
    ...(toCsv(filters.assetTypes)
      ? { assetTypes: toCsv(filters.assetTypes) }
      : {}),
    ...(toCsv(filters.status) ? { status: toCsv(filters.status) } : {}),
    ...(filters.dateFrom ? { dateFrom: filters.dateFrom } : {}),
    ...(filters.dateTo ? { dateTo: filters.dateTo } : {}),
  };
}

function emptySummary(): StatisticsSummary {
  return {
    totalTrades: 0,
    winRate: 0,
    avgWin: 0,
    avgLoss: 0,
    profitFactor: null,
    expectancyPerTrade: 0,
    avgHoldingDays: null,
    realizedPnL: 0,
    unrealizedPnL: 0,
    totalPnL: 0,
    metricDefinitionVersion: 'stats-v1',
    asOf: new Date().toISOString(),
  };
}

function emptyDistributions(): StatisticsDistributions {
  return {
    returnPctHistogram: [],
    pnlHistogram: [],
    holdingDaysHistogram: [],
    sampleSize: 0,
  };
}

function emptyRisk(): StatisticsRisk {
  return {
    volatilityAnnualized: null,
    sharpeRatio: null,
    maxDrawdownPct: null,
    methodology: 'SNAPSHOT_RETURNS_V1',
    confidence: 'LOW',
    sampleSize: 0,
    fallbackReason: 'No samples',
  };
}

export function createStatisticsApi(client: AxiosInstance) {
  return {
    async getStatisticsSummary(
      filters: StatisticsFilters = {}
    ): Promise<StatisticsSummary> {
      if (USE_MOCK_API) {
        return emptySummary();
      }

      const response = await client.get('/statistics/summary', {
        params: buildScopeParams(filters),
      });
      const payload = isRecord(response.data) ? response.data.data : null;
      if (!isRecord(payload)) return emptySummary();

      return payload as unknown as StatisticsSummary;
    },

    async getStatisticsTimeSeries(params: {
      filters?: StatisticsFilters;
      metric: TimeSeriesMetric;
      granularity?: TimeSeriesGranularity;
    }): Promise<StatisticsTimeSeries> {
      if (USE_MOCK_API) {
        return {
          points: [],
          currency: 'USD',
          asOf: new Date().toISOString(),
        };
      }

      const response = await client.get('/statistics/timeseries', {
        params: {
          ...buildScopeParams(params.filters ?? {}),
          metric: params.metric,
          granularity: params.granularity ?? 'month',
        },
      });
      const payload = isRecord(response.data) ? response.data.data : null;
      if (!isRecord(payload)) {
        return {
          points: [],
          currency: 'USD',
          asOf: new Date().toISOString(),
        };
      }

      const points = unwrapArray<StatisticsTimeSeries['points'][number]>(
        payload.points
      );

      return {
        points,
        currency:
          typeof payload.currency === 'string' ? payload.currency : 'USD',
        asOf:
          typeof payload.asOf === 'string'
            ? payload.asOf
            : new Date().toISOString(),
      };
    },

    async getStatisticsClosedTrades(params: {
      filters?: StatisticsFilters;
      limit?: number;
      offset?: number;
      sortBy?: StatisticsClosedTradesSortBy;
      sortDir?: StatisticsClosedTradesSortDir;
    }): Promise<StatisticsClosedTradesResponse> {
      if (USE_MOCK_API) {
        return {
          rows: [],
          meta: {
            total: 0,
            limit: params.limit ?? 50,
            offset: params.offset ?? 0,
          },
        };
      }

      const response = await client.get('/statistics/closed-trades', {
        params: {
          ...buildScopeParams(params.filters ?? {}),
          limit: params.limit ?? 50,
          offset: params.offset ?? 0,
          sortBy: params.sortBy ?? 'closeDate',
          sortDir: params.sortDir ?? 'desc',
        },
      });

      const rows = unwrapArray<StatisticsClosedTradeRow>(
        isRecord(response.data) ? response.data.data : []
      );
      const metaSource =
        isRecord(response.data) && isRecord(response.data.meta)
          ? response.data.meta
          : null;

      return {
        rows,
        meta: {
          total: Number(metaSource?.total ?? rows.length),
          limit: Number(metaSource?.limit ?? params.limit ?? 50),
          offset: Number(metaSource?.offset ?? params.offset ?? 0),
        },
      };
    },

    async getStatisticsDistributions(
      filters: StatisticsFilters = {}
    ): Promise<StatisticsDistributions> {
      if (USE_MOCK_API) {
        return emptyDistributions();
      }

      const response = await client.get('/statistics/distributions', {
        params: buildScopeParams(filters),
      });
      const payload = isRecord(response.data) ? response.data.data : null;
      if (!isRecord(payload)) return emptyDistributions();

      return {
        returnPctHistogram: unwrapArray(payload.returnPctHistogram),
        pnlHistogram: unwrapArray(payload.pnlHistogram),
        holdingDaysHistogram: unwrapArray(payload.holdingDaysHistogram),
        sampleSize: Number(payload.sampleSize ?? 0),
      };
    },

    async getStatisticsRisk(
      filters: StatisticsFilters = {}
    ): Promise<StatisticsRisk> {
      if (USE_MOCK_API) {
        return emptyRisk();
      }

      const response = await client.get('/statistics/risk', {
        params: buildScopeParams(filters),
      });
      const payload = isRecord(response.data) ? response.data.data : null;
      if (!isRecord(payload)) return emptyRisk();

      return {
        volatilityAnnualized:
          payload.volatilityAnnualized == null
            ? null
            : Number(payload.volatilityAnnualized),
        sharpeRatio:
          payload.sharpeRatio == null ? null : Number(payload.sharpeRatio),
        maxDrawdownPct:
          payload.maxDrawdownPct == null
            ? null
            : Number(payload.maxDrawdownPct),
        methodology:
          payload.methodology === 'SNAPSHOT_RETURNS_V1'
            ? 'SNAPSHOT_RETURNS_V1'
            : 'SNAPSHOT_RETURNS_V1',
        confidence:
          payload.confidence === 'HIGH' || payload.confidence === 'MEDIUM'
            ? payload.confidence
            : 'LOW',
        sampleSize: Number(payload.sampleSize ?? 0),
        ...(typeof payload.fallbackReason === 'string'
          ? { fallbackReason: payload.fallbackReason }
          : {}),
      };
    },

    async getStatisticsBreakdowns(params: {
      filters?: StatisticsFilters;
      by: StatisticsBreakdownBy;
      metric: StatisticsBreakdownMetric;
    }): Promise<StatisticsBreakdownsResponse> {
      if (USE_MOCK_API) {
        return { rows: [], total: 0 };
      }

      const response = await client.get('/statistics/breakdowns', {
        params: {
          ...buildScopeParams(params.filters ?? {}),
          by: params.by,
          metric: params.metric,
        },
      });
      const payload = isRecord(response.data) ? response.data.data : null;
      if (!isRecord(payload)) return { rows: [], total: 0 };

      return {
        rows: unwrapArray(payload.rows),
        total: Number(payload.total ?? 0),
      };
    },
  };
}
