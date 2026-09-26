// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { clearQueuedWritesMock } = vi.hoisted(() => ({
  clearQueuedWritesMock: vi.fn(),
}));

vi.mock('./offline-write-queue', () => ({
  clearQueuedWrites: clearQueuedWritesMock,
}));

import { clearClientSession } from './session';

function createQueryClient() {
  return { clear: vi.fn() } as unknown as Parameters<
    typeof clearClientSession
  >[0];
}

describe('clearClientSession', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.setItem('authToken', 'a');
    localStorage.setItem('refreshToken', 'r');
  });

  it('drops tokens, queued writes and the query cache', async () => {
    const queryClient = createQueryClient();

    await clearClientSession(queryClient);

    expect(localStorage.getItem('authToken')).toBeNull();
    expect(localStorage.getItem('refreshToken')).toBeNull();
    expect(clearQueuedWritesMock).toHaveBeenCalledOnce();
    expect(queryClient.clear).toHaveBeenCalledOnce();
  });

  it('deletes only caches that can hold authenticated data', async () => {
    const deleteCache = vi.fn().mockResolvedValue(true);
    vi.stubGlobal('caches', {
      keys: vi.fn().mockResolvedValue(['apis-v1', 'pages-v2', 'static-assets']),
      delete: deleteCache,
    });

    await clearClientSession(createQueryClient());

    expect(deleteCache).toHaveBeenCalledWith('apis-v1');
    expect(deleteCache).toHaveBeenCalledWith('pages-v2');
    expect(deleteCache).not.toHaveBeenCalledWith('static-assets');

    vi.unstubAllGlobals();
  });
});
