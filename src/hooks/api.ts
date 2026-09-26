import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import type {
  AddWatchlistItemPayload,
  ClosedTradesQuery,
  ScreenerFilters,
  StatisticsBreakdownBy,
  StatisticsBreakdownMetric,
  StatisticsClosedTradesSortBy,
  StatisticsClosedTradesSortDir,
  StatisticsFilters,
} from '@/lib/types';

function invalidatePositionQueries(queryClient: QueryClient) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['holdings'] }),
    queryClient.invalidateQueries({ queryKey: ['closed-positions'] }),
    queryClient.invalidateQueries({ queryKey: ['realized-pnl'] }),
    queryClient.invalidateQueries({ queryKey: ['portfolio-history'] }),
    queryClient.invalidateQueries({ queryKey: ['user-portfolio'] }),
    // Editing a parcel can make an already-generated tax report stale.
    queryClient.invalidateQueries({
      queryKey: ['tax-reports', 'position-usage'],
    }),
  ]);
}

// Account hooks
export const useTradingAccounts = (includeClosed = false, enabled = true) => {
  return useQuery({
    queryKey: ['trading-accounts', includeClosed ? 'all' : 'active'],
    queryFn: () => apiClient.getTradingAccounts(includeClosed),
    enabled,
    staleTime: 10 * 60 * 1000,
  });
};

export const useCreateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (account: { name: string }) => apiClient.createAccount(account),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading-accounts'] });
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) => apiClient.deleteAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['user-portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-history'] });
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      queryClient.invalidateQueries({ queryKey: ['closed-positions'] });
    },
  });
};

export const useCloseAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) => apiClient.closeAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['user-portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-history'] });
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
    },
  });
};

export const useReopenAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) => apiClient.reopenAccount(accountId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading-accounts'] });
    },
  });
};

export const useUpdateAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ accountId, name }: { accountId: string; name: string }) =>
      apiClient.updateAccount(accountId, { name }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading-accounts'] });
    },
  });
};

// Auth hooks
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiClient.login(email, password),
    onSuccess: data => {
      // Store auth tokens — backend returns { success, data: { user, accessToken, refreshToken } }
      const { accessToken, refreshToken } = data.data ?? {};
      if (accessToken) localStorage.setItem('authToken', accessToken);
      if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
      // Invalidate all queries to refetch with new auth
      queryClient.invalidateQueries();
    },
  });
};

// Signup mutation
export const useSignup = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      name,
      email,
      password,
    }: {
      name: string;
      email: string;
      password: string;
    }) => apiClient.signup(name, email, password),
    onSuccess: data => {
      // Backend returns { success, data: { user, accessToken, refreshToken } } on register
      const { accessToken, refreshToken } = data.data ?? {};
      if (accessToken) {
        localStorage.setItem('authToken', accessToken);
        if (refreshToken) localStorage.setItem('refreshToken', refreshToken);
        queryClient.invalidateQueries();
      }
    },
  });
};

// Forgot password mutation
export const useForgotPassword = () => {
  return useMutation({
    mutationFn: ({ email }: { email: string }) =>
      apiClient.forgotPassword(email),
  });
};

// Reset password mutation
export const useResetPassword = () => {
  return useMutation({
    mutationFn: ({ token, password }: { token: string; password: string }) =>
      apiClient.resetPassword(token, password),
    onSuccess: () => {
      // Reset password returns only { success, message } — no token
      // Redirect is handled by the page component after success
    },
  });
};

export const useLogout = () => {
  return useMutation({
    mutationFn: (refreshToken: string) => apiClient.logout(refreshToken),
  });
};

export const useDeleteCurrentUser = () => {
  return useMutation({
    mutationFn: (currentPassword: string) =>
      apiClient.deleteCurrentUser(currentPassword),
  });
};

export const useRestoreAccount = () => {
  return useMutation({
    mutationFn: ({ email, password }: { email: string; password: string }) =>
      apiClient.restoreAccount(email, password),
  });
};

export const useCurrentUser = () => {
  return useQuery({
    queryKey: ['current-user'],
    queryFn: () => apiClient.getCurrentUser(),
  });
};

export const useUpdateCurrentUser = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: apiClient.updateCurrentUser.bind(apiClient),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['current-user'] });
    },
  });
};

export const useUserPortfolio = (accountId?: string) => {
  return useQuery({
    queryKey: ['user-portfolio', accountId ?? 'all'],
    queryFn: () => apiClient.getUserPortfolio(accountId),
    enabled: !!accountId,
  });
};

export const usePortfolioHistory = (
  accountId?: string,
  exchangeCode?: string
) => {
  return useQuery({
    queryKey: [
      'portfolio-history',
      accountId ?? 'none',
      exchangeCode ?? 'none',
    ],
    queryFn: () => apiClient.getPortfolioHistory(accountId, exchangeCode),
    enabled: !!accountId && !!exchangeCode,
  });
};

