import { notifyInvalidToken } from '../services/phpApi';

/**
 * Wraps fetch and auto-detects invalid/expired token responses (401 or
 * "Invalid token" style messages). Triggers global auto-logout via
 * notifyInvalidToken(). Use this instead of bare fetch() for authenticated
 * API calls.
 */
export const authFetch = async (
  url: string,
  init?: RequestInit,
): Promise<Response> => {
  const response = await fetch(url, init);

  if (response.status === 401) {
    notifyInvalidToken();
    return response;
  }

  // Clone so the caller can still read the body normally
  try {
    const clone = response.clone();
    const text = await clone.text();
    const lower = text.toLowerCase();
    if (
      lower.includes('invalid token') ||
      lower.includes('token expired') ||
      lower.includes('unauthorized') ||
      lower.includes('unauthorised') ||
      lower.includes('session expired')
    ) {
      notifyInvalidToken();
    }
  } catch {
    // Ignore body-read errors; caller will handle their own parsing
  }

  return response;
};
