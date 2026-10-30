import { describe, expect, it, vi } from 'vitest';
import type { AxiosInstance } from 'axios';
import { createImportsApi } from './imports';

function client() {
  return {
    get: vi.fn(),
    post: vi.fn(),
    patch: vi.fn(),
    delete: vi.fn(),
  } as unknown as AxiosInstance & {
    get: ReturnType<typeof vi.fn>;
    post: ReturnType<typeof vi.fn>;
    patch: ReturnType<typeof vi.fn>;
    delete: ReturnType<typeof vi.fn>;
  };
}

describe('imports API', () => {
  it('uploads files and unwraps the data envelope', async () => {
    const http = client();
    http.post.mockResolvedValue({
      data: { success: true, data: { batch: { id: 'b1' }, duplicates: 0 } },
    });
    const files = [
      { kind: 'trades' as const, fileName: 't.csv', content: 'x' },
      { kind: 'ledgers' as const, fileName: 'l.csv', content: 'y' },
    ];

    const result = await createImportsApi(http).createImport({
      source: 'KRAKEN',
      accountId: 'acc',
      files,
    });

    expect(http.post).toHaveBeenCalledWith('/imports', {
      source: 'KRAKEN',
      accountId: 'acc',
      files,
    });
    expect(result.batch?.id).toBe('b1');
  });

  it('rejects an unexpected response shape', async () => {
    const http = client();
    http.get.mockResolvedValue({ data: { success: true, data: 'nope' } });
    await expect(createImportsApi(http).getImport('b1')).rejects.toThrow(
      /Unexpected import response/
    );
  });

  it('preserves links and status for previously uploaded events', async () => {
    const http = client();
    const data = {
      batch: null,
      plan: null,
      duplicates: 48,
      warnings: [],
      existingBatches: [
        {
          id: 'previous',
          accountId: 'acc',
          accountName: 'Kraken',
          status: 'PENDING_REVIEW',
          eventCount: 48,
        },
      ],
    };
    http.post.mockResolvedValue({ data: { success: true, data } });
    expect(
      await createImportsApi(http).createImport({
        source: 'KRAKEN',
        accountId: 'acc',
        files: [],
      })
    ).toEqual(data);
  });

  it('lists imports, tolerating a malformed payload', async () => {
    const http = client();
    http.get.mockResolvedValueOnce({ data: { data: [{ id: 'b1' }] } });
    http.get.mockResolvedValueOnce({ data: { data: null } });
    const api = createImportsApi(http);
    expect(await api.getImports()).toEqual([{ id: 'b1' }]);
    expect(await api.getImports()).toEqual([]);
  });

  it('sends resolutions with PATCH, including null to clear an allocation', async () => {
    const http = client();
    http.patch.mockResolvedValue({ data: { data: { plan: {} } } });
    await createImportsApi(http).resolveImportEvent('b1', 'e1', {
      allocations: null,
    });
    expect(http.patch).toHaveBeenCalledWith('/imports/b1/events/e1', {
      allocations: null,
    });
  });

  it('commits everything or a chosen subset, and discards', async () => {
    const http = client();
    http.post.mockResolvedValue({
      data: { data: { createdPositionIds: [], appliedEvents: 0 } },
    });
    http.delete.mockResolvedValue({ data: { success: true } });
    const api = createImportsApi(http);

    await api.commitImport('b1');
    expect(http.post).toHaveBeenLastCalledWith('/imports/b1/commit', {});
    await api.commitImport('b1', ['e1']);
    expect(http.post).toHaveBeenLastCalledWith('/imports/b1/commit', {
      eventIds: ['e1'],
    });
    await api.discardImport('b1');
    expect(http.delete).toHaveBeenCalledWith('/imports/b1');
  });
});
