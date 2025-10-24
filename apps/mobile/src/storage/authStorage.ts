import AsyncStorage from '@react-native-async-storage/async-storage';
import { SECURE_STORAGE_KEYS } from '../config';

export type StoredUser = {
  id: string;
  email: string;
  roleId: string;
  roleName?: string;
};

export async function loadAuthState() {
  const [[, token], [, userJson], [, permissionsJson]] = await AsyncStorage.multiGet([
    SECURE_STORAGE_KEYS.TOKEN,
    SECURE_STORAGE_KEYS.USER,
    SECURE_STORAGE_KEYS.PERMISSIONS,
  ]);

  const user = userJson ? (JSON.parse(userJson) as StoredUser) : null;
  const permissions = permissionsJson
    ? (JSON.parse(permissionsJson) as string[])
    : [];

  return {
    token,
    user,
    permissions,
  };
}

export async function persistAuthState({
  token,
  user,
  permissions,
}: {
  token: string | null;
  user: StoredUser | null;
  permissions: string[];
}) {
  const commands: [string, string | null][] = [
    [SECURE_STORAGE_KEYS.TOKEN, token],
    [SECURE_STORAGE_KEYS.USER, user ? JSON.stringify(user) : null],
    [
      SECURE_STORAGE_KEYS.PERMISSIONS,
      permissions.length ? JSON.stringify(permissions) : null,
    ],
  ];

  await AsyncStorage.multiRemove(
    commands.filter(([, value]) => value === null).map(([key]) => key),
  );

  const entriesToSet = commands.filter(([, value]) => value !== null) as [
    string,
    string,
  ][];

  if (entriesToSet.length) {
    await AsyncStorage.multiSet(entriesToSet);
  }
}

export async function clearAuthState() {
  await AsyncStorage.multiRemove([
    SECURE_STORAGE_KEYS.TOKEN,
    SECURE_STORAGE_KEYS.USER,
    SECURE_STORAGE_KEYS.PERMISSIONS,
  ]);
}
