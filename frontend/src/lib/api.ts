const API_URL = (process.env.NEXT_PUBLIC_API_URL || '/api').replace(/\/+$/, '');
let cachedCsrfToken: string | undefined;

export type ApiError = Error & {
  status?: number;
  code?: string;
  data?: unknown;
};

export function getErrorMessage(error: unknown, fallback = 'Có lỗi xảy ra') {
  if (error instanceof Error && error.message) {
    return error.message;
  }

  return fallback;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof Error;
}

function getCookie(name: string): string | undefined {
  if (typeof document === 'undefined') return undefined;
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2) return parts.pop()?.split(';').shift();
  return undefined;
}

async function ensureCsrfCookie() {
  try {
    const response = await fetch(`${API_URL}/csrf-token`, {
      method: 'GET',
      credentials: 'include',
    });
    const data = await response.json().catch(() => null);
    if (data?.token && typeof data.token === 'string') {
      cachedCsrfToken = data.token;
    }
  } catch {
    // Ignore bootstrap failures; the original request will surface the real error.
  }
}

export async function apiFetch<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const url = `${API_URL}${endpoint}`;

  const method = (options.method || 'GET').toUpperCase();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...((options.headers as Record<string, string>) || {}),
  };

  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method)) {
    let csrfToken = getCookie('XSRF-TOKEN');
    if (!csrfToken) {
      await ensureCsrfCookie();
      csrfToken = getCookie('XSRF-TOKEN') || cachedCsrfToken;
    } else {
      cachedCsrfToken = csrfToken;
    }
    if (csrfToken) {
      headers['X-XSRF-TOKEN'] = csrfToken;
    }
  }

  let response: Response;
  try {
    response = await fetch(url, {
      ...options,
      headers,
      credentials: 'include',
    });
  } catch {
    const error = new Error('Không thể kết nối đến máy chủ. Vui lòng thử lại sau.') as ApiError;
    error.status = 0;
    error.code = 'NETWORK_ERROR';
    throw error;
  }

  const contentType = response.headers.get('content-type');
  let data: any;

  if (contentType && contentType.includes('application/json')) {
    data = await response.json();
  } else {
    const text = await response.text();
    if (!response.ok) {
      const error = new Error(text || `Lỗi server (${response.status})`) as ApiError;
      error.status = response.status;
      error.code = 'HTTP_ERROR';
      throw error;
    }
    return text as any;
  }

  if (!response.ok) {
    const message =
      typeof data === 'object' && data !== null && 'message' in data && typeof data.message === 'string'
        ? data.message
        : 'Có lỗi xảy ra';
    const error = new Error(message) as ApiError;
    error.status = response.status;
    error.code =
      typeof data === 'object' && data !== null && 'code' in data && typeof data.code === 'string'
        ? data.code
        : 'HTTP_ERROR';
    error.data = data;
    throw error;
  }

  return data;
}