export const useRealizedPnL = (accountId?: string, exchangeCode?: string) => {
  return useQuery({
    queryKey: ['realized-pnl', accountId ?? 'none', exchangeCode ?? 'none'],
    queryFn: () => apiClient.getRealizedPnL(accountId, exchangeCode),
    enabled: !!accountId && !!exchangeCode,
  });
};

export const useCreatePortfolioSnapshot = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      exchangeCode,
    }: {
      accountId: string;
      exchangeCode: string;
    }) => apiClient.createPortfolioSnapshot(accountId, exchangeCode),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['portfolio-history'] });
    },
  });
};

export const useHoldings = (exchangeName?: string, accountId?: string) => {
  return useQuery({
    queryKey: ['holdings', exchangeName ?? 'all', accountId ?? 'all'],
    queryFn: () => apiClient.getHoldings(exchangeName, accountId),
    enabled: !!accountId,
  });
};

export const useClosedPositions = (params: ClosedTradesQuery = {}) => {
  return useQuery({
    queryKey: [
      'closed-positions',
      params.dateFrom ?? 'all',
      params.dateTo ?? 'all',
      params.limit ?? 'default',
      params.offset ?? 0,
    ],
    queryFn: () => apiClient.getClosedPositions(params),
  });
};

export const useCreatePosition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (payload: Parameters<typeof apiClient.createPosition>[0]) =>
      apiClient.createPosition(payload),
    onSuccess: () => invalidatePositionQueries(queryClient),
  });
};

export const useUpdatePosition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      payload,
    }: {
      id: string;
      payload: Parameters<typeof apiClient.updatePosition>[1];
    }) => apiClient.updatePosition(id, payload),
    onSuccess: () => invalidatePositionQueries(queryClient),
  });
};

export const useClosePosition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      closeDate,
      exitPrice,
      quantity,
      fees,
      notes,
    }: {
      id: string;
      closeDate: string;
      exitPrice: number;
      quantity?: number;
      fees?: number;
      notes?: string;
    }) =>
      apiClient.closePosition(id, closeDate, exitPrice, quantity, fees, notes),
    onSuccess: () => invalidatePositionQueries(queryClient),
  });
};

export const useDeletePosition = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deletePosition(id),
    onSuccess: () => invalidatePositionQueries(queryClient),
  });
};

export const useUpdateCloseEvent = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: Parameters<typeof apiClient.updateCloseEvent>[1];
    }) => apiClient.updateCloseEvent(id, data),
    onSuccess: () => invalidatePositionQueries(queryClient),
  });
};

export const useRecalculateDrawdown = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.recalculateDrawdown(id),
    onSuccess: () => invalidatePositionQueries(queryClient),
  });
};

export const useQuotes = (symbols: string[]) => {
  // Stable key: sorted, joined so reference changes don't trigger redundant fetches
  const key = [...symbols].sort().join(',');
  return useQuery({
    queryKey: ['quotes', key],
    queryFn: () => apiClient.getQuotes(symbols),
    enabled: symbols.length > 0,
    refetchInterval: 60_000, // refresh every minute
    staleTime: 30_000,
  });
};

export const useStockSearch = (query: string, limit = 10) => {
  return useQuery({
    queryKey: ['stock-search', query, limit],
    queryFn: () => apiClient.searchStocks(query, limit),
    enabled: query.length > 0,
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
};

// Tax report hooks
export const useTaxReports = (includeSuperseded = false) => {
  return useQuery({
    queryKey: ['tax-reports', { includeSuperseded }],
    queryFn: () => apiClient.getTaxReports(includeSuperseded),
  });
};

export const useTaxReportDetail = (id?: string) => {
  return useQuery({
    queryKey: ['tax-reports', id ?? 'none'],
    queryFn: () => apiClient.getTaxReportDetail(id!),
    enabled: !!id,
  });
};

export const useTaxReportPositionUsage = () => {
  return useQuery({
    queryKey: ['tax-reports', 'position-usage'],
    queryFn: () => apiClient.getTaxReportPositionUsage(),
  });
};

export const useGenerateTaxReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (params: {
      financialYearStartYear: number;
      accountIds: string[];
    }) => apiClient.generateTaxReport(params),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-reports'] });
    },
  });
};

export const useDeleteTaxReport = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => apiClient.deleteTaxReport(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tax-reports'] });
    },
  });
};

export const useDownloadTaxReportPdf = () => {
  return useMutation({
    mutationFn: (id: string) => apiClient.downloadTaxReportPdf(id),
  });
};

// Statistics hooks
export const useStatisticsSummary = (
  filters: StatisticsFilters = {},
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['statistics-summary', filters],
    queryFn: () => apiClient.getStatisticsSummary(filters),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
};

