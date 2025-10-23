import Constants from 'expo-constants';

const FALLBACK_GRAPHQL_URL = 'http://localhost:3000/graphql';

function resolveGraphqlUrl(): string {
  const fromEnv = process.env.EXPO_PUBLIC_GRAPHQL_URL;
  if (fromEnv && fromEnv.trim().length > 0) {
    return fromEnv.trim();
  }

  const fromExtra = Constants.expoConfig?.extra?.graphqlUrl;
  if (typeof fromExtra === 'string' && fromExtra.trim().length > 0) {
    return fromExtra.trim();
  }

  console.warn(
    '[config] Using fallback GraphQL URL. Set EXPO_PUBLIC_GRAPHQL_URL for per-env overrides.',
  );
  return FALLBACK_GRAPHQL_URL;
}

export const GRAPHQL_ENDPOINT = resolveGraphqlUrl();

export const SECURE_STORAGE_KEYS = {
  TOKEN: 'auth.token',
  USER: 'auth.user',
  PERMISSIONS: 'auth.permissions',
} as const;
