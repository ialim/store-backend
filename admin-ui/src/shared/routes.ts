export function getDefaultRoute(roleName?: string | null): string {
  const r = (roleName || '').toUpperCase();
  switch (r) {
    case 'SUPERADMIN':
    case 'ADMIN':
    case 'MANAGER':
      return '/outbox';
    case 'ACCOUNTANT':
      return '/outbox';
    case 'BILLER':
      return '/fulfillment';
    case 'RESELLER':
    case 'CUSTOMER':
      // No admin pages for these yet; fallback to login
      return '/login';
    default:
      return '/outbox';
  }
}

