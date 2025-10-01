export interface LegacyInvoiceLineDto {
  lineNumber: number;
  articleCode: string;
  sizeCode?: string | null;
  colorCode?: string | null;
  quantity?: number | null;
  price?: number | null;
  priceVat?: number | null;
  total?: number | null;
  payload?: unknown;
}

export interface LegacyInvoiceDto {
  storeCode: string;
  warehouseCode?: string | null;
  serie?: string | null;
  invoiceNumber?: number | null;
  suffix?: string | null;
  issuedAt: string;
  totalNet?: number | null;
  customerCode?: number | null;
  vendorCode?: number | null;
  lines: LegacyInvoiceLineDto[];
  payload?: unknown;
}

export interface SyncInvoicesDto {
  invoices: LegacyInvoiceDto[];
}
