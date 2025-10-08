import { PERMISSIONS } from '@shared/permissions';

export type { PermissionAction, PermissionName } from '@shared/permissions';

export const permissionList = (
  ...perms: Array<string | undefined | null>
): string[] =>
  perms.filter(
    (perm): perm is string => typeof perm === 'string' && perm.length > 0,
  );

export { PERMISSIONS };
