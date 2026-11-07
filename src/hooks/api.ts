import {
  useQuery,
  useMutation,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';
import { isAxiosError } from 'axios';
import type {
  AddWatchlistItemPayload,
  CloseReason,
  ImportEventResolution,
  ImportFilePayload,
  ImportSource,
  ClosedTradesQuery,
  ScreenerFilters,
  StatisticsBreakdownBy,
  StatisticsBreakdownMetric,
  StatisticsClosedTradesSortBy,
  StatisticsClosedTradesSortDir,
  StatisticsFilters,
  CryptoQuote,
  OpeningPreviewInput,
  SaveOpeningStatementInput,
  DraftCashEvidenceInput,
  DraftCashFlowInput,
  DraftCashCorrectionInput,
  DraftImportedCashCorrectionInput,
  DraftImportedExecutionInput,
  DraftSaleCorrectionInput,
  DraftAcquisitionCorrectionInput,
  AccountTradeInput,
  LiveSaleCorrectionResult,
  LiveImportedExecutionCorrectionInput,
} from '@/lib/types';

export const useExchanges = (assetClass: 'crypto' | 'equity', enabled = true) =>
  useQuery({
    queryKey: ['exchanges', assetClass],
    queryFn: () => apiClient.getExchanges(assetClass),
    enabled,
    staleTime: 10 * 60 * 1000,
  });

export const useKrakenAssetSearch = (
  q: string,
  quote: CryptoQuote,
  enabled = true
) =>
  useQuery({
    queryKey: ['kraken-assets', quote, q.trim()],
    queryFn: () => apiClient.searchKrakenAssets(q, quote),
    enabled: enabled && q.trim().length > 0,
    staleTime: 10 * 60 * 1000,
    retry: false,
  });

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
export const useDraftOpeningReconciliation = (
  accountId: string,
  statementId: string,
  enabled = true
) =>
  useQuery({
    queryKey: ['opening-reconciliation', accountId, statementId],
    queryFn: () =>
      apiClient.getDraftOpeningReconciliation(accountId, statementId),
    enabled: Boolean(accountId && statementId) && enabled,
    retry: false,
    staleTime: 0,
    gcTime: 0,
  });

export const usePreviewDraftCashEvidence = () =>
  useMutation({
    mutationKey: ['draft-cash-evidence-preview'],
    mutationFn: ({
      accountId,
      statementId,
      input,
    }: {
      accountId: string;
      statementId: string;
      input: DraftCashEvidenceInput;
    }) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine)
        throw new Error(
          'Reconnect to preview statement cash. Offline requests are not queued.'
        );
      return apiClient.previewDraftCashEvidence(accountId, statementId, input);
    },
    retry: false,
    networkMode: 'always',
    gcTime: 0,
  });

export const useRecordDraftCashEvidence = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountId,
      statementId,
      input,
    }: {
      accountId: string;
      statementId: string;
      input: DraftCashEvidenceInput;
    }) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine)
        throw new Error(
          'Reconnect to record statement evidence. Offline changes are not queued.'
        );
      return apiClient.recordDraftCashEvidence(accountId, statementId, input);
    },
    retry: false,
    networkMode: 'always',
    gcTime: 0,
    onSuccess: (_result, { accountId, statementId }) =>
      queryClient.invalidateQueries({
        queryKey: ['opening-reconciliation', accountId, statementId],
      }),
  });
};

export const useSaveDraftReconciliationCashOperation = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountId,
      statementId,
      input,
    }: {
      accountId: string;
      statementId: string;
      input: DraftCashFlowInput;
    }) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine)
        throw new Error(
          'Reconnect to stage a dated cash operation. Offline changes are not queued.'
        );
      return apiClient.saveDraftReconciliationCashOperation(
        accountId,
        statementId,
        input
      );
    },
    retry: false,
    networkMode: 'always',
    gcTime: 0,
    onSuccess: (_result, { accountId, statementId }) =>
      queryClient.invalidateQueries({
        queryKey: ['opening-reconciliation', accountId, statementId],
      }),
  });
};

