'use client';

import { useMemo, useState } from 'react';
import { Card } from 'primereact/card';
import { Calendar } from 'primereact/calendar';
import { MultiSelect } from 'primereact/multiselect';
import { DataTable } from 'primereact/datatable';
import { Column } from 'primereact/column';
import { Button } from 'primereact/button';
import { Dialog } from 'primereact/dialog';
import { Bar, Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import type {
  StatisticsBreakdownRow,
  StatisticsClosedTradeRow,
  StatisticsClosedTradesSortBy,
  StatisticsClosedTradesSortDir,
  StatisticsFilters,
} from '@/lib/types';
import {
  useStatisticsBreakdowns,
  useStatisticsClosedTrades,
  useStatisticsDistributions,
  useStatisticsRisk,
  useStatisticsSummary,
  useStatisticsTimeSeries,
  useTradingAccounts,
} from '@/hooks/api';
import PageHeader from '@/components/PageHeader';
import { formatDateDDMMYYYY, toLocalDateString } from '@/lib/date';
import { formatCurrency, formatPct, returnClass } from '@/lib/format';

type DateValue = Date | null;
type DatePreset = '90D' | 'YTD' | '12M' | 'CUSTOM';

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Filler
);

function formatSignedPctValue(v: number): string {
  return `${v >= 0 ? '+' : ''}${v.toFixed(2)}%`;
}

function formatDeltaNumber(delta: number): string {
  return `${delta >= 0 ? '+' : ''}${delta.toFixed(2)}`;
}

function buildPreviousFilters(
  filters: StatisticsFilters
): StatisticsFilters | null {
  if (!filters.dateFrom || !filters.dateTo) return null;
  const from = new Date(`${filters.dateFrom}T00:00:00.000Z`);
  const to = new Date(`${filters.dateTo}T00:00:00.000Z`);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    return null;
  }

  const periodMs = to.getTime() - from.getTime() + 86_400_000;
  const prevTo = new Date(from.getTime() - 86_400_000);
  const prevFrom = new Date(prevTo.getTime() - periodMs + 86_400_000);

  return {
    ...filters,
    dateFrom: toLocalDateString(prevFrom),
    dateTo: toLocalDateString(prevTo),
  };
}

function mergeSeries(
  current: Array<{ bucketEnd: string; value: number }>,
  previous: Array<{ bucketEnd: string; value: number }> | undefined
): {
  labels: string[];
  currentValues: Array<number | null>;
  previousValues: Array<number | null>;
} {
  const labelSet = new Set<string>([
    ...current.map(point => point.bucketEnd),
    ...(previous ?? []).map(point => point.bucketEnd),
  ]);
  const labels = Array.from(labelSet).sort();

  const currentMap = new Map(
    current.map(point => [point.bucketEnd, point.value])
  );
  const previousMap = new Map(
    (previous ?? []).map(point => [point.bucketEnd, point.value])
  );

  return {
    labels,
    currentValues: labels.map(label => currentMap.get(label) ?? null),
    previousValues: labels.map(label => previousMap.get(label) ?? null),
  };
}

