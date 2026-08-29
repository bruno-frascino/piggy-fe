import { useEffect, useRef, useState } from 'react';
import { useStockSearch } from '@/hooks/api';
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
  const [searchRequest, setSearchRequest] = useState({
    query: '',
    sequence: 0,
  });
  const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { data: searchResults, isError } = useStockSearch(
    searchRequest.query,
    10
  );

  useEffect(() => {
    if (!searchRequest.query) return;
    if (isError) {
      setSymbolSuggestions([]);
      return;
    }
    // Skip the transient "still loading" state (searchResults undefined):
    // updating suggestions to [] here, then again once data lands, is two
    // suggestions changes instead of one, and PrimeReact AutoComplete only
    // reacts to the first one after a keystroke — the real results would
    // silently fail to open the dropdown.
    if (searchResults) {
      setSymbolSuggestions(searchResults);
    }
  }, [searchRequest, searchResults, isError]);

  useEffect(
    () => () => {
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    },
    []
  );

  const searchSymbol = (event: { query: string }) => {
    if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
    const q = event.query.trim();
    if (!q) {
      setSearchRequest(request => ({
        query: '',
        sequence: request.sequence + 1,
      }));
      setSymbolSuggestions([]);
      return;
    }
    searchTimerRef.current = setTimeout(() => {
      setSearchRequest(request => ({
        query: q,
        sequence: request.sequence + 1,
      }));
    }, 300);
  };

  return { symbolSuggestions, setSymbolSuggestions, searchSymbol };
}