export const useCorrectDraftReconciliationCashOperation = () => {
  const queryClient = useQueryClient();
  const refresh = (accountId: string, statementId: string) =>
    queryClient.invalidateQueries({
      queryKey: ['opening-reconciliation', accountId, statementId],
    });
  return useMutation({
    mutationFn: ({
      accountId,
      statementId,
      operationId,
      input,
    }: {
      accountId: string;
      statementId: string;
      operationId: string;
      input: DraftCashCorrectionInput;
    }) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine)
        throw new Error(
          'Reconnect to correct draft cash. Offline changes are not queued.'
        );
      return apiClient.correctDraftReconciliationCashOperation(
        accountId,
        statementId,
        operationId,
        input
      );
    },
    retry: false,
    networkMode: 'always',
    gcTime: 0,
    onSuccess: (_result, { accountId, statementId }) =>
      refresh(accountId, statementId),
    onError: (error, { accountId, statementId }) => {
      if (isAxiosError(error) && error.response?.status === 409)
        return refresh(accountId, statementId);
    },
  });
};

export const useCorrectDraftImportedExecutionCash = () => {
  const queryClient = useQueryClient();
  const refresh = (accountId: string, statementId: string) =>
    queryClient.invalidateQueries({
      queryKey: ['opening-reconciliation', accountId, statementId],
    });
  return useMutation({
    mutationFn: ({
      accountId,
      statementId,
      operationId,
      input,
    }: {
      accountId: string;
      statementId: string;
      operationId: string;
      input: DraftImportedCashCorrectionInput;
    }) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine)
        throw new Error(
          'Reconnect to correct imported cash. Offline changes are not queued.'
        );
      return apiClient.correctDraftImportedExecutionCash(
        accountId,
        statementId,
        operationId,
        input
      );
    },
    retry: false,
    networkMode: 'always',
    gcTime: 0,
    onSuccess: (_result, { accountId, statementId }) =>
      refresh(accountId, statementId),
    onError: (error, { accountId, statementId }) => {
      if (isAxiosError(error) && error.response?.status === 409)
        return refresh(accountId, statementId);
    },
  });
};

export const useStageDraftImportedExecutionCash = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountId,
      statementId,
      eventId,
      input,
    }: {
      accountId: string;
      statementId: string;
      eventId: string;
      input: DraftImportedExecutionInput;
    }) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine)
        throw new Error(
          'Reconnect to stage imported execution cash. Offline changes are not queued.'
        );
      return apiClient.stageDraftImportedExecutionCash(
        accountId,
        statementId,
        eventId,
        input
      );
    },
    retry: false,
    networkMode: 'always',
    gcTime: 0,
    onSuccess: (_result, { accountId, statementId }) =>
      queryClient.invalidateQueries({
        queryKey: ['opening-reconciliation', accountId, statementId],
      }),
  });
};

export const useStageDraftManualExecutionCash = () => {
  const queryClient = useQueryClient();
  const refresh = (accountId: string, statementId: string) =>
    queryClient.invalidateQueries({
      queryKey: ['opening-reconciliation', accountId, statementId],
    });
  return useMutation({
    mutationFn: ({
      accountId,
      statementId,
      transactionId,
      input,
    }: {
      accountId: string;
      statementId: string;
      transactionId: string;
      input: DraftImportedExecutionInput;
    }) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine)
        throw new Error(
          'Reconnect to stage manual execution cash. Offline changes are not queued.'
        );
      return apiClient.stageDraftManualExecutionCash(
        accountId,
        statementId,
        transactionId,
        input
      );
    },
    retry: false,
    networkMode: 'always',
    gcTime: 0,
    onSuccess: (_result, { accountId, statementId }) =>
      refresh(accountId, statementId),
    onError: (error, { accountId, statementId }) => {
      if (isAxiosError(error) && error.response?.status === 409)
        return refresh(accountId, statementId);
    },
  });
};

