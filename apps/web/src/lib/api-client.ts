// Typed fetch wrapper used by every React Query hook.
//
// ADR-7 auth-ready: the Authorization header is a placeholder in v1. When
// v2 adds real auth, replace getAuthToken() with the JWT from the auth
// store — no other call site changes.
//
// The fetch wrapper raises a typed ApiError on non-2xx responses so React
// Query's onError paths see structured data and the global error boundary
// can render a sensible fallback.

function getAuthToken(): string {
  return 'DEV';
}

export class ApiError extends Error {
  public readonly status: number;
  public readonly code: string;
  public readonly details: unknown;

  constructor(message: string, status: number, code: string, details?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

type ApiErrorPayload = {
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export type RequestOptions = Omit<RequestInit, 'body'> & {
  body?: unknown;
  params?: Record<string, string | number | boolean | undefined>;
};

function buildUrl(
  path: string,
  params?: RequestOptions['params'],
): string {
  if (!params) return path;
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined) search.append(key, String(value));
  }
  const qs = search.toString();
  return qs ? `${path}?${qs}` : path;
}

export async function apiFetch<TResponse>(
  path: string,
  options: RequestOptions = {},
): Promise<TResponse> {
  const { body, params, headers, ...rest } = options;
  const url = buildUrl(path.startsWith('/api') ? path : `/api${path}`, params);

  const init: RequestInit = {
    ...rest,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${getAuthToken()}`,
      ...headers,
    },
  };
  if (body !== undefined) {
    init.body = typeof body === 'string' ? body : JSON.stringify(body);
  }

  const res = await fetch(url, init);

  if (res.status === 204) {
    return null as TResponse;
  }

  const text = await res.text();
  const payload = text ? (JSON.parse(text) as unknown) : null;

  if (!res.ok) {
    const errPayload = payload as ApiErrorPayload | null;
    throw new ApiError(
      errPayload?.error?.message ?? res.statusText,
      res.status,
      errPayload?.error?.code ?? 'HTTP_ERROR',
      errPayload?.error?.details,
    );
  }

  return payload as TResponse;
}

// Convenience verbs
export const api = {
  get: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(path, { ...options, method: 'GET' }),
  post: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) => apiFetch<T>(path, { ...options, method: 'POST', body }),
  patch: <T>(
    path: string,
    body?: unknown,
    options?: Omit<RequestOptions, 'method' | 'body'>,
  ) => apiFetch<T>(path, { ...options, method: 'PATCH', body }),
  delete: <T>(path: string, options?: Omit<RequestOptions, 'method' | 'body'>) =>
    apiFetch<T>(path, { ...options, method: 'DELETE' }),
};
