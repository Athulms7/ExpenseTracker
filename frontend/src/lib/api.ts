const API_BASE_URL = import.meta.env.VITE_API_URL
  || `${window.location.protocol}//${window.location.hostname}:8000`;

interface ApiErrorBody {
  detail?: unknown;
}

interface ValidationIssue {
  loc?: unknown;
  msg?: unknown;
}

export class ApiError extends Error {
  constructor(message: string, public readonly status?: number) {
    super(message);
    this.name = 'ApiError';
  }
}

function describeDetail(detail: unknown): string {
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail)) {
    return detail.map((rawIssue: unknown) => {
      const issue = rawIssue as ValidationIssue;
      const location = Array.isArray(issue.loc) ? issue.loc : [];
      const field = location.filter((part): part is string | number =>
        (typeof part === 'string' || typeof part === 'number') && part !== 'body',
      ).join('.');
      const message = typeof issue.msg === 'string' ? issue.msg : 'Invalid value';
      return `${field ? `${field}: ` : ''}${message}`;
    }).join(' ');
  }
  return 'The request could not be completed.';
}

export async function apiRequest<T>(path: string, options: RequestInit = {}): Promise<T> {
  let response: Response;
  try {
    const headers = new Headers(options.headers);
    if (options.body && !headers.has('Content-Type')) {
      headers.set('Content-Type', 'application/json');
    }
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...options,
      credentials: 'include',
      headers,
    });
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') throw error;
    throw new ApiError(`Cannot reach the API at ${API_BASE_URL}. Check that the API server is running.`);
  }

  if (!response.ok) {
    let payload: ApiErrorBody | null = null;
    try { payload = await response.json() as ApiErrorBody; } catch { /* Use a general error below. */ }
    const message = describeDetail(payload?.detail);
    throw new ApiError(
      response.status === 503 ? message : `${message} (HTTP ${response.status})`,
      response.status,
    );
  }

  if (response.status === 204) return undefined as T;
  try { return await response.json() as T; }
  catch { throw new ApiError('The API returned an unreadable response.'); }
}

export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : 'An unexpected error occurred.';
}