export const useCorrectDraftRecordedSale = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountId,
      statementId,
      operationId,
      input,
    }: {
      accountId: string;
      statementId: string;
      operationId: string;
      input: DraftSaleCorrectionInput;
    }) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine)
        throw new Error(
          'Reconnect to correct this sale. Offline changes are not queued.'
        );
      return apiClient.correctDraftRecordedSale(
        accountId,
        statementId,
        operationId,
        input
      );
    },
    retry: false,
    networkMode: 'always',
    gcTime: 0,
    onSuccess: async () => {
      await Promise.all([
        invalidatePositionQueries(queryClient),
        queryClient.invalidateQueries({ queryKey: ['opening-reconciliation'] }),
        queryClient.invalidateQueries({ queryKey: ['opening-statements'] }),
        queryClient.invalidateQueries({ queryKey: ['tax-reports'] }),
        queryClient.invalidateQueries({
          predicate: query =>
            typeof query.queryKey[0] === 'string' &&
            query.queryKey[0].startsWith('statistics-'),
        }),
      ]);
    },
    onError: (error, { accountId, statementId }) => {
      if (isAxiosError(error) && error.response?.status === 409)
        return queryClient.invalidateQueries({
          queryKey: ['opening-reconciliation', accountId, statementId],
        });
    },
  });
};

export const useCorrectLiveManualSale = () => {
  return useCorrectLiveManualExecution<
    DraftSaleCorrectionInput,
    {
      accountId: string;
      transactionId: string;
      input: DraftSaleCorrectionInput;
    }
  >(apiClient.correctLiveManualSale, variables => variables.transactionId);
};

export const useCorrectLiveManualAcquisition = () => {
  return useCorrectLiveManualExecution<
    DraftAcquisitionCorrectionInput,
    {
      accountId: string;
      transactionId: string;
      input: DraftAcquisitionCorrectionInput;
    }
  >(
    apiClient.correctLiveManualAcquisition,
    variables => variables.transactionId
  );
};

export const useCorrectLiveImportedExecution = () => {
  return useCorrectLiveManualExecution<
    LiveImportedExecutionCorrectionInput,
    {
      accountId: string;
      eventId: string;
      input: LiveImportedExecutionCorrectionInput;
    }
  >(apiClient.correctLiveImportedExecution, variables => variables.eventId);
};

function useCorrectLiveManualExecution<
  T extends DraftSaleCorrectionInput,
  V extends { accountId: string; input: T },
>(
  correct: (
    accountId: string,
    transactionId: string,
    input: T
  ) => Promise<LiveSaleCorrectionResult>,
  executionId: (variables: V) => string
) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (variables: V) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine)
        throw new Error(
          'Reconnect to correct this execution. Offline changes are not queued.'
        );
      return correct(
        variables.accountId,
        executionId(variables),
        variables.input
      );
    },
    retry: false,
    networkMode: 'always',
    gcTime: 0,
    onSuccess: async (_result, { accountId }) => {
      await Promise.all([
        invalidatePositionQueries(queryClient),
        queryClient.invalidateQueries({ queryKey: ['opening-reconciliation'] }),
        queryClient.invalidateQueries({
          queryKey: ['opening-statements', accountId],
        }),
        queryClient.invalidateQueries({ queryKey: ['tax-reports'] }),
        queryClient.invalidateQueries({
          predicate: query =>
            typeof query.queryKey[0] === 'string' &&
            query.queryKey[0].startsWith('statistics-'),
        }),
      ]);
    },
    onError: (error, { accountId }) => {
      if (isAxiosError(error) && error.response?.status === 409) {
        return Promise.all([
          invalidatePositionQueries(queryClient),
          queryClient.invalidateQueries({
            queryKey: ['opening-reconciliation'],
          }),
          queryClient.invalidateQueries({
            queryKey: ['opening-statements', accountId],
          }),
        ]);
      }
    },
  });
}

