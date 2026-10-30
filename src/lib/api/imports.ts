import { AxiosInstance } from 'axios';
import type {
  ImportBatch,
  ImportCommitResult,
  ImportDetail,
  ImportEventResolution,
  ImportFilePayload,
  ImportSource,
  ImportUploadResult,
} from '../types';
import { isRecord } from './mappers';

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

function mockUnavailable(): never {
  throw new Error(
    'Exchange imports are not available in mock mode — switch off NEXT_PUBLIC_USE_MOCK_API to use this feature.'
  );
}

function unwrapData(payload: unknown): unknown {
  return isRecord(payload) && 'data' in payload ? payload.data : payload;
}

/** The backend is the source of truth for these shapes; guard the envelope only. */
function expectRecord(payload: unknown, what: string): Record<string, unknown> {
  const data = unwrapData(payload);
  if (!isRecord(data)) throw new Error(`Unexpected ${what} response`);
  return data;
}

export function createImportsApi(client: AxiosInstance) {
  return {
    async createImport(payload: {
      source: ImportSource;
      accountId: string;
      files: ImportFilePayload[];
    }): Promise<ImportUploadResult> {
      if (USE_MOCK_API) mockUnavailable();
      const response = await client.post('/imports', payload);
      return expectRecord(
        response.data,
        'import'
      ) as unknown as ImportUploadResult;
    },

    async getImports(): Promise<ImportBatch[]> {
      if (USE_MOCK_API) return [];
      const response = await client.get('/imports', { params: { limit: 50 } });
      const data = unwrapData(response.data);
      return Array.isArray(data) ? (data as ImportBatch[]) : [];
    },

    async getImport(id: string): Promise<ImportDetail> {
      if (USE_MOCK_API) mockUnavailable();
      const response = await client.get(`/imports/${id}`);
      return expectRecord(response.data, 'import') as unknown as ImportDetail;
    },

    async resolveImportEvent(
      id: string,
      eventId: string,
      resolution: ImportEventResolution
    ): Promise<ImportDetail> {
      if (USE_MOCK_API) mockUnavailable();
      const response = await client.patch(
        `/imports/${id}/events/${eventId}`,
        resolution
      );
      return expectRecord(response.data, 'import') as unknown as ImportDetail;
    },

    async commitImport(
      id: string,
      eventIds?: string[]
    ): Promise<ImportCommitResult> {
      if (USE_MOCK_API) mockUnavailable();
      const response = await client.post(
        `/imports/${id}/commit`,
        eventIds ? { eventIds } : {}
      );
      return expectRecord(
        response.data,
        'commit'
      ) as unknown as ImportCommitResult;
    },

    async discardImport(id: string) {
      if (USE_MOCK_API) mockUnavailable();
      const response = await client.delete(`/imports/${id}`);
      return response.data;
    },
  };
}
