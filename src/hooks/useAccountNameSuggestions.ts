import { useEffect, useState } from 'react';
import { useTradingAccounts } from '@/hooks/api';

/**
 * Owns the trading-account-name autocomplete suggestions for
 * AddHoldingsDialog's Account field: loads all known account names whenever
 * the dialog opens, and filters them as the user types. Extracted verbatim
 * from AddHoldingsDialog.tsx.
 */
export function useAccountNameSuggestions(
  visible: boolean,
  exchangeCode?: string
) {
  const [allAccountNames, setAllAccountNames] = useState<string[]>([]);
  const [accountSuggestions, setAccountSuggestions] = useState<string[]>([]);
  const { data: accounts, isError } = useTradingAccounts(false, visible);

  useEffect(() => {
    if (!visible) return;

    const names = isError
      ? []
      : Array.from(
          new Set((accounts ?? []).map(account => account.name))
        ).sort();
    setAllAccountNames(names);
    setAccountSuggestions(names);
  }, [visible, exchangeCode, accounts, isError]);

  const searchAccount = (event: { query: string }) => {
    const q = event.query.trim().toLowerCase();
    if (!q) {
      setAccountSuggestions(allAccountNames);
      return;
    }
    setAccountSuggestions(
      allAccountNames.filter(name => name.toLowerCase().includes(q))
    );
  };

  const resetAccountSuggestions = () => {
    setAllAccountNames([]);
    setAccountSuggestions([]);
  };

  return { accountSuggestions, searchAccount, resetAccountSuggestions };
}
