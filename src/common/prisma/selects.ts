export const PRODUCT_VARIANT_SUMMARY_SELECT = {
  id: true,
  name: true,
  size: true,
  concentration: true,
  packaging: true,
  barcode: true,
  product: { select: { id: true, name: true } },
} as const;

