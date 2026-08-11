/**
 * Resolves the backend API origin so auth works on both localhost and LAN IPs / phones.
 *
 * In Vite development: use same-origin (empty base) so requests go to
 * http://<page-host>:5173/api → Vite proxies to 127.0.0.1:5000.
 * That avoids phone/LAN "Failed to fetch" when Windows Firewall blocks port 5000.
 *
 * In production builds: use VITE_API_BASE_URL / VITE_API_URL as configured.
 */

/**
 * Returns true when a hostname is a loopback address.
 */
function isLoopbackHost(hostname: string): boolean {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '[::1]';
}

/**
 * Reads the configured API base from Vite env (fallback included).
 */
function getConfiguredApiUrl(): URL {
  const configured =
    (typeof import.meta !== 'undefined' &&
      (import.meta.env?.VITE_API_BASE_URL || import.meta.env?.VITE_API_URL)) ||
    'http://127.0.0.1:5000';

  try {
    return new URL(configured);
  } catch {
    return new URL('http://127.0.0.1:5000');
  }
}

/**
 * Builds the API base URL for the current browser context.
 * Dev → '' (same origin + Vite proxy). Prod → configured absolute origin.
 */
export function resolveApiBaseUrl(): string {
  // Phone / PC on Vite: always use same-origin proxy in development.
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    return '';
  }

  const configured = getConfiguredApiUrl();

  if (typeof window === 'undefined') {
    configured.hostname = configured.hostname === 'localhost' ? '127.0.0.1' : configured.hostname;
    return configured.origin;
  }

  const pageHost = window.location.hostname;

  if (isLoopbackHost(pageHost)) {
    configured.hostname = '127.0.0.1';
    return configured.origin;
  }

  // Non-dev fallback: call API on the same LAN host as the page.
  configured.hostname = pageHost;
  if (configured.protocol === 'https:' && /^(\d{1,3}\.){3}\d{1,3}$/.test(pageHost)) {
    configured.protocol = 'http:';
  }
  return configured.origin;
}
