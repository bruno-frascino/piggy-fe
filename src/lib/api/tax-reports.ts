import { AxiosInstance } from 'axios';
import type { TaxReport } from '../types';
import { isRecord, unwrapArray } from './mappers';

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

export function createTaxReportsApi(client: AxiosInstance) {
  return {
    async getTaxReports(): Promise<TaxReport[]> {
      if (USE_MOCK_API) {
        // Not implemented in mock mode — tax reports require real backend
        // computation against persisted positions/transactions.
        return [];
      }

      const response = await client.get('/tax-reports');
      return unwrapArray<TaxReport>(response.data);
    },

    async getTaxReportDetail(id: string): Promise<TaxReport | null> {
      if (USE_MOCK_API) {
        return null;
      }

      const response = await client.get(`/tax-reports/${id}`);
      const payload = isRecord(response.data) ? response.data.data : null;
      return (payload as TaxReport) ?? null;
    },

    async generateTaxReport(params: {
      financialYearStartYear: number;
      accountIds: string[];
    }): Promise<TaxReport> {
      if (USE_MOCK_API) {
        throw new Error(
          'Generating tax reports is not available in mock mode — switch off NEXT_PUBLIC_USE_MOCK_API to use this feature.'
        );
      }

      const response = await client.post('/tax-reports/generate', params);
      const payload = isRecord(response.data) ? response.data.data : null;
      return payload as TaxReport;
    },

    async downloadTaxReportPdf(id: string): Promise<Blob> {
      if (USE_MOCK_API) {
        throw new Error(
          'Downloading tax report PDFs is not available in mock mode — switch off NEXT_PUBLIC_USE_MOCK_API to use this feature.'
        );
      }

      const response = await client.get(`/tax-reports/${id}/download`, {
        responseType: 'blob',
      });
      return response.data;
    },

    async deleteTaxReport(id: string): Promise<void> {
      if (USE_MOCK_API) {
        // Not implemented in mock mode — getTaxReports() already returns no
        // reports to delete.
        return;
      }

      await client.delete(`/tax-reports/${id}`);
    },
  };
}
