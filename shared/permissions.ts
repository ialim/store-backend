export const PERMISSION_ACTIONS = [
  'CREATE',
  'READ',
  'UPDATE',
  'DELETE',
  'APPROVE',
] as const;

export type PermissionAction = (typeof PERMISSION_ACTIONS)[number];

export const PERMISSION_MODULES = {
  user: 'User',
  product: 'Product',
  analytics: 'Analytics',
  customerProfile: 'CustomerProfile',
  resellerProfile: 'ResellerProfile',
  staff: 'Staff',
  store: 'Store',
  stock: 'Stock',
  purchase: 'Purchase',
  payment: 'Payment',
  event: 'Event',
  sale: 'Sale',
  order: 'Order',
  return: 'Return',
  asset: 'Asset',
  devtool: 'DevTool',
  support: 'Support',
  role: 'Role',
} as const;

export type PermissionModuleKey = keyof typeof PERMISSION_MODULES;
export type PermissionModule = (typeof PERMISSION_MODULES)[PermissionModuleKey];

type ModulePermissionMap = {
  [K in PermissionModuleKey]: Partial<Record<PermissionAction, string>>;
};

export const PERMISSIONS: ModulePermissionMap = {
  user: {
    CREATE: 'USER_CREATE',
    READ: 'USER_READ',
    UPDATE: 'USER_UPDATE',
    DELETE: 'USER_DELETE',
  },
  product: {
    CREATE: 'PRODUCT_CREATE',
    READ: 'PRODUCT_READ',
    UPDATE: 'PRODUCT_UPDATE',
    DELETE: 'PRODUCT_DELETE',
    APPROVE: 'PRODUCT_APPROVE',
  },
  analytics: {
    READ: 'ANALYTICS_READ',
  },
  customerProfile: {
    READ: 'CUSTOMER_PROFILE_READ',
    UPDATE: 'CUSTOMER_PROFILE_UPDATE',
    APPROVE: 'CUSTOMER_PROFILE_APPROVE',
  },
  resellerProfile: {
    CREATE: 'RESELLER_PROFILE_CREATE',
    READ: 'RESELLER_PROFILE_READ',
    UPDATE: 'RESELLER_PROFILE_UPDATE',
    DELETE: 'RESELLER_PROFILE_DELETE',
    APPROVE: 'RESELLER_PROFILE_APPROVE',
  },
  staff: {
    CREATE: 'STAFF_CREATE',
    READ: 'STAFF_READ',
    UPDATE: 'STAFF_UPDATE',
    DELETE: 'STAFF_DELETE',
  },
  store: {
    CREATE: 'STORE_CREATE',
    READ: 'STORE_READ',
    UPDATE: 'STORE_UPDATE',
    DELETE: 'STORE_DELETE',
    APPROVE: 'STORE_APPROVE',
  },
  stock: {
    READ: 'STOCK_READ',
    UPDATE: 'STOCK_UPDATE',
  },
  purchase: {
    CREATE: 'PURCHASE_CREATE',
    READ: 'PURCHASE_READ',
    UPDATE: 'PURCHASE_UPDATE',
    APPROVE: 'PURCHASE_APPROVE',
  },
  payment: {
    READ: 'PAYMENT_READ',
  },
  event: {
    READ: 'EVENT_READ',
    UPDATE: 'EVENT_UPDATE',
  },
  sale: {
    CREATE: 'SALE_CREATE',
    READ: 'SALE_READ',
    UPDATE: 'SALE_UPDATE',
    APPROVE: 'SALE_APPROVE',
  },
  order: {
    CREATE: 'ORDER_CREATE',
    READ: 'ORDER_READ',
    UPDATE: 'ORDER_UPDATE',
    APPROVE: 'ORDER_APPROVE',
  },
  return: {
    CREATE: 'RETURN_CREATE',
    READ: 'RETURN_READ',
    UPDATE: 'RETURN_UPDATE',
  },
  asset: {
    CREATE: 'ASSET_CREATE',
    READ: 'ASSET_READ',
    UPDATE: 'ASSET_UPDATE',
    DELETE: 'ASSET_DELETE',
  },
  devtool: {
    READ: 'DEVTOOL_READ',
    UPDATE: 'DEVTOOL_UPDATE',
  },
  support: {
    READ: 'SUPPORT_READ',
    CREATE: 'SUPPORT_CREATE',
    UPDATE: 'SUPPORT_UPDATE',
  },
  role: {
    CREATE: 'ROLE_CREATE',
    READ: 'ROLE_READ',
    UPDATE: 'ROLE_UPDATE',
    DELETE: 'ROLE_DELETE',
  },
} as const;

type ModulePermissionValues = ModulePermissionMap[keyof ModulePermissionMap];
type PermissionUnion = ModulePermissionValues[PermissionAction];

export type PermissionName = Exclude<PermissionUnion, undefined>;

export type PermissionDefinition = {
  name: PermissionName;
  module: PermissionModule;
  action: PermissionAction;
};

export const PERMISSION_DEFINITIONS: PermissionDefinition[] = Object.entries(
  PERMISSIONS,
).flatMap(([moduleKey, modulePermissions]) =>
  Object.entries(modulePermissions)
    .map(([action, name]) =>
      name
        ? {
            name: name as PermissionName,
            module: PERMISSION_MODULES[moduleKey as PermissionModuleKey],
            action: action as PermissionAction,
          }
        : null,
    )
    .filter((definition): definition is PermissionDefinition =>
      Boolean(definition),
    ),
);

export const ALL_PERMISSION_NAMES = Object.freeze(
  PERMISSION_DEFINITIONS.map((definition) => definition.name),
) as ReadonlyArray<PermissionName>;
