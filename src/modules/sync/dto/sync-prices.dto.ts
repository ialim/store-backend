export interface LegacyPriceRowDto {
  storeCode: string;
  tariffId: number;
  articleCode: string;
  sizeCode?: string | null;
  colorCode?: string | null;
  formatCode?: number | null;
  priceGross?: number | null;
  discount?: number | null;
  priceNet?: number | null;
  priceGrossAlt?: number | null;
  discountAlt?: number | null;
  priceNetAlt?: number | null;
  priceDate: string;
  warehouseCode: string;
  stockQuantity?: number | null;
  stockDate?: string | null;
  payload?: unknown;
}

export interface SyncPricesDto {
  rows: LegacyPriceRowDto[];
}
