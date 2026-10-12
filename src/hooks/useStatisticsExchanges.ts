import { useMemo, useState } from 'react';
import { useStatisticsBreakdowns } from '@/hooks/api';

export const DEFAULT_STATISTICS_CURRENCY = 'USD';

export interface StatisticsExchangeOption {
  code: string;
  currency: string;
}

function readStoredExchange(): string | null {
  try {
    if (typeof window === 'undefined') return null;
    return localStorage.getItem('selectedExchange');
  } catch {
    return null;
  }
}

/**
 * Exchange scope for the statistics page. Options are the exchanges the given
 * account has positions on (any status, so closed-only exchanges are included),
 * and the currency is the selected exchange's currency — statistics are never
 * FX-converted. The initial exchange follows the dashboard's last selection when
 * valid for the account, otherwise the first option.
 */
export function useStatisticsExchanges(accountId: string) {
  const { data, isLoading } = useStatisticsBreakdowns({
    filters: { accountIds: accountId ? [accountId] : undefined },
    by: 'exchange',
    metric: 'totalPnL',
    enabled: !!accountId,
  });
  const [choice, setChoice] = useState<{
    accountId: string;
    code: string;
  } | null>(null);

  const exchanges = useMemo<StatisticsExchangeOption[]>(
    () =>
      (data?.rows ?? [])
        .map(row => ({
          code: row.key,
          currency: row.currency ?? DEFAULT_STATISTICS_CURRENCY,
        }))
        .sort((a, b) => a.code.localeCompare(b.code)),
    [data]
  );

  const selectedExchangeCode = useMemo(() => {
    const has = (code: string | null | undefined): code is string =>
      !!code && exchanges.some(e => e.code === code);
    if (choice?.accountId === accountId && has(choice.code)) {
      return choice.code;
    }
    const stored = readStoredExchange();
    if (has(stored)) return stored;
    return exchanges[0]?.code ?? '';
  }, [accountId, choice, exchanges]);

  const currency =
    exchanges.find(e => e.code === selectedExchangeCode)?.currency ??
    DEFAULT_STATISTICS_CURRENCY;

  return {
    exchanges,
    selectedExchangeCode,
    setSelectedExchangeCode: (code: string) => setChoice({ accountId, code }),
    currency,
    isLoading,
  };
}
