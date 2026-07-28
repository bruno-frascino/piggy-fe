import { useEffect, useState } from 'react';
import { apiClient } from '@/lib/api-client';

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

  useEffect(() => {
    if (!visible) return;
    let cancelled = false;

    const loadAccounts = async () => {
      try {
        const accounts = await apiClient.getTradingAccounts();
        const names = Array.from(new Set(accounts.map(a => a.name))).sort();
        if (!cancelled) {
          setAllAccountNames(names);
          setAccountSuggestions(names);
        }
      } catch {
        if (!cancelled) {
          setAllAccountNames([]);
          setAccountSuggestions([]);
        }
      }
    };

    loadAccounts();
    return () => {
      cancelled = true;
    };
  }, [visible, exchangeCode]);

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