export const useCorrectDraftRecordedAcquisition = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountId,
      statementId,
      operationId,
      input,
    }: {
      accountId: string;
      statementId: string;
      operationId: string;
      input: DraftAcquisitionCorrectionInput;
    }) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine)
        throw new Error(
          'Reconnect to correct this acquisition. Offline changes are not queued.'
        );
      return apiClient.correctDraftRecordedAcquisition(
        accountId,
        statementId,
        operationId,
        input
      );
    },
    retry: false,
    networkMode: 'always',
    gcTime: 0,
    onSuccess: async () => {
      await Promise.all([
        invalidatePositionQueries(queryClient),
        queryClient.invalidateQueries({ queryKey: ['opening-reconciliation'] }),
        queryClient.invalidateQueries({ queryKey: ['opening-statements'] }),
        queryClient.invalidateQueries({ queryKey: ['tax-reports'] }),
        queryClient.invalidateQueries({
          predicate: query =>
            typeof query.queryKey[0] === 'string' &&
            query.queryKey[0].startsWith('statistics-'),
        }),
      ]);
    },
    onError: (error, { accountId, statementId }) => {
      if (isAxiosError(error) && error.response?.status === 409)
        return queryClient.invalidateQueries({
          queryKey: ['opening-reconciliation', accountId, statementId],
        });
    },
  });
};

export const useOpeningStatements = (
  accountId: string,
  beforeVersion?: number
) =>
  useQuery({
    queryKey: ['opening-statements', accountId, beforeVersion ?? 'latest'],
    queryFn: () => apiClient.getOpeningStatements(accountId, beforeVersion),
    enabled: Boolean(accountId),
    retry: false,
    staleTime: 0,
  });

export const useSaveOpeningStatement = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountId,
      input,
    }: {
      accountId: string;
      input: SaveOpeningStatementInput;
    }) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine)
        throw new Error(
          'Reconnect to save an opening draft. Offline changes are not queued.'
        );
      return apiClient.saveOpeningStatement(accountId, input);
    },
    retry: false,
    networkMode: 'always',
    gcTime: 0,
    onSuccess: (_result, { accountId }) =>
      queryClient.invalidateQueries({
        queryKey: ['opening-statements', accountId],
      }),
  });
};

export const useOpeningPreview = () =>
  useMutation({
    mutationKey: ['opening-preview'],
    mutationFn: ({
      accountId,
      input,
    }: {
      accountId: string;
      input: OpeningPreviewInput;
    }) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('Reconnect to preview opening balances.');
      }
      return apiClient.previewAccountOpening(accountId, input);
    },
    retry: false,
    networkMode: 'always',
    gcTime: 0,
  });

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
    mutationFn: (account: { name: string; isDemo?: boolean }) =>
      apiClient.createAccount(account),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['trading-accounts'] });
    },
  });
};

export const useDeleteAccount = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountId: string) => apiClient.deleteAccount(accountId),
    onSuccess: (_result, accountId) => {
      queryClient.invalidateQueries({ queryKey: ['trading-accounts'] });
      queryClient.invalidateQueries({ queryKey: ['user-portfolio'] });
      queryClient.invalidateQueries({ queryKey: ['portfolio-history'] });
      queryClient.invalidateQueries({ queryKey: ['holdings'] });
      queryClient.invalidateQueries({ queryKey: ['closed-positions'] });
      queryClient.invalidateQueries({ queryKey: ['realized-pnl'] });
      queryClient.removeQueries({
        queryKey: ['opening-statements', accountId],
      });
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
      params.accountId ?? 'all-accounts',
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

export const usePostAccountTrade = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      accountId,
      input,
    }: {
      accountId: string;
      input: AccountTradeInput;
    }) => {
      if (typeof navigator !== 'undefined' && !navigator.onLine)
        throw new Error(
          'Reconnect to post an account trade. Offline changes are not queued.'
        );
      return apiClient.postAccountTrade(accountId, input);
    },
    retry: false,
    networkMode: 'always',
    gcTime: 0,
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
      closeReason,
    }: {
      id: string;
      closeDate: string;
      exitPrice: number;
      quantity?: number;
      fees?: number;
      notes?: string;
      closeReason?: CloseReason;
    }) =>
      apiClient.closePosition(
        id,
        closeDate,
        exitPrice,
        quantity,
        fees,
        notes,
        closeReason
      ),
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