export const useStatisticsTimeSeries = (params: {
  filters?: StatisticsFilters;
  metric: 'equity' | 'totalPnL' | 'realizedPnL';
  granularity?: 'day' | 'week' | 'month';
  enabled?: boolean;
}) => {
  return useQuery({
    queryKey: [
      'statistics-timeseries',
      params.metric,
      params.granularity ?? 'month',
      params.filters ?? {},
    ],
    queryFn: () => apiClient.getStatisticsTimeSeries(params),
    staleTime: 60_000,
    enabled: params.enabled ?? true,
  });
};

export const useStatisticsDistributions = (filters: StatisticsFilters = {}) => {
  return useQuery({
    queryKey: ['statistics-distributions', filters],
    queryFn: () => apiClient.getStatisticsDistributions(filters),
    staleTime: 60_000,
  });
};

export const useStatisticsRisk = (
  filters: StatisticsFilters = {},
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['statistics-risk', filters],
    queryFn: () => apiClient.getStatisticsRisk(filters),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
};

export const useStatisticsBreakdowns = (params: {
  filters?: StatisticsFilters;
  by: StatisticsBreakdownBy;
  metric: StatisticsBreakdownMetric;
}) => {
  return useQuery({
    queryKey: [
      'statistics-breakdowns',
      params.by,
      params.metric,
      params.filters ?? {},
    ],
    queryFn: () => apiClient.getStatisticsBreakdowns(params),
    staleTime: 60_000,
  });
};

export const useStatisticsClosedTrades = (params: {
  filters?: StatisticsFilters;
  limit?: number;
  offset?: number;
  sortBy?: StatisticsClosedTradesSortBy;
  sortDir?: StatisticsClosedTradesSortDir;
}) => {
  return useQuery({
    queryKey: [
      'statistics-closed-trades',
      params.filters ?? {},
      params.limit ?? 50,
      params.offset ?? 0,
      params.sortBy ?? 'closeDate',
      params.sortDir ?? 'desc',
    ],
    queryFn: () => apiClient.getStatisticsClosedTrades(params),
    staleTime: 60_000,
  });
};

// Screener hooks
export const useScreener = (filters: ScreenerFilters, enabled = true) => {
  return useQuery({
    queryKey: ['screener', filters],
    queryFn: () => apiClient.runScreener(filters),
    enabled,
    retry: false,
    staleTime: 60_000,
  });
};

export const useUpcomingDividends = (symbols: string[], enabled = true) => {
  const key = [...symbols].sort().join(',');
  return useQuery({
    queryKey: ['upcoming-dividends', key],
    queryFn: () => apiClient.getUpcomingDividends(symbols),
    enabled: enabled && symbols.length > 0,
    staleTime: 60 * 60 * 1000,
  });
};

export const useSavedScreens = () => {
  return useQuery({
    queryKey: ['saved-screens'],
    queryFn: () => apiClient.getSavedScreens(),
    staleTime: 5 * 60 * 1000,
  });
};

export const useCreateSavedScreen = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      name,
      filters,
    }: {
      name: string;
      filters: ScreenerFilters;
    }) => apiClient.createSavedScreen(name, filters),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-screens'] });
    },
  });
};

export const useDeleteSavedScreen = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteSavedScreen(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['saved-screens'] });
    },
  });
};

// Watchlist hooks
export const useWatchlists = () => {
  return useQuery({
    queryKey: ['watchlists'],
    queryFn: () => apiClient.getWatchlists(),
    staleTime: 60_000,
  });
};

export const useWatchlistDetail = (id?: string) => {
  return useQuery({
    queryKey: ['watchlist', id],
    queryFn: () => apiClient.getWatchlist(id as string),
    enabled: Boolean(id),
    staleTime: 30_000,
  });
};

export const useCreateWatchlist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (name: string) => apiClient.createWatchlist(name),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });
};

export const useRenameWatchlist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) =>
      apiClient.renameWatchlist(id, name),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      queryClient.invalidateQueries({ queryKey: ['watchlist', variables.id] });
    },
  });
};

export const useDeleteWatchlist = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.deleteWatchlist(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
    },
  });
};

export const useAddWatchlistItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      watchlistId,
      item,
    }: {
      watchlistId: string;
      item: AddWatchlistItemPayload;
    }) => apiClient.addWatchlistItem(watchlistId, item),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      queryClient.invalidateQueries({
        queryKey: ['watchlist', variables.watchlistId],
      });
      queryClient.invalidateQueries({ queryKey: ['screener'] });
    },
  });
};

export const useRemoveWatchlistItem = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      watchlistId,
      itemId,
    }: {
      watchlistId: string;
      itemId: string;
    }) => apiClient.removeWatchlistItem(watchlistId, itemId),
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['watchlists'] });
      queryClient.invalidateQueries({
        queryKey: ['watchlist', variables.watchlistId],
      });
      queryClient.invalidateQueries({ queryKey: ['screener'] });
    },
  });
};
