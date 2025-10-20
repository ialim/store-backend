export function getDefaultRoute(roleName?: string | null): string {
  const r = (roleName || '').toUpperCase();
  switch (r) {
    case 'SUPERADMIN':
    case 'ADMIN':
    case 'MANAGER':
      return '/outbox';
    case 'ACCOUNTANT':
      return '/outbox';
    case 'RIDER':
      return '/fulfillments';
    case 'BILLER':
      return '/fulfillments';
    case 'RESELLER':
      return '/dashboard';
    case 'CUSTOMER':
      return '/profile';
    default:
      return '/outbox';
  }
}