export const useCheckStopLoss = () => {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: ({ id, currentPrice }: { id: string; currentPrice?: number }) =>
      apiClient.checkStopLoss(id, currentPrice),
    onSuccess: data => {
      if (data.stopLossHitAt) invalidatePositionQueries(queryClient);
    },
    onError: error => {
      console.warn('Stop loss check failed', error);
      if (isAxiosError(error) && error.response?.status === 409)
        invalidatePositionQueries(queryClient);
    },
  });
};

export const useRecalculateDrawdown = () => {
  const queryClient = useQueryClient();

  return useMutation({
    retry: false,
    mutationFn: (id: string) => apiClient.recalculateDrawdown(id),
    onSuccess: () => invalidatePositionQueries(queryClient),
    onError: error => {
      console.warn('Historical position recalculation failed', error);
      if (isAxiosError(error) && error.response?.status === 409)
        invalidatePositionQueries(queryClient);
    },
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

export const useStatisticsDistributions = (
  filters: StatisticsFilters = {},
  options?: { enabled?: boolean }
) => {
  return useQuery({
    queryKey: ['statistics-distributions', filters],
    queryFn: () => apiClient.getStatisticsDistributions(filters),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
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
  enabled?: boolean;
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
    enabled: params.enabled ?? true,
  });
};

export const useStatisticsClosedTrades = (params: {
  filters?: StatisticsFilters;
  limit?: number;
  offset?: number;
  sortBy?: StatisticsClosedTradesSortBy;
  sortDir?: StatisticsClosedTradesSortDir;
  enabled?: boolean;
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
    enabled: params.enabled ?? true,
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

// Exchange import hooks
function invalidateImportQueries(queryClient: QueryClient, importId: string) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: ['imports'] }),
    queryClient.invalidateQueries({ queryKey: ['import', importId] }),
  ]);
}

export const useImports = () =>
  useQuery({
    queryKey: ['imports'],
    queryFn: () => apiClient.getImports(),
    staleTime: 30_000,
  });

export const useImport = (id: string | undefined) =>
  useQuery({
    queryKey: ['import', id],
    queryFn: () => apiClient.getImport(id as string),
    enabled: Boolean(id),
    staleTime: 0,
  });

export const useCreateImport = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload: {
      source: ImportSource;
      accountId: string;
      files: ImportFilePayload[];
    }) => apiClient.createImport(payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
    },
  });
};

export const useResolveImportEvent = (importId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      eventId,
      resolution,
    }: {
      eventId: string;
      resolution: ImportEventResolution;
    }) => apiClient.resolveImportEvent(importId, eventId, resolution),
    onError: () => invalidateImportQueries(queryClient, importId),
    onSuccess: detail => {
      queryClient.setQueryData(['import', importId], detail);
    },
  });
};

export const useCommitImport = (importId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (eventIds?: string[]) =>
      apiClient.commitImport(importId, eventIds),
    retry: false,
    onError: () => invalidateImportQueries(queryClient, importId),
    onSuccess: async () => {
      await Promise.all([
        invalidatePositionQueries(queryClient),
        invalidateImportQueries(queryClient, importId),
        queryClient.invalidateQueries({
          predicate: query =>
            typeof query.queryKey[0] === 'string' &&
            query.queryKey[0].startsWith('statistics'),
        }),
      ]);
    },
  });
};

export const useDiscardImport = (importId: string) => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.discardImport(importId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['imports'] });
      queryClient.removeQueries({ queryKey: ['import', importId] });
    },
  });
};
