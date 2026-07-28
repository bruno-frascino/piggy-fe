import { useRef, useState } from 'react';
import { apiClient } from '@/lib/api-client';
import type { StockSearchResult } from '@/lib/types';

/**
 * Owns debounced stock-symbol search suggestions for AddHoldingsDialog's
 * symbol AutoComplete field. Extracted verbatim (same debounce/timer
 * behavior) from AddHoldingsDialog.tsx — see AddHoldingsDialog.test.tsx for
 * characterization coverage of the dialog's validation/submission behavior
 * that depends on the resolved symbol.
 */
export function useSymbolSearch() {
  const [symbolSuggestions, setSymbolSuggestions] = useState<
    StockSearchResult[]
  >([]);
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const searchSymbol = async (event: { query: string }) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const q = event.query.trim();
    if (!q) {
      setSymbolSuggestions([]);
      return;
    }
    searchTimerRef.current = setTimeout(async () => {
      try {
        const results = await apiClient.searchStocks(q, 10);
        setSymbolSuggestions(results);
      } catch {
        setSymbolSuggestions([]);
      }
    }, 300);
  };

  return { symbolSuggestions, setSymbolSuggestions, searchSymbol };
}