function esc(value: string): string {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function sortDirectionForHeader(
  activeBy: StatisticsClosedTradesSortBy,
  activeDir: StatisticsClosedTradesSortDir,
  headerBy: StatisticsClosedTradesSortBy
): string {
  if (activeBy !== headerBy) return '';
  return activeDir === 'asc' ? ' ▲' : ' ▼';
}

function BreakdownList({ rows }: { rows: StatisticsBreakdownRow[] }) {
  if (rows.length === 0) {
    return (
      <p className='text-sm' style={{ color: 'var(--tr-text-2)' }}>
        No breakdown data for this scope.
      </p>
    );
  }

  return (
    <div className='space-y-3'>
      {rows.slice(0, 6).map(row => {
        const width = Math.min(Math.abs(row.weight) * 100, 100);
        return (
          <div key={row.key}>
            <div className='flex items-center justify-between text-sm mb-1'>
              <span style={{ color: 'var(--tr-text)' }}>{row.label}</span>
              <span className={returnClass(row.value)}>
                {formatCurrency(row.value)}
              </span>
            </div>
            <div
              className='h-2 rounded-full overflow-hidden'
              style={{ background: 'var(--tr-muted)' }}
            >
              <div
                className='h-full rounded-full'
                style={{
                  width: `${width}%`,
                  background: 'var(--tr-brand)',
                }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function StatisticsView() {
  const now = new Date();
  const defaultEnd = toLocalDateString(now);
  const defaultStart = toLocalDateString(
    new Date(now.getFullYear() - 1, now.getMonth(), now.getDate())
  );

  const [fromDate, setFromDate] = useState<DateValue>(new Date(defaultStart));
  const [toDate, setToDate] = useState<DateValue>(new Date(defaultEnd));
  const [activePreset, setActivePreset] = useState<DatePreset>('12M');
  const [selectedAccountIds, setSelectedAccountIds] = useState<string[]>([]);
  const [sortBy, setSortBy] =
    useState<StatisticsClosedTradesSortBy>('closeDate');
  const [sortDir, setSortDir] = useState<StatisticsClosedTradesSortDir>('desc');
  const [pageFirst, setPageFirst] = useState(0);
  const [pageRows, setPageRows] = useState(25);
  const [compareMode, setCompareMode] = useState(false);
  const [selectedTrade, setSelectedTrade] =
    useState<StatisticsClosedTradeRow | null>(null);
  const [distributionMetric, setDistributionMetric] = useState<
    'pnl' | 'returnPct' | 'holdingDays'
  >('pnl');

  const { data: accounts = [] } = useTradingAccounts(true);

  const filters = useMemo(
    () => ({
      accountIds:
        selectedAccountIds.length > 0 ? selectedAccountIds : undefined,
      dateFrom: fromDate ? toLocalDateString(fromDate) : undefined,
      dateTo: toDate ? toLocalDateString(toDate) : undefined,
    }),
    [selectedAccountIds, fromDate, toDate]
  );

  const { data: summary, isLoading: summaryLoading } =
    useStatisticsSummary(filters);
  const { data: risk, isLoading: riskLoading } = useStatisticsRisk(filters);
  const { data: distributions } = useStatisticsDistributions(filters);
  const { data: equitySeries, isLoading: equitySeriesLoading } =
    useStatisticsTimeSeries({
      filters,
      metric: 'equity',
      granularity: 'month',
    });
  const { data: realizedSeries, isLoading: realizedSeriesLoading } =
    useStatisticsTimeSeries({
      filters,
      metric: 'realizedPnL',
      granularity: 'month',
    });

  const previousFilters = useMemo(
    () => buildPreviousFilters(filters),
    [filters]
  );
  const compareEnabled = compareMode && previousFilters !== null;

  const { data: previousSummary } = useStatisticsSummary(
    previousFilters ?? {},
    { enabled: compareEnabled }
  );
  const { data: previousRisk } = useStatisticsRisk(previousFilters ?? {}, {
    enabled: compareEnabled,
  });
  const { data: previousEquitySeries } = useStatisticsTimeSeries({
    filters: previousFilters ?? {},
    metric: 'equity',
    granularity: 'month',
    enabled: compareEnabled,
  });
  const { data: previousRealizedSeries } = useStatisticsTimeSeries({
    filters: previousFilters ?? {},
    metric: 'realizedPnL',
    granularity: 'month',
    enabled: compareEnabled,
  });
  const { data: breakdowns } = useStatisticsBreakdowns({
    filters,
    by: 'assetType',
    metric: 'marketValue',
  });
  const { data: closedTrades, isLoading: closedTradesLoading } =
    useStatisticsClosedTrades({
      filters,
      limit: pageRows,
      offset: pageFirst,
      sortBy,
      sortDir,
    });

  const closedTradeRows = closedTrades?.rows ?? [];

  const selectedTradeIndex = useMemo(() => {
    if (!selectedTrade) return -1;
    return closedTradeRows.findIndex(row => row.id === selectedTrade.id);
  }, [closedTradeRows, selectedTrade]);

  const canGoToPreviousTrade = selectedTradeIndex > 0;
  const canGoToNextTrade =
    selectedTradeIndex >= 0 && selectedTradeIndex < closedTradeRows.length - 1;

  const selectNeighborTrade = (delta: -1 | 1) => {
    if (selectedTradeIndex < 0) return;
    const nextIndex = selectedTradeIndex + delta;
    if (nextIndex < 0 || nextIndex >= closedTradeRows.length) return;
    setSelectedTrade(closedTradeRows[nextIndex] ?? null);
  };

  const accountOptions = useMemo(
    () => accounts.map(acc => ({ label: acc.name, value: acc.id })),
    [accounts]
  );

  const selectedAccountNames = useMemo(() => {
    if (selectedAccountIds.length === 0) return 'All accounts';
    const names = selectedAccountIds
      .map(id => accounts.find(acc => acc.id === id)?.name ?? id)
      .join(', ');
    return names || 'All accounts';
  }, [selectedAccountIds, accounts]);

  const handleSort = (nextSortBy: StatisticsClosedTradesSortBy) => {
    if (sortBy !== nextSortBy) {
      setSortBy(nextSortBy);
      setSortDir('desc');
      setPageFirst(0);
      return;
    }
    setSortDir(prev => (prev === 'desc' ? 'asc' : 'desc'));
    setPageFirst(0);
  };

  const applyPreset = (preset: Exclude<DatePreset, 'CUSTOM'>) => {
    const end = new Date();
    let start: Date;

    if (preset === '90D') {
      start = new Date(end.getTime() - 89 * 86_400_000);
    } else if (preset === 'YTD') {
      start = new Date(end.getFullYear(), 0, 1);
    } else {
      start = new Date(end.getFullYear() - 1, end.getMonth(), end.getDate());
    }

    setFromDate(start);
    setToDate(end);
    setActivePreset(preset);
    setPageFirst(0);
  };

  const periodLabel = compareEnabled
    ? `Comparing ${formatDateDDMMYYYY(previousFilters?.dateFrom ?? '')}..${formatDateDDMMYYYY(previousFilters?.dateTo ?? '')} against current period`
    : null;

  const handleExportSnapshot = () => {
    const openedAt = new Date();
    const openedAtLabel = `${formatDateDDMMYYYY(openedAt)} ${openedAt.toLocaleTimeString()}`;
    const fromLabel = fromDate ? formatDateDDMMYYYY(fromDate) : 'N/A';
    const toLabel = toDate ? formatDateDDMMYYYY(toDate) : 'N/A';

    const rows = (closedTrades?.rows ?? [])
      .map(
        row => `
          <tr>
            <td>${esc(formatDateDDMMYYYY(row.closeDate))}</td>
            <td>${esc(row.symbol)}</td>
            <td>${esc(formatCurrency(row.pnl))}</td>
            <td>${esc(formatSignedPctValue(row.returnPct))}</td>
            <td>${row.holdingDays}</td>
          </tr>
        `
      )
      .join('');

    const html = `
      <!doctype html>
      <html>
        <head>
          <meta charset="utf-8" />
          <title>Statistics Snapshot</title>
          <style>
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; margin: 24px; color: #0f172a; }
            h1 { margin: 0 0 8px; font-size: 24px; }
            .meta { color: #475569; font-size: 12px; margin-bottom: 20px; }
            .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin-bottom: 16px; }
            .card { border: 1px solid #cbd5e1; border-radius: 8px; padding: 10px 12px; }
            .label { color: #64748b; font-size: 12px; }
            .value { font-weight: 700; font-size: 18px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; font-size: 12px; }
            th { background: #f8fafc; }
          </style>
        </head>
        <body>
          <h1>Statistics Snapshot</h1>
          <div class="meta">Exported ${esc(openedAtLabel)} · Range ${esc(fromLabel)} to ${esc(toLabel)} · ${esc(selectedAccountNames)}</div>
          <div class="grid">
            <div class="card"><div class="label">Total P/L</div><div class="value">${esc(formatCurrency(summary?.totalPnL ?? 0))}</div></div>
            <div class="card"><div class="label">Win Rate</div><div class="value">${esc(formatPct(summary?.winRate ?? 0))}</div></div>
            <div class="card"><div class="label">Sharpe Ratio</div><div class="value">${esc(risk?.sharpeRatio == null ? 'N/A' : risk.sharpeRatio.toFixed(2))}</div></div>
            <div class="card"><div class="label">Max Drawdown</div><div class="value">${esc(risk?.maxDrawdownPct == null ? 'N/A' : `-${risk.maxDrawdownPct.toFixed(2)}%`)}</div></div>
          </div>
          <h2 style="font-size:16px; margin: 0 0 6px;">Closed Trades (Current Page)</h2>
          <table>
            <thead>
              <tr>
                <th>Close Date</th>
                <th>Symbol</th>
                <th>P/L</th>
                <th>Return %</th>
                <th>Holding Days</th>
              </tr>
            </thead>
            <tbody>${rows || '<tr><td colspan="5">No rows</td></tr>'}</tbody>
          </table>
        </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'noopener,noreferrer');
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  };

  const equityChartData = useMemo(() => {
    const merged = mergeSeries(
      equitySeries?.points ?? [],
      previousEquitySeries?.points
    );
    return {
      labels: merged.labels.map(label => formatDateDDMMYYYY(label)),
      datasets: [
        {
          label: 'Current Equity',
          data: merged.currentValues,
          borderColor: '#2563eb',
          backgroundColor: 'rgba(37, 99, 235, 0.15)',
          pointRadius: 2,
          tension: 0.35,
          fill: true,
        },
        ...(compareEnabled
          ? [
              {
                label: 'Previous Equity',
                data: merged.previousValues,
                borderColor: '#94a3b8',
                backgroundColor: 'rgba(148, 163, 184, 0.08)',
                borderDash: [6, 4],
                pointRadius: 1,
                tension: 0.35,
                fill: false,
              },
            ]
          : []),
      ],
    };
  }, [equitySeries, previousEquitySeries, compareEnabled]);

  const realizedChartData = useMemo(() => {
    const merged = mergeSeries(
      realizedSeries?.points ?? [],
      previousRealizedSeries?.points
    );
    return {
      labels: merged.labels.map(label => formatDateDDMMYYYY(label)),
      datasets: [
        {
          label: 'Current Realized P/L',
          data: merged.currentValues,
          borderColor: '#0f766e',
          backgroundColor: 'rgba(15, 118, 110, 0.15)',
          pointRadius: 2,
          tension: 0.35,
          fill: true,
        },
        ...(compareEnabled
          ? [
              {
                label: 'Previous Realized P/L',
                data: merged.previousValues,
                borderColor: '#94a3b8',
                backgroundColor: 'rgba(148, 163, 184, 0.08)',
                borderDash: [6, 4],
                pointRadius: 1,
                tension: 0.35,
                fill: false,
              },
            ]
          : []),
      ],
    };
  }, [realizedSeries, previousRealizedSeries, compareEnabled]);

  const chartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: compareEnabled },
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 8 },
          grid: { color: 'rgba(148, 163, 184, 0.18)' },
        },
        y: {
          grid: { color: 'rgba(148, 163, 184, 0.18)' },
        },
      },
    }),
    [compareEnabled]
  );

  const distributionChartData = useMemo(() => {
    const source =
      distributionMetric === 'pnl'
        ? (distributions?.pnlHistogram ?? [])
        : distributionMetric === 'returnPct'
          ? (distributions?.returnPctHistogram ?? [])
          : (distributions?.holdingDaysHistogram ?? []);

    const labels = source.map(
      bucket => `${bucket.min.toFixed(1)} to ${bucket.max.toFixed(1)}`
    );

    return {
      labels,
      datasets: [
        {
          label:
            distributionMetric === 'pnl'
              ? 'P/L Distribution'
              : distributionMetric === 'returnPct'
                ? 'Return % Distribution'
                : 'Holding Days Distribution',
          data: source.map(bucket => bucket.count),
          borderColor: '#1d4ed8',
          backgroundColor: 'rgba(29, 78, 216, 0.28)',
          borderWidth: 1,
        },
      ],
    };
  }, [distributions, distributionMetric]);

  const distributionChartOptions = useMemo(
    () => ({
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
      },
      scales: {
        x: {
          ticks: { maxTicksLimit: 6 },
          grid: { color: 'rgba(148, 163, 184, 0.18)' },
        },
        y: {
          beginAtZero: true,
          grid: { color: 'rgba(148, 163, 184, 0.18)' },
        },
      },
    }),
    []
  );

  return (
    <div className='min-h-screen bg-[--tr-bg] p-4'>
      <div className='max-w-6xl xl:max-w-7xl 2xl:max-w-screen-2xl 3xl:max-w-[1800px] mx-auto space-y-6'>
        <PageHeader
          title='Statistics'
          subtitle='Performance, risk and trade-quality analytics for the selected scope'
          action={
            <div className='flex gap-2'>
              <Button
                label={compareMode ? 'Compare: ON' : 'Compare: OFF'}
                icon='pi pi-chart-line'
                onClick={() => setCompareMode(prev => !prev)}
                severity={compareMode ? 'success' : 'secondary'}
                outlined={!compareMode}
              />
              <Button
                label='Export PDF snapshot'
                icon='pi pi-file-pdf'
                onClick={handleExportSnapshot}
                severity='secondary'
                outlined
              />
            </div>
          }
        />

        {periodLabel && (
          <p className='text-sm' style={{ color: 'var(--tr-text-2)' }}>
            {periodLabel}
          </p>
        )}

        <Card>
          <div className='grid grid-cols-1 md:grid-cols-3 gap-4'>
            <div>
              <label
                className='block text-sm mb-1'
                style={{ color: 'var(--tr-text-2)' }}
              >
                Date from
              </label>
              <Calendar
                value={fromDate}
                onChange={e => {
                  setFromDate((e.value as Date) ?? null);
                  setActivePreset('CUSTOM');
                  setPageFirst(0);
                }}
                dateFormat='dd/mm/yy'
                showIcon
                className='w-full'
              />
            </div>
            <div>
              <label
                className='block text-sm mb-1'
                style={{ color: 'var(--tr-text-2)' }}
              >
                Date to
              </label>
              <Calendar
                value={toDate}
                onChange={e => {
                  setToDate((e.value as Date) ?? null);
                  setActivePreset('CUSTOM');
                  setPageFirst(0);
                }}
                dateFormat='dd/mm/yy'
                showIcon
                className='w-full'
              />
            </div>
            <div>
              <label
                className='block text-sm mb-1'
                style={{ color: 'var(--tr-text-2)' }}
              >
                Accounts
              </label>
              <MultiSelect
                value={selectedAccountIds}
                options={accountOptions}
                onChange={e => setSelectedAccountIds(e.value)}
                placeholder='All accounts'
                display='chip'
                className='w-full'
              />
            </div>
          </div>
          <div className='flex flex-wrap gap-2 mt-4'>
            <Button
              label='90D'
              aria-label='Preset 90D'
              size='small'
              outlined={activePreset !== '90D'}
              severity={activePreset === '90D' ? 'success' : 'secondary'}
              onClick={() => applyPreset('90D')}
            />
            <Button
              label='YTD'
              aria-label='Preset YTD'
              size='small'
              outlined={activePreset !== 'YTD'}
              severity={activePreset === 'YTD' ? 'success' : 'secondary'}
              onClick={() => applyPreset('YTD')}
            />
            <Button
              label='12M'
              aria-label='Preset 12M'
              size='small'
              outlined={activePreset !== '12M'}
              severity={activePreset === '12M' ? 'success' : 'secondary'}
              onClick={() => applyPreset('12M')}
            />
            {activePreset === 'CUSTOM' && (
              <span
                className='text-xs self-center'
                style={{ color: 'var(--tr-text-2)' }}
              >
                Custom range
              </span>
            )}
          </div>
        </Card>

        <div className='grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4'>
          <Card>
            <p className='text-sm' style={{ color: 'var(--tr-text-2)' }}>
              Total P/L
            </p>
            <p
              className={`text-2xl font-semibold ${returnClass(summary?.totalPnL ?? 0)}`}
            >
              {summaryLoading
                ? 'Loading...'
                : formatCurrency(summary?.totalPnL ?? 0)}
            </p>
            {compareEnabled && previousSummary && (
              <p className='text-xs mt-1' style={{ color: 'var(--tr-text-2)' }}>
                vs previous: {formatCurrency(previousSummary.totalPnL)} (
                {formatDeltaNumber(
                  (summary?.totalPnL ?? 0) - previousSummary.totalPnL
                )}
                )
              </p>
            )}
          </Card>
          <Card>
            <p className='text-sm' style={{ color: 'var(--tr-text-2)' }}>
              Win Rate
            </p>
            <p
              className='text-2xl font-semibold'
              style={{ color: 'var(--tr-text)' }}
            >
              {summaryLoading ? 'Loading...' : formatPct(summary?.winRate ?? 0)}
            </p>
            {compareEnabled && previousSummary && (
              <p className='text-xs mt-1' style={{ color: 'var(--tr-text-2)' }}>
                vs previous: {formatPct(previousSummary.winRate)} (
                {formatSignedPctValue(
                  ((summary?.winRate ?? 0) - previousSummary.winRate) * 100
                )}{' '}
                pts)
              </p>
            )}
          </Card>
          <Card>
            <p className='text-sm' style={{ color: 'var(--tr-text-2)' }}>
              Sharpe Ratio
            </p>
            <p
              className='text-2xl font-semibold'
              style={{ color: 'var(--tr-text)' }}
            >
              {riskLoading
                ? 'Loading...'
                : risk?.sharpeRatio == null
                  ? 'N/A'
                  : risk.sharpeRatio.toFixed(2)}
            </p>
            {compareEnabled &&
              previousRisk &&
              previousRisk.sharpeRatio != null &&
              risk?.sharpeRatio != null && (
                <p
                  className='text-xs mt-1'
                  style={{ color: 'var(--tr-text-2)' }}
                >
                  vs previous: {previousRisk.sharpeRatio.toFixed(2)} (
                  {formatDeltaNumber(
                    risk.sharpeRatio - previousRisk.sharpeRatio
                  )}
                  )
                </p>
              )}
          </Card>
          <Card>
            <p className='text-sm' style={{ color: 'var(--tr-text-2)' }}>
              Max Drawdown
            </p>
            <p className='text-2xl font-semibold text-red-600'>
              {riskLoading
                ? 'Loading...'
                : risk?.maxDrawdownPct == null
                  ? 'N/A'
                  : `-${risk.maxDrawdownPct.toFixed(2)}%`}
            </p>
            {compareEnabled &&
              previousRisk &&
              previousRisk.maxDrawdownPct != null &&
              risk?.maxDrawdownPct != null && (
                <p
                  className='text-xs mt-1'
                  style={{ color: 'var(--tr-text-2)' }}
                >
                  vs previous: -{previousRisk.maxDrawdownPct.toFixed(2)}% (
                  {formatSignedPctValue(
                    risk.maxDrawdownPct - previousRisk.maxDrawdownPct
                  )}{' '}
                  pts)
                </p>
              )}
          </Card>
        </div>

        <div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
          <Card title='Equity Trend (Monthly)'>
            {equitySeriesLoading ? (
              <div className='text-sm' style={{ color: 'var(--tr-text-2)' }}>
                <i className='pi pi-spin pi-spinner mr-2' /> Loading equity
                trend...
              </div>
            ) : (equitySeries?.points.length ?? 0) === 0 ? (
              <p className='text-sm' style={{ color: 'var(--tr-text-2)' }}>
                No equity series data for this scope.
              </p>
            ) : (
              <div className='h-64'>
                <Line data={equityChartData} options={chartOptions} />
              </div>
            )}
          </Card>
          <Card title='Realized P/L Trend (Monthly)'>
            {realizedSeriesLoading ? (
              <div className='text-sm' style={{ color: 'var(--tr-text-2)' }}>
                <i className='pi pi-spin pi-spinner mr-2' /> Loading realized
                trend...
              </div>
            ) : (realizedSeries?.points.length ?? 0) === 0 ? (
              <p className='text-sm' style={{ color: 'var(--tr-text-2)' }}>
                No realized P/L data for this scope.
              </p>
            ) : (
              <div className='h-64'>
                <Line data={realizedChartData} options={chartOptions} />
              </div>
            )}
          </Card>
        </div>

        <div className='grid grid-cols-1 xl:grid-cols-2 gap-4'>
          <Card title='Allocation (Market Value)'>
            <BreakdownList rows={breakdowns?.rows ?? []} />
          </Card>
          <Card title='Distribution Snapshot'>
            <p className='text-sm mb-2' style={{ color: 'var(--tr-text-2)' }}>
              Sample size: {distributions?.sampleSize ?? 0} closed trades
            </p>
            <div className='flex flex-wrap gap-2 mb-3'>
              <Button
                label='P/L'
                aria-label='Distribution metric P/L'
                size='small'
                outlined={distributionMetric !== 'pnl'}
                severity={
                  distributionMetric === 'pnl' ? 'success' : 'secondary'
                }
                onClick={() => setDistributionMetric('pnl')}
              />
              <Button
                label='Return %'
                aria-label='Distribution metric Return %'
                size='small'
                outlined={distributionMetric !== 'returnPct'}
                severity={
                  distributionMetric === 'returnPct' ? 'success' : 'secondary'
                }
                onClick={() => setDistributionMetric('returnPct')}
              />
              <Button
                label='Holding Days'
                aria-label='Distribution metric Holding Days'
                size='small'
                outlined={distributionMetric !== 'holdingDays'}
                severity={
                  distributionMetric === 'holdingDays' ? 'success' : 'secondary'
                }
                onClick={() => setDistributionMetric('holdingDays')}
              />
            </div>
            {(distributionChartData.labels?.length ?? 0) === 0 ? (
              <p className='text-sm' style={{ color: 'var(--tr-text-2)' }}>
                No histogram data for this scope.
              </p>
            ) : (
              <div className='h-64'>
                <Bar
                  data={distributionChartData}
                  options={distributionChartOptions}
                />
              </div>
            )}
          </Card>
        </div>

        <Card title='Closed Trades (Top 25)'>
          {closedTradesLoading ? (
            <div className='text-sm' style={{ color: 'var(--tr-text-2)' }}>
              <i className='pi pi-spin pi-spinner mr-2' /> Loading closed
              trades...
            </div>
          ) : (
            <DataTable
              value={closedTradeRows}
              size='small'
              stripedRows
              className='holdings-table'
              paginator
              lazy
              first={pageFirst}
              rows={pageRows}
              totalRecords={closedTrades?.meta.total ?? 0}
              onPage={e => {
                setPageFirst(e.first);
                setPageRows(e.rows);
              }}
            >
              <Column
                header={
                  <button
                    aria-label='Sort by Close Date'
                    onClick={() => handleSort('closeDate')}
                    className='font-semibold'
                  >
                    Close Date
                    {sortDirectionForHeader(sortBy, sortDir, 'closeDate')}
                  </button>
                }
                body={row => formatDateDDMMYYYY(row.closeDate)}
              />
              <Column
                header='Symbol'
                body={row => (
                  <button
                    aria-label={`View trade details ${row.symbol}`}
                    className='text-blue-600 font-semibold hover:underline'
                    onClick={() => setSelectedTrade(row)}
                  >
                    {row.symbol}
                  </button>
                )}
              />
              <Column
                header={
                  <button
                    aria-label='Sort by P/L'
                    onClick={() => handleSort('pnl')}
                    className='font-semibold'
                  >
                    P/L{sortDirectionForHeader(sortBy, sortDir, 'pnl')}
                  </button>
                }
                body={row => (
                  <span className={returnClass(row.pnl)}>
                    {formatCurrency(row.pnl)}
                  </span>
                )}
              />
              <Column
                header={
                  <button
                    aria-label='Sort by Return %'
                    onClick={() => handleSort('returnPct')}
                    className='font-semibold'
                  >
                    Return %
                    {sortDirectionForHeader(sortBy, sortDir, 'returnPct')}
                  </button>
                }
                body={row => (
                  <span className={returnClass(row.returnPct)}>
                    {formatSignedPctValue(row.returnPct)}
                  </span>
                )}
              />
              <Column
                header={
                  <button
                    aria-label='Sort by Holding Days'
                    onClick={() => handleSort('holdingDays')}
                    className='font-semibold'
                  >
                    Holding Days
                    {sortDirectionForHeader(sortBy, sortDir, 'holdingDays')}
                  </button>
                }
                field='holdingDays'
              />
            </DataTable>
          )}
        </Card>

        <Dialog
          header={
            selectedTrade
              ? `Trade Details · ${selectedTrade.symbol}`
              : 'Trade Details'
          }
          visible={selectedTrade !== null}
          onHide={() => setSelectedTrade(null)}
          style={{ width: '560px', maxWidth: '95vw' }}
          modal
        >
          {selectedTrade && (
            <div className='space-y-4'>
              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <p className='text-xs' style={{ color: 'var(--tr-text-2)' }}>
                    Symbol
                  </p>
                  <p className='font-semibold'>{selectedTrade.symbol}</p>
                </div>
                <div>
                  <p className='text-xs' style={{ color: 'var(--tr-text-2)' }}>
                    Exchange
                  </p>
                  <p className='font-semibold'>{selectedTrade.exchangeCode}</p>
                </div>
                <div>
                  <p className='text-xs' style={{ color: 'var(--tr-text-2)' }}>
                    Account
                  </p>
                  <p className='font-semibold'>{selectedTrade.accountId}</p>
                </div>
                <div>
                  <p className='text-xs' style={{ color: 'var(--tr-text-2)' }}>
                    Position ID
                  </p>
                  <p className='font-semibold'>{selectedTrade.positionId}</p>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <p className='text-xs' style={{ color: 'var(--tr-text-2)' }}>
                    Open Date
                  </p>
                  <p>{formatDateDDMMYYYY(selectedTrade.openDate)}</p>
                </div>
                <div>
                  <p className='text-xs' style={{ color: 'var(--tr-text-2)' }}>
                    Close Date
                  </p>
                  <p>{formatDateDDMMYYYY(selectedTrade.closeDate)}</p>
                </div>
                <div>
                  <p className='text-xs' style={{ color: 'var(--tr-text-2)' }}>
                    Units Closed
                  </p>
                  <p>{selectedTrade.unitsClosed.toFixed(3)}</p>
                </div>
                <div>
                  <p className='text-xs' style={{ color: 'var(--tr-text-2)' }}>
                    Holding Days
                  </p>
                  <p>{selectedTrade.holdingDays}</p>
                </div>
              </div>

              <div className='grid grid-cols-2 gap-3'>
                <div>
                  <p className='text-xs' style={{ color: 'var(--tr-text-2)' }}>
                    P/L
                  </p>
                  <p
                    className={`font-semibold ${returnClass(selectedTrade.pnl)}`}
                  >
                    {formatCurrency(selectedTrade.pnl)}
                  </p>
                </div>
                <div>
                  <p className='text-xs' style={{ color: 'var(--tr-text-2)' }}>
                    Return %
                  </p>
                  <p
                    className={`font-semibold ${returnClass(selectedTrade.returnPct)}`}
                  >
                    {formatSignedPctValue(selectedTrade.returnPct)}
                  </p>
                </div>
              </div>

              <div className='flex justify-end'>
                <Button
                  label='Previous trade'
                  aria-label='Previous trade details'
                  severity='secondary'
                  outlined
                  disabled={!canGoToPreviousTrade}
                  onClick={() => selectNeighborTrade(-1)}
                />
                <Button
                  label='Next trade'
                  aria-label='Next trade details'
                  severity='secondary'
                  outlined
                  disabled={!canGoToNextTrade}
                  onClick={() => selectNeighborTrade(1)}
                  className='ml-2'
                />
                <Button
                  label='Close details'
                  aria-label='Close trade details'
                  severity='secondary'
                  outlined
                  className='ml-2'
                  onClick={() => setSelectedTrade(null)}
                />
              </div>
            </div>
          )}
        </Dialog>
      </div>
    </div>
  );
}
