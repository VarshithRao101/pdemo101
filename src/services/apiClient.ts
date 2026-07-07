/**
 * Light-weight HTTP client wrapper using native fetch.
 * Reads the JWT token from sessionStorage and automatically includes it
 * in the Authorization header of all outgoing requests.
 */
export const getApiBaseUrl = (): string => {
  const fallbackUrl = import.meta.env.DEV ? 'http://localhost:5000/api' : '/api';
  return (import.meta.env.VITE_API_BASE_URL || fallbackUrl).replace(/\/$/, '');
};

export interface ApiError extends Error {
  status?: number;
  data?: any;
}

export const apiClient = {
  async get<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  },

  async post<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  },

  async patch<T = any>(endpoint: string, body?: any, options: RequestInit = {}): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body instanceof FormData ? body : (body ? JSON.stringify(body) : undefined),
    });
  },

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    // SECURITY NOTE: Storing the token in sessionStorage is simple and convenient for this
    // prototype demo phase, but in a production environment, tokens should be managed via secure
    // httpOnly cookies or secure memory variables to prevent XSS-based token extraction.
    const token = sessionStorage.getItem('auth_token');
    
    const headers: Record<string, string> = {
      ...((options.headers as Record<string, string>) || {}),
    };

    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${getApiBaseUrl()}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`;
    
    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const error: ApiError = new Error(errorData.message || `Request failed with status ${response.status}`);
      error.status = response.status;
      error.data = errorData;
      throw error;
    }

    return response.json();
  },
};
