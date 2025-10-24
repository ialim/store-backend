import { decode as base64Decode } from 'base-64';

export type JwtClaims = {
  sub?: string;
  email?: string;
  roleId?: string;
  roleName?: string;
  [key: string]: unknown;
};

export function decodeJwt(token: string): JwtClaims | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = parts[1];
    const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(
      normalized.length + ((4 - (normalized.length % 4)) % 4),
      '=',
    );
    const json = base64Decode(padded);
    return JSON.parse(json) as JwtClaims;
  } catch (error) {
    console.warn('[jwt] Failed to decode token', error);
    return null;
  }
}
