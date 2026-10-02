// Fixed-width placeholder so masked figures never hint at magnitude.
export const MASKED_VALUE = '••••••';

export function formatCurrency(n: number, currency: string = 'USD') {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 3,
  }).format(n);
}

export function formatPct(v: number) {
  const p = v * 100;
  return `${p >= 0 ? '+' : ''}${p.toFixed(2)}%`;
}

// `neutral` (privacy mode) drops the green/red so the sign isn't leaked by colour.
export const returnClass = (v: number, neutral = false) =>
  neutral ? 'text-gray-500' : v >= 0 ? 'text-green-600' : 'text-red-600';
