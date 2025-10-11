export type ExchangeKey = 'Binance' | 'Coinbase' | 'Kraken' | 'eToro';

export interface EquityPoint {
  date: string; // ISO date
  equity: number; // total portfolio equity at close
}

export interface ExchangePortfolio {
  name: ExchangeKey;
  equitySeries: EquityPoint[];
}

// Simple mock series generator
function genSeries(
  start: number,
  days = 60,
  drift = 0.001,
  vol = 0.01
): EquityPoint[] {
  const out: EquityPoint[] = [];
  let eq = start;
  const today = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const shock = (Math.random() * 2 - 1) * vol;
    eq = Math.max(0, eq * (1 + drift + shock));
    out.push({
      date: d.toISOString().slice(0, 10),
      equity: Number(eq.toFixed(2)),
    });
  }
  return out;
}

export const exchanges: ExchangePortfolio[] = [
  { name: 'Binance', equitySeries: genSeries(5000, 90, 0.0012, 0.012) },
  { name: 'Coinbase', equitySeries: genSeries(3200, 90, 0.0008, 0.015) },
  { name: 'Kraken', equitySeries: genSeries(4200, 90, 0.0011, 0.011) },
  { name: 'eToro', equitySeries: genSeries(2100, 90, 0.0006, 0.02) },
];

export function summarize(series: EquityPoint[]) {
  if (series.length < 1) return { totalEquity: 0, totalPL: 0, dayPL: 0 };
  const first = series[0].equity;
  const last = series[series.length - 1].equity;
  const prev = series.length > 1 ? series[series.length - 2].equity : last;
  return {
    totalEquity: last,
    totalPL: last - first,
    dayPL: last - prev,
  };
}
