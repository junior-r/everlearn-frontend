export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export interface RequestOptions {
  method?: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
  body?: unknown;
  headers?: Record<string, string>;
  // Sends the request without the access token and without the refresh-and-retry step
  skipAuth?: boolean;
  signal?: AbortSignal;
}

export interface ApiClientOptions {
  baseUrl: string;
  refreshPath: string;
  fetch?: typeof fetch;
}

export type TokenListener = (token: string | null) => void;

export interface ApiClient {
  request<T>(path: string, options?: RequestOptions): Promise<T>;
  getAccessToken(): string | null;
  setAccessToken(token: string | null): void;
  /** Calls the listener whenever the access token changes; returns an unsubscribe function. */
  subscribe(listener: TokenListener): () => void;
}

interface ErrorBody {
  code?: unknown;
  message?: unknown;
}

function messageFrom(body: ErrorBody, fallback: string): string {
  if (typeof body.message === "string") {
    return body.message;
  }
  if (Array.isArray(body.message)) {
    return body.message.join(". ");
  }
  return fallback;
}

function serialize(body: unknown): string | undefined {
  return body === undefined ? undefined : JSON.stringify(body);
}

async function toApiError(response: Response): Promise<ApiError> {
  const body = (await response.json().catch(() => ({}))) as ErrorBody;
  const code = typeof body.code === "string" ? body.code : `HTTP_${response.status}`;
  return new ApiError(response.status, code, messageFrom(body, response.statusText));
}

/**
 * Builds the HTTP client used by every API call. It attaches the in-memory
 * access token and, on a 401, refreshes it once and retries the request.
 */
export function createApiClient(options: ApiClientOptions): ApiClient {
  const doFetch = options.fetch ?? globalThis.fetch.bind(globalThis);
  const listeners = new Set<TokenListener>();
  let accessToken: string | null = null;
  let refreshInFlight: Promise<string | null> | null = null;

  function setAccessToken(token: string | null): void {
    if (token === accessToken) {
      return;
    }
    accessToken = token;
    listeners.forEach((listener) => listener(token));
  }

  async function send(path: string, request: RequestOptions): Promise<Response> {
    const headers: Record<string, string> = { Accept: "application/json", ...request.headers };
    // For FormData the browser must set the multipart boundary itself
    const isForm = request.body instanceof FormData;
    if (request.body !== undefined && !isForm) {
      headers["Content-Type"] = "application/json";
    }
    if (accessToken && !request.skipAuth) {
      headers.Authorization = `Bearer ${accessToken}`;
    }
    try {
      return await doFetch(`${options.baseUrl}${path}`, {
        method: request.method ?? "GET",
        headers,
        body: isForm ? (request.body as FormData) : serialize(request.body),
        // Required for the browser to send the httpOnly refresh cookie
        credentials: "include",
        signal: request.signal,
      });
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error;
      }
      throw new ApiError(0, "NETWORK_ERROR", "Could not reach the server");
    }
  }

  async function parse<T>(response: Response): Promise<T> {
    if (!response.ok) {
      throw await toApiError(response);
    }
    if (response.status === 204) {
      return undefined as T;
    }
    return (await response.json()) as T;
  }

  async function refresh(): Promise<string | null> {
    try {
      const response = await send(options.refreshPath, { method: "POST", skipAuth: true });
      const body = await parse<{ accessToken: string }>(response);
      setAccessToken(body.accessToken);
      return body.accessToken;
    } catch {
      setAccessToken(null);
      return null;
    }
  }

  // Concurrent 401s share one refresh call instead of each starting their own
  function refreshOnce(): Promise<string | null> {
    refreshInFlight ??= refresh().finally(() => {
      refreshInFlight = null;
    });
    return refreshInFlight;
  }

  async function request<T>(path: string, request: RequestOptions = {}): Promise<T> {
    const response = await send(path, request);
    if (response.status === 401 && !request.skipAuth && (await refreshOnce())) {
      return parse<T>(await send(path, request));
    }
    return parse<T>(response);
  }

  return {
    request,
    getAccessToken: () => accessToken,
    setAccessToken,
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}
