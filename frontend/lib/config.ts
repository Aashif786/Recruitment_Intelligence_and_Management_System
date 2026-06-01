/**
 * Client-side configuration for the Automated Recruitment System
 */

let rawApiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL || 'http://127.0.0.1:10000';

// In browser environments, upgrade API URL to HTTPS if the frontend is loaded over HTTPS to prevent Mixed Content blocking.
if (typeof window !== 'undefined' && window.location.protocol === 'https:') {
  if (rawApiBaseUrl.startsWith('http://')) {
    try {
      const urlObj = new URL(rawApiBaseUrl, window.location.origin);
      if (urlObj.hostname === window.location.hostname || rawApiBaseUrl.startsWith('/')) {
        rawApiBaseUrl = rawApiBaseUrl.replace(/^http:\/\//, 'https://');
      }
    } catch (e) {
      rawApiBaseUrl = rawApiBaseUrl.replace(/^http:\/\//, 'https://');
    }
  }
}

export const API_BASE_URL = rawApiBaseUrl.replace(/\/+$/, '');

// Safeguard: warn in production if API base URL is missing (fallback remains localhost).
if (typeof window !== 'undefined') {
  const isProd = process.env.NODE_ENV === 'production'
  if (isProd && !process.env.NEXT_PUBLIC_API_BASE_URL) {
    // eslint-disable-next-line no-console
    console.warn('[config] NEXT_PUBLIC_API_BASE_URL is not set in production; falling back to localhost')
  }
}

// Other global constants can go here
export const APP_NAME = 'Automated Recruitment System';
