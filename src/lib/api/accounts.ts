import { AxiosInstance } from 'axios';
import type {
  TradingAccount,
  OpeningPreview,
  OpeningPreviewInput,
  OpeningStatementPage,
  SaveOpeningStatementInput,
  SaveOpeningStatementResult,
  DraftCashEvidenceInput,
  DraftCashEvidencePreview,
  DraftCashEvidenceResult,
  DraftCashFlowInput,
  DraftCashFlowResult,
  DraftCashCorrectionInput,
  DraftCashCorrectionResult,
  DraftImportedCashCorrectionInput,
  DraftImportedExecutionInput,
  DraftSaleCorrectionInput,
  DraftAcquisitionCorrectionInput,
  DraftOpeningReconciliation,
} from '../types';
import { isRecord, mapToTradingAccount, unwrapArray } from './mappers';

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

export function createAccountsApi(client: AxiosInstance) {
  const api = {
    async correctDraftRecordedAcquisition(
      accountId: string,
      statementId: string,
      operationId: string,
      input: DraftAcquisitionCorrectionInput
    ): Promise<DraftCashFlowResult & { revisionId: string }> {
      if (USE_MOCK_API)
        throw new Error(
          'Recorded acquisition corrections require the real API.'
        );
      const response = await client.post<{
        success: boolean;
        data: DraftCashFlowResult & { revisionId: string };
      }>(
        `/accounts/${encodeURIComponent(accountId)}/opening-statements/${encodeURIComponent(statementId)}/cash-operations/${encodeURIComponent(operationId)}/acquisition-corrections`,
        input
      );
      return response.data.data;
    },
    async correctDraftRecordedSale(
      accountId: string,
      statementId: string,
      operationId: string,
      input: DraftSaleCorrectionInput
    ): Promise<DraftCashFlowResult & { revisionId: string }> {
      if (USE_MOCK_API)
        throw new Error('Recorded sale corrections require the real API.');
      const response = await client.post<{
        success: boolean;
        data: DraftCashFlowResult & { revisionId: string };
      }>(
        `/accounts/${encodeURIComponent(accountId)}/opening-statements/${encodeURIComponent(statementId)}/cash-operations/${encodeURIComponent(operationId)}/sale-corrections`,
        input
      );
      return response.data.data;
    },
    async stageDraftManualExecutionCash(
      accountId: string,
      statementId: string,
      transactionId: string,
      input: DraftImportedExecutionInput
    ): Promise<DraftCashFlowResult> {
      if (USE_MOCK_API)
        throw new Error('Manual execution cash staging requires the real API.');
      const response = await client.post<{
        success: boolean;
        data: DraftCashFlowResult;
      }>(
        `/accounts/${encodeURIComponent(accountId)}/opening-statements/${encodeURIComponent(statementId)}/transactions/${encodeURIComponent(transactionId)}/cash-operation`,
        input
      );
      return response.data.data;
    },
    async correctDraftImportedExecutionCash(
      accountId: string,
      statementId: string,
      operationId: string,
      input: DraftImportedCashCorrectionInput
    ): Promise<DraftCashCorrectionResult> {
      if (USE_MOCK_API)
        throw new Error('Imported cash corrections require the real API.');
      const response = await client.post<{
        success: boolean;
        data: DraftCashCorrectionResult;
      }>(
        `/accounts/${encodeURIComponent(accountId)}/opening-statements/${encodeURIComponent(statementId)}/imported-cash-operations/${encodeURIComponent(operationId)}/corrections`,
        input
      );
      return response.data.data;
    },

    async correctDraftReconciliationCashOperation(
      accountId: string,
      statementId: string,
      operationId: string,
      input: DraftCashCorrectionInput
    ): Promise<DraftCashCorrectionResult> {
      if (USE_MOCK_API)
        throw new Error('Draft cash corrections require the real API.');
      const response = await client.post<{
        success: boolean;
        data: DraftCashCorrectionResult;
      }>(
        `/accounts/${encodeURIComponent(accountId)}/opening-statements/${encodeURIComponent(statementId)}/cash-operations/${encodeURIComponent(operationId)}/corrections`,
        input
      );
      return response.data.data;
    },

    async getDraftOpeningReconciliation(
      accountId: string,
      statementId: string
    ): Promise<DraftOpeningReconciliation> {
      if (USE_MOCK_API)
        throw new Error('Opening reconciliation requires the real API.');
      const response = await client.get<{
        success: boolean;
        data: DraftOpeningReconciliation;
      }>(
        `/accounts/${encodeURIComponent(accountId)}/opening-statements/${encodeURIComponent(statementId)}/reconciliation`
      );
      return response.data.data;
    },

    async previewDraftCashEvidence(
      accountId: string,
      statementId: string,
      input: DraftCashEvidenceInput
    ): Promise<DraftCashEvidencePreview> {
      if (USE_MOCK_API)
        throw new Error('Cash evidence preview requires the real API.');
      const response = await client.post<{
        success: boolean;
        data: DraftCashEvidencePreview;
      }>(
        `/accounts/${encodeURIComponent(accountId)}/opening-statements/${encodeURIComponent(statementId)}/cash-evidence/preview`,
        input
      );
      return response.data.data;
    },

    async recordDraftCashEvidence(
      accountId: string,
      statementId: string,
      input: DraftCashEvidenceInput
    ): Promise<DraftCashEvidenceResult> {
      if (USE_MOCK_API) throw new Error('Cash evidence requires the real API.');
      const response = await client.post<{
        success: boolean;
        data: DraftCashEvidenceResult;
      }>(
        `/accounts/${encodeURIComponent(accountId)}/opening-statements/${encodeURIComponent(statementId)}/cash-evidence`,
        input
      );
      return response.data.data;
    },

    async saveDraftReconciliationCashOperation(
      accountId: string,
      statementId: string,
      input: DraftCashFlowInput
    ): Promise<DraftCashFlowResult> {
      if (USE_MOCK_API)
        throw new Error('Draft cash operations require the real API.');
      const response = await client.post<{
        success: boolean;
        data: DraftCashFlowResult;
      }>(
        `/accounts/${encodeURIComponent(accountId)}/opening-statements/${encodeURIComponent(statementId)}/cash-operations`,
        input
      );
      return response.data.data;
    },

    async stageDraftImportedExecutionCash(
      accountId: string,
      statementId: string,
      eventId: string,
      input: DraftImportedExecutionInput
    ): Promise<DraftCashFlowResult> {
      if (USE_MOCK_API)
        throw new Error('Imported execution staging requires the real API.');
      const response = await client.post<{
        success: boolean;
        data: DraftCashFlowResult;
      }>(
        `/accounts/${encodeURIComponent(accountId)}/opening-statements/${encodeURIComponent(statementId)}/import-events/${encodeURIComponent(eventId)}/cash-operation`,
        input
      );
      return response.data.data;
    },

    async getOpeningStatements(
      accountId: string,
      beforeVersion?: number
    ): Promise<OpeningStatementPage> {
      if (USE_MOCK_API)
        throw new Error('Opening statements require the real API.');
      const response = await client.get<{
        success: boolean;
        data: OpeningStatementPage;
      }>(`/accounts/${encodeURIComponent(accountId)}/opening-statements`, {
        params: { beforeVersion },
      });
      return response.data.data;
    },

    async saveOpeningStatement(
      accountId: string,
      input: SaveOpeningStatementInput
    ): Promise<SaveOpeningStatementResult> {
      if (USE_MOCK_API)
        throw new Error('Opening statements require the real API.');
      const response = await client.post<{
        success: boolean;
        data: SaveOpeningStatementResult;
      }>(
        `/accounts/${encodeURIComponent(accountId)}/opening-statements`,
        input
      );
      return response.data.data;
    },

    async previewAccountOpening(
      accountId: string,
      input: OpeningPreviewInput
    ): Promise<OpeningPreview> {
      if (USE_MOCK_API) {
        throw new Error(
          'Opening-balance previews require the real API; mock accounting results are not available.'
        );
      }
      const response = await client.post<{
        success: boolean;
        data: OpeningPreview;
      }>(`/accounts/${encodeURIComponent(accountId)}/opening-preview`, input);
      return response.data.data;
    },

    async getTradingAccounts(includeClosed = false): Promise<TradingAccount[]> {
      if (USE_MOCK_API) {
        const mockAccount: TradingAccount = {
          id: 'mock-account-main',
          name: 'Main',
          status: 'ACTIVE',
          closedAt: null,
        };
        return includeClosed ? [mockAccount] : [mockAccount];
      }

      const response = await client.get('/accounts', {
        params: {
          includeClosed: includeClosed ? 'true' : 'false',
        },
      });
      return unwrapArray<unknown>(response.data)
        .map(mapToTradingAccount)
        .filter((a): a is TradingAccount => a !== null);
    },

    async getAccounts(): Promise<TradingAccount[]> {
      return api.getTradingAccounts(false);
    },

    async createAccount(account: {
      name: string;
      isDemo?: boolean;
    }): Promise<TradingAccount | null> {
      if (USE_MOCK_API) {
        return {
          id: `mock-account-${Date.now()}`,
          name: account.name,
          status: 'ACTIVE',
          closedAt: null,
          isDemo: account.isDemo === true,
        };
      }

      const response = await client.post('/accounts', {
        name: account.name,
        ...(account.isDemo ? { isDemo: true } : {}),
      });
      const payload = isRecord(response.data)
        ? response.data.data
        : response.data;
      return mapToTradingAccount(payload);
    },

    async deleteAccount(accountId: string) {
      if (USE_MOCK_API) {
        return { success: true };
      }

      const response = await client.delete(`/accounts/${accountId}`);
      return response.data;
    },

    async closeAccount(accountId: string) {
      if (USE_MOCK_API) {
        return { success: true };
      }

      const response = await client.post(`/accounts/${accountId}/close`);
      return response.data;
    },

    async reopenAccount(accountId: string) {
      if (USE_MOCK_API) {
        return { success: true };
      }

      const response = await client.post(`/accounts/${accountId}/reopen`);
      return response.data;
    },

    async updateAccount(
      accountId: string,
      data: { name: string }
    ): Promise<TradingAccount | null> {
      if (USE_MOCK_API) {
        return {
          id: accountId,
          name: data.name,
          status: 'ACTIVE',
          closedAt: null,
        };
      }

      const response = await client.patch(`/accounts/${accountId}`, data);
      const payload = isRecord(response.data)
        ? response.data.data
        : response.data;
      return mapToTradingAccount(payload);
    },
  };

  return api;
}
