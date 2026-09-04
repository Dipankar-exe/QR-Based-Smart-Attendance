import { ApiResponse } from "@/types";

/**
 * Resolves the backend API base URL based on environment variables and client domain.
 * - Local mode (localhost, 127.0.0.1, 192.168.0.2): NEXT_PUBLIC_API_URL
 * - Cloudflare mode (*.trycloudflare.com): NEXT_PUBLIC_CLOUDFLARE_API_URL
 */
export function getApiBaseUrl(): string {
  let targetUrl = process.env.NEXT_PUBLIC_API_URL || "https://192.168.0.2:5000/api";

  if (typeof window !== "undefined") {
    const host = window.location.hostname;

    if (host.endsWith(".trycloudflare.com")) {
      if (process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL) {
        targetUrl = process.env.NEXT_PUBLIC_CLOUDFLARE_API_URL;
      } else if (process.env.NEXT_PUBLIC_API_URL) {
        targetUrl = process.env.NEXT_PUBLIC_API_URL;
        console.warn(
          "[API] Warning: Accessed via Cloudflare domain (" +
            host +
            ") but NEXT_PUBLIC_CLOUDFLARE_API_URL is not set. Falling back to NEXT_PUBLIC_API_URL."
        );
      } else {
        targetUrl = "https://192.168.0.2:5000/api";
      }
    } else {
      targetUrl = process.env.NEXT_PUBLIC_API_URL || "https://192.168.0.2:5000/api";
    }
  }

  // Clean and sanitize string to prevent malformed environment variable assignments
  let cleanUrl = targetUrl.trim();

  // Strip duplicate key prefixes if environment variable was improperly assigned
  cleanUrl = cleanUrl.replace(/^(NEXT_PUBLIC_[A-Z_]+=)+/, "");

  // Strip surrounding double/single quotes
  cleanUrl = cleanUrl.replace(/^["']|["']$/g, "").trim();

  // Strip trailing slashes
  cleanUrl = cleanUrl.replace(/\/+$/, "");

  // Ensure /api path suffix is present
  if (!cleanUrl.endsWith("/api")) {
    cleanUrl = `${cleanUrl}/api`;
  }

  if (typeof window !== "undefined" && !(window as any).__api_logged) {
    (window as any).__api_logged = true;
    console.log("[API] hostname:", window.location.hostname);
    console.log("[API] base URL:", cleanUrl);
  }

  return cleanUrl;
}

export function getAvatarUrl(avatarUrl?: string | null): string {
  if (!avatarUrl) return "";
  if (avatarUrl.startsWith("http://") || avatarUrl.startsWith("https://") || avatarUrl.startsWith("data:")) {
    return avatarUrl;
  }
  const apiBase = getApiBaseUrl().replace(/\/api\/?$/, "");
  const cleanPath = avatarUrl.startsWith("/") ? avatarUrl : `/${avatarUrl}`;
  return `${apiBase}${cleanPath}`;
}

// Single-flight refresh lock state
let refreshPromise: Promise<boolean> | null = null;

// Callbacks for global auth state reset on refresh failure
let onAuthFailedCallback: (() => void) | null = null;

export const setOnAuthFailedCallback = (callback: (() => void) | null) => {
  onAuthFailedCallback = callback;
};

const performTokenRefresh = async (): Promise<boolean> => {
  try {
    const baseUrl = getApiBaseUrl().replace(/\/$/, "");
    const res = await fetch(`${baseUrl}/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      signal: AbortSignal.timeout(15000),
    });

    if (res.ok) {
      return true;
    }
    return false;
  } catch {
    return false;
  } finally {
    refreshPromise = null;
  }
};

export interface FetchOptions extends RequestInit {
  retryCount?: number;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: FetchOptions = {}
): Promise<ApiResponse<T>> {
  const { retryCount = 0, headers, signal, ...customOptions } = options;

  const baseUrl = getApiBaseUrl().replace(/\/$/, "");
  const cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`;
  const url = endpoint.startsWith("http") ? endpoint : `${baseUrl}${cleanEndpoint}`;

  const defaultHeaders: Record<string, string> = {
    "Content-Type": "application/json",
  };

  const fetchConfig: RequestInit = {
    ...customOptions,
    headers: {
      ...defaultHeaders,
      ...headers,
    },
    credentials: "include", // CRITICAL: Always attach HttpOnly cookies
    signal: signal || AbortSignal.timeout(15000), // Prevent infinite request hangs
  };

  try {
    const response = await fetch(url, fetchConfig);
    const isAuthRoute =
      endpoint.includes("/auth/login") ||
      endpoint.includes("/auth/logout") ||
      endpoint.includes("/auth/refresh");

    // Intercept 401 Unauthorized for non-auth endpoints
    if (response.status === 401 && !isAuthRoute && retryCount < 1) {
      if (!refreshPromise) {
        refreshPromise = performTokenRefresh();
      }

      const refreshSuccess = await refreshPromise;

      if (refreshSuccess) {
        // Retry original request ONCE
        return apiFetch<T>(endpoint, {
          ...options,
          retryCount: retryCount + 1,
        });
      } else {
        // Refresh failed: Notify AuthContext to transition to unauthenticated
        if (onAuthFailedCallback) {
          onAuthFailedCallback();
        }

        const data = await response.json().catch(() => ({}));
        throw {
          status: response.status,
          message: data.message || "Session expired. Please log in again.",
        };
      }
    }

    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw {
        status: response.status,
        message: data.message || `Request failed with status ${response.status}`,
      };
    }

    return data as ApiResponse<T>;
  } catch (err: any) {
    if (err.status && err.message) {
      throw err;
    }
    throw {
      status: 0,
      message: err.message || "Network error. Please check your connection.",
    };
  }
}
