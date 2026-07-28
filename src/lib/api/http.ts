import axios, { AxiosInstance } from 'axios';

// Axios instance + interceptor wiring extracted from the former ApiClient
// constructor. Encapsulates the 401 refresh-token flow (including the
// in-flight-refresh queue) so every domain module shares one client instance.
export function createHttpClient(baseURL: string): AxiosInstance {
  const client = axios.create({
    baseURL,
    timeout: 10000,
    headers: {
      'Content-Type': 'application/json',
    },
  });

  let isRefreshing = false;
  let refreshQueue: Array<(token: string) => void> = [];

  // Request interceptor for adding auth tokens
  client.interceptors.request.use(
    config => {
      const token = localStorage.getItem('authToken');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    error => Promise.reject(error)
  );

  // Response interceptor — silently refresh the access token on 401
  client.interceptors.response.use(
    response => response,
    async error => {
      const originalRequest = error.config as typeof error.config & {
        _retry?: boolean;
      };
      const isAuthEndpoint = originalRequest?.url?.startsWith('/auth/');

      if (
        error.response?.status === 401 &&
        !isAuthEndpoint &&
        !originalRequest._retry
      ) {
        const storedRefresh = localStorage.getItem('refreshToken');

        if (!storedRefresh) {
          localStorage.removeItem('authToken');
          window.location.href = '/auth/login';
          return Promise.reject(error);
        }

        // If a refresh is already in flight, queue this request
        if (isRefreshing) {
          return new Promise<string>(resolve => {
            refreshQueue.push(resolve);
          }).then(newToken => {
            originalRequest.headers.Authorization = `Bearer ${newToken}`;
            return client(originalRequest);
          });
        }

        originalRequest._retry = true;
        isRefreshing = true;

        try {
          const { data } = await axios.post(`${baseURL}/auth/refresh`, {
            refreshToken: storedRefresh,
          });
          const { accessToken, refreshToken: newRefresh } = data.data ?? {};

          localStorage.setItem('authToken', accessToken);
          if (newRefresh) localStorage.setItem('refreshToken', newRefresh);

          client.defaults.headers.common.Authorization = `Bearer ${accessToken}`;
          refreshQueue.forEach(resolve => resolve(accessToken));
          refreshQueue = [];

          originalRequest.headers.Authorization = `Bearer ${accessToken}`;
          return client(originalRequest);
        } catch {
          localStorage.removeItem('authToken');
          localStorage.removeItem('refreshToken');
          refreshQueue = [];
          window.location.href = '/auth/login';
          return Promise.reject(error);
        } finally {
          isRefreshing = false;
        }
      }

      return Promise.reject(error);
    }
  );

  return client;
}
