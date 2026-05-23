import { afterEach, describe, expect, it, vi } from 'vitest';
import { z } from 'zod';
import { ApiError, SchemaError, apiFetch, type ApiContext } from '../apiClient.js';

const ctx: ApiContext = {
  baseUrl: 'http://127.0.0.1:7860',
  auth: null,
};
const ctxAuth: ApiContext = {
  baseUrl: 'http://127.0.0.1:7860',
  auth: { user: 'alice', pass: 'pw' },
};

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe('apiFetch', () => {
  it('parses 200 JSON via the schema', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: true, n: 5 }), { status: 200 })),
    );
    const Schema = z.object({ ok: z.boolean(), n: z.number() });
    const out = await apiFetch(ctx, '/x', Schema);
    expect(out).toEqual({ ok: true, n: 5 });
  });

  it('throws SchemaError on malformed JSON', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response(JSON.stringify({ ok: 'nope' }), { status: 200 })),
    );
    const Schema = z.object({ ok: z.boolean() });
    const err = await apiFetch(ctx, '/x', Schema).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(SchemaError);
    expect((err as SchemaError).issues[0]?.path).toEqual(['ok']);
  });

  it('throws ApiError on non-2xx with body excerpt', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(new Response('Internal Server Error', { status: 500 })),
    );
    const err = await apiFetch(ctx, '/x', z.unknown()).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect((err as ApiError).status).toBe(500);
    expect((err as ApiError).bodyExcerpt).toContain('Internal Server Error');
  });

  it('attaches Authorization: Basic when auth is set', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await apiFetch(ctxAuth, '/x', z.unknown());
    const call = fetchMock.mock.calls[0]!;
    const headers = (call[1] as RequestInit).headers as Record<string, string>;
    expect(headers.Authorization).toBe(`Basic ${btoa('alice:pw')}`);
  });

  it('attaches Content-Type for body POSTs', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await apiFetch(ctx, '/x', z.unknown(), {
      method: 'POST',
      body: JSON.stringify({ a: 1 }),
    });
    const call = fetchMock.mock.calls[0]!;
    const headers = (call[1] as RequestInit).headers as Record<string, string>;
    expect(headers['Content-Type']).toBe('application/json');
  });

  it('omits Content-Type for bodyless requests', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('{}', { status: 200 }));
    vi.stubGlobal('fetch', fetchMock);
    await apiFetch(ctx, '/x', z.unknown(), { method: 'POST' });
    const call = fetchMock.mock.calls[0]!;
    const headers = (call[1] as RequestInit).headers as Record<string, string>;
    expect(headers['Content-Type']).toBeUndefined();
  });

  it('rejects when the signal is aborted', async () => {
    const controller = new AbortController();
    vi.stubGlobal('fetch', (_url: string, init: RequestInit) => {
      return new Promise((_, reject) => {
        init.signal?.addEventListener('abort', () => {
          const err = new Error('aborted');
          err.name = 'AbortError';
          reject(err);
        });
      });
    });
    const p = apiFetch(ctx, '/x', z.unknown(), { signal: controller.signal });
    controller.abort();
    await expect(p).rejects.toThrow(/aborted/);
  });
});
