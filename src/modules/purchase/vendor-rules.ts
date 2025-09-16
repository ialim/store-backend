export type ParsedLine = {
  description: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
  discountPct?: number;
  discountedUnitPrice?: number;
};

export type ParsedInvoice = {
  supplierName?: string;
  invoiceNumber?: string;
  date?: Date;
  total?: number;
  lines: ParsedLine[];
};

export interface VendorRule {
  match: (supplierName: string) => boolean;
  normalize: (parsed: ParsedInvoice) => ParsedInvoice;
}

const seindeSignatureRule: VendorRule = {
  match: (name) => name.toLowerCase().includes('seinde signature'),
  normalize: (parsed) => {
    const lines = (parsed.lines || []).map((ln) => {
      const qty = Number(ln.qty || 0);
      const unit = Number(ln.unitPrice || 0);
      const disc = ln.discountPct != null ? Number(ln.discountPct) : null;
      const discUnit =
        disc != null
          ? +(unit * (1 - disc / 100)).toFixed(2)
          : (ln.discountedUnitPrice ?? undefined);
      const total =
        discUnit != null && qty
          ? +(discUnit * qty).toFixed(2)
          : ln.lineTotal != null
            ? Number(ln.lineTotal)
            : +(qty * unit).toFixed(2);
      return {
        ...ln,
        unitPrice: unit,
        discountedUnitPrice: discUnit ?? undefined,
        lineTotal: total,
      };
    });
    return { ...parsed, lines };
  },
};

const RULES: VendorRule[] = [seindeSignatureRule];

export function normalizeParsedByVendor(parsed: ParsedInvoice): ParsedInvoice {
  try {
    const name = String(parsed?.supplierName || '').trim();
    if (!name) return parsed;
    const rule = RULES.find((r) => r.match(name));
    return rule ? rule.normalize(parsed) : parsed;
  } catch {
    return parsed;
  }
}
