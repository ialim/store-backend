const rawGraphqlUrl = (import.meta as any).env?.VITE_GRAPHQL_URL ?? '/graphql';
const rawApiBase = (import.meta as any).env?.VITE_API_BASE ?? '';

function getWindowOrigin(): string {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'http://localhost';
}

function toAbsoluteBase(url: string, fallbackOrigin: string): string {
  try {
    const absolute = new URL(url, fallbackOrigin);
    const path = absolute.pathname.endsWith('/')
      ? absolute.pathname.slice(0, -1)
      : absolute.pathname;
    return `${absolute.origin}${path || ''}`;
  } catch {
    return url;
  }
}

export function getGraphqlUrlAbsolute(): string {
  const origin = getWindowOrigin();
  return toAbsoluteBase(rawGraphqlUrl, origin);
}

export function getApiBase(): string {
  const origin = getWindowOrigin();
  if (rawApiBase) {
    return toAbsoluteBase(rawApiBase, origin);
  }
  // Fall back to GraphQL origin
  try {
    const gqlUrl = new URL(rawGraphqlUrl, origin);
    return gqlUrl.origin;
  } catch {
    return origin;
  }
}

export function getAuthToken(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem('token');
  } catch {
    return null;
  }
}
