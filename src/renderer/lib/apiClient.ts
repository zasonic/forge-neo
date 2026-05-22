import type { z } from 'zod';

export interface ApiContext {
  baseUrl: string;
  auth: { user: string; pass: string } | null;
}

export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly url: string,
    public readonly bodyExcerpt: string,
  ) {
    super(`${status} ${url}: ${bodyExcerpt.slice(0, 200)}`);
    this.name = 'ApiError';
  }
}

export class SchemaError extends Error {
  constructor(
    public readonly url: string,
    public readonly issues: z.ZodIssue[],
  ) {
    const summary = issues
      .map((i) => `  ${i.path.join('.') || '(root)'}: ${i.message}`)
      .join('\n');
    super(`Response schema mismatch: ${url}\n${summary}`);
    this.name = 'SchemaError';
  }
}

function authHeader(auth: ApiContext['auth']): Record<string, string> {
  if (!auth) return {};
  const token = btoa(`${auth.user}:${auth.pass}`);
  return { Authorization: `Basic ${token}` };
}

export async function apiFetch<S extends z.ZodTypeAny>(
  ctx: ApiContext,
  path: string,
  schema: S,
  init: RequestInit = {},
): Promise<z.output<S>> {
  const url = `${ctx.baseUrl}${path}`;
  const headers: Record<string, string> = {
    ...authHeader(ctx.auth),
    ...(init.body != null ? { 'Content-Type': 'application/json' } : {}),
    ...((init.headers as Record<string, string> | undefined) ?? {}),
  };
  const res = await fetch(url, { ...init, headers });
  if (!res.ok) {
    const body = await res.text().catch(() => '');
    throw new ApiError(res.status, url, body);
  }
  const json = (await res.json()) as unknown;
  const parsed = schema.safeParse(json);
  if (!parsed.success) {
    throw new SchemaError(url, parsed.error.issues);
  }
  return parsed.data;
}
