import { AxiosInstance } from 'axios';
import type { UpdateUserProfilePayload, UserProfile } from '../types';
import { isRecord, mapToUserProfile } from './mappers';

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

export function createUserApi(client: AxiosInstance) {
  return {
    async getCurrentUser(): Promise<UserProfile | null> {
      if (USE_MOCK_API) {
        const mockUser = {
          id: 'mock-user-1',
          name: 'Mock User',
          email: 'mock@example.com',
          baseCurrency: 'AUD',
        };
        return mockUser;
      }

      const response = await client.get('/users/me');
      const payload = isRecord(response.data)
        ? response.data.data
        : response.data;
      return mapToUserProfile(payload);
    },

    async updateCurrentUser(
      payload: UpdateUserProfilePayload
    ): Promise<UserProfile | null> {
      if (USE_MOCK_API) {
        const next = {
          id: 'mock-user-1',
          name: payload.name ?? 'Mock User',
          email: 'mock@example.com',
          baseCurrency: payload.baseCurrency?.toUpperCase() ?? 'AUD',
        };
        return next;
      }

      const response = await client.patch('/users/me', payload);
      const data = isRecord(response.data) ? response.data.data : response.data;
      return mapToUserProfile(data);
    },

    async deleteCurrentUser(
      currentPassword: string
    ): Promise<{ deletedAt: string; purgeAfter: string }> {
      if (USE_MOCK_API) {
        const now = new Date();
        return {
          deletedAt: now.toISOString(),
          purgeAfter: new Date(
            now.getTime() + 30 * 24 * 60 * 60 * 1000
          ).toISOString(),
        };
      }

      const response = await client.delete('/users/me', {
        data: { currentPassword },
      });
      const data = isRecord(response.data) ? response.data.data : response.data;
      return data as { deletedAt: string; purgeAfter: string };
    },
  };
}
