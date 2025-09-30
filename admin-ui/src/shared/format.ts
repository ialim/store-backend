export function formatMoney(value: number | string | null | undefined, currency: string = 'NGN', locale?: string) {
  const num = typeof value === 'string' ? Number(value) : (value ?? 0);
  try {
    return new Intl.NumberFormat(locale || undefined, {
      style: 'currency',
      currency,
      currencyDisplay: 'symbol',
      maximumFractionDigits: 2,
    }).format(Number.isFinite(num as number) ? (num as number) : 0);
  } catch {
    const n = Number.isFinite(num as number) ? (num as number) : 0;
    return `₦${n.toLocaleString()}`;
  }
}
