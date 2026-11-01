// @vitest-environment jsdom
import type { ReactNode } from 'react';
import { act, renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const { post, get } = vi.hoisted(() => ({ post: vi.fn(), get: vi.fn() }));
vi.mock('axios', () => ({ default: { create: () => ({ post, get }) } }));
vi.mock('@/lib/api-client', async () => {
  const axios = await import('axios');
  const { createAccountsApi } = await import('@/lib/api/accounts');
  return { apiClient: createAccountsApi(axios.default.create()) };
});
import {
  useOpeningPreview,
  useOpeningStatements,
  useSaveOpeningStatement,
} from './api';
const input = {
  openingDate: '2026-10-01',
  cashBalances: [{ currency: 'AUD', amount: '0.000000000001' }],
};
function setup() {
  const client = new QueryClient();
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
  return {
    ...renderHook(() => useOpeningPreview(), { wrapper }),
    client,
    invalidate,
  };
}
function queryWrapper(client: QueryClient) {
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={client}>{children}</QueryClientProvider>
    );
  };
}
beforeEach(() => {
  vi.clearAllMocks();
});
afterEach(() => {
  vi.restoreAllMocks();
});
describe('read-only opening preview API and hook', () => {
  it('lists drafts by account and cursor', async () => {
    get.mockResolvedValue({
      data: {
        success: true,
        data: { statements: [], nextBeforeVersion: null },
      },
    });
    const client = new QueryClient();
    const { result } = renderHook(() => useOpeningStatements('a1', 5), {
      wrapper: queryWrapper(client),
    });
    await waitFor(() => expect(result.current.isSuccess).toBe(true));
    expect(get).toHaveBeenCalledWith('/accounts/a1/opening-statements', {
      params: { beforeVersion: 5 },
    });
    expect(
      client.getQueryCache().find({ queryKey: ['opening-statements', 'a1', 5] })
    ).toBeDefined();
    client.clear();
  });
  it('surfaces draft-history network errors without retries or empty-list success', async () => {
    get.mockRejectedValue(new Error('History unavailable'));
    const client = new QueryClient();
    const { result } = renderHook(() => useOpeningStatements('a1'), {
      wrapper: queryWrapper(client),
    });
    await waitFor(() => expect(result.current.isError).toBe(true));
    expect(result.current.error?.message).toBe('History unavailable');
    expect(result.current.data).toBeUndefined();
    expect(get).toHaveBeenCalledTimes(1);
    client.clear();
  });
  it('saves using the reviewed fingerprint and invalidates only that account draft history', async () => {
    post.mockResolvedValue({
      data: {
        success: true,
        data: { created: true, statement: { id: 's1', state: 'DRAFT' } },
      },
    });
    const client = new QueryClient();
    const invalidate = vi.spyOn(client, 'invalidateQueries');
    const { result } = renderHook(() => useSaveOpeningStatement(), {
      wrapper: queryWrapper(client),
    });
    const payload = { ...input, sourceFingerprint: 'a'.repeat(64) };
    await act(async () => {
      await result.current.mutateAsync({ accountId: 'a1', input: payload });
    });
    expect(post).toHaveBeenCalledWith(
      '/accounts/a1/opening-statements',
      payload
    );
    expect(invalidate).toHaveBeenCalledExactlyOnceWith({
      queryKey: ['opening-statements', 'a1'],
    });
    client.clear();
  });
  it('rejects offline draft saves without network calls or delayed replay', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const client = new QueryClient();
    const { result } = renderHook(() => useSaveOpeningStatement(), {
      wrapper: queryWrapper(client),
    });
    await act(async () => {
      await expect(
        result.current.mutateAsync({
          accountId: 'a1',
          input: { ...input, sourceFingerprint: 'a'.repeat(64) },
        })
      ).rejects.toThrow('Offline changes are not queued');
    });
    expect(post).not.toHaveBeenCalled();
    expect(result.current.isPaused).toBe(false);
    client.clear();
  });
  it('uses the account endpoint, preserves decimals and does not invalidate financial queries', async () => {
    const preview = { mode: 'PREVIEW_ONLY' };
    post.mockResolvedValue({ data: { success: true, data: preview } });
    const { result, client, invalidate } = setup();
    let response: unknown;
    await act(async () => {
      response = await result.current.mutateAsync({ accountId: 'a1', input });
    });
    expect(response).toEqual(preview);
    expect(post).toHaveBeenCalledWith('/accounts/a1/opening-preview', input);
    expect(invalidate).not.toHaveBeenCalled();
    client.clear();
  });
  it('does not retry failed requests', async () => {
    post.mockRejectedValue(new Error('Unavailable'));
    const { result, client } = setup();
    await act(async () => {
      await expect(
        result.current.mutateAsync({ accountId: 'a1', input })
      ).rejects.toThrow('Unavailable');
    });
    expect(post).toHaveBeenCalledTimes(1);
    client.clear();
  });
  it('rejects immediately offline without pausing a mutation for later replay', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { result, client } = setup();
    await act(async () => {
      await expect(
        result.current.mutateAsync({ accountId: 'a1', input })
      ).rejects.toThrow('Reconnect');
    });
    expect(post).not.toHaveBeenCalled();
    expect(result.current.isPaused).toBe(false);
    client.clear();
  });
});
