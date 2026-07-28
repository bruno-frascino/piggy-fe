import { AxiosInstance } from 'axios';
import { MockAuthService } from '../mock-api';

const USE_MOCK_API = process.env.NEXT_PUBLIC_USE_MOCK_API === 'true';

export function createAuthApi(client: AxiosInstance) {
  return {
    async login(email: string, password: string) {
      if (USE_MOCK_API) {
        return await MockAuthService.login(email, password);
      }
      const response = await client.post('/auth/login', { email, password });
      return response.data;
    },

    async logout(refreshToken: string) {
      if (USE_MOCK_API) {
        return { success: true };
      }

      const response = await client.post('/auth/logout', { refreshToken });
      return response.data;
    },

    async signup(name: string, email: string, password: string) {
      if (USE_MOCK_API) {
        return await MockAuthService.signup(name, email, password);
      }
      const response = await client.post('/auth/register', {
        name,
        email,
        password,
      });
      return response.data;
    },

    async forgotPassword(email: string) {
      if (USE_MOCK_API) {
        return await MockAuthService.forgotPassword(email);
      }
      const response = await client.post('/auth/forgot-password', { email });
      return response.data;
    },

    async resetPassword(token: string, password: string) {
      if (USE_MOCK_API) {
        return await MockAuthService.resetPassword(token, password);
      }
      const response = await client.post('/auth/reset-password', {
        token,
        password,
      });
      return response.data;
    },
  };
}
