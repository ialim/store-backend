export interface LegacyTicketLineDto {
  lineNumber: number;
  articleCode: string;
  sizeCode?: string | null;
  colorCode?: string | null;
  quantity?: number | null;
  price?: number | null;
  priceVat?: number | null;
  total?: number | null;
  vendorCode?: number | null;
  payload?: unknown;
}

export interface LegacyTicketDto {
  storeCode: string;
  warehouseCode?: string | null;
  fo?: number | null;
  serie?: string | null;
  ticketNumber?: number | null;
  suffix?: string | null;
  issuedAt: string;
  openedAt?: string | null;
  closedAt?: string | null;
  totalNet?: number | null;
  customerCode?: number | null;
  vendorCode?: number | null;
  lines: LegacyTicketLineDto[];
  payload?: unknown;
}

export interface SyncTicketsDto {
  tickets: LegacyTicketDto[];
}
