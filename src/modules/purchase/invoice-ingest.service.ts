import { Injectable, Logger } from '@nestjs/common';
import { ParsedInvoice as VendorParsedInvoice } from './vendor-rules';

type ParsedInvoice = VendorParsedInvoice;

type PdfJsModule = typeof import('pdfjs-dist');
type TesseractModule = typeof import('tesseract.js');
type TextractModule = typeof import('@aws-sdk/client-textract');

const isParsedInvoice = (value: unknown): value is ParsedInvoice => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return Array.isArray(candidate.lines);
};

const coerceParsedInvoice = (value: unknown): ParsedInvoice => {
  if (isParsedInvoice(value)) return value;
  return { lines: [] };
};

const toErrorMessage = (err: unknown): string => {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  try {
    return JSON.stringify(err);
  } catch {
    return String(err);
  }
};

@Injectable()
export class InvoiceIngestService {
  private readonly logger = new Logger(InvoiceIngestService.name);
  private static readonly controlCharPattern = new RegExp(
    '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]',
    'g',
  );

  async fetchBuffer(
    url: string,
  ): Promise<{ buffer: Buffer; contentType: string | null }> {
    const g = globalThis as unknown as { fetch?: typeof fetch };
    const f = g.fetch;
    if (!f) throw new Error('fetch not available in runtime');
    const res = await f(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const ct = res.headers?.get?.('content-type') || null;
    const ab = await res.arrayBuffer();
    return { buffer: Buffer.from(ab), contentType: ct };
  }

  async parseTextFromUrl(url: string): Promise<string> {
    const { buffer, contentType } = await this.fetchBuffer(url);
    return this.parseTextFromBuffer(buffer, contentType);
  }

  async parseTextFromBuffer(
    buffer: Buffer,
    contentType: string | null,
  ): Promise<string> {
    if (contentType?.includes('pdf')) {
      const pdfText = await this.tryPdfExtraction(buffer);
      if (pdfText) return pdfText;
    }
    if (contentType?.startsWith('image/')) {
      const ocrText = await this.tryImageOcr(buffer);
      if (ocrText) return ocrText;
    }
    return buffer.toString('utf8');
  }

  private sanitizeString(value: string): string {
    return value.replace(InvoiceIngestService.controlCharPattern, '');
  }

  private async tryPdfExtraction(buffer: Buffer): Promise<string | null> {
    try {
      const pdfModule = await import('pdf-parse');
      const pdfParse = pdfModule.default;
      const result = await pdfParse(buffer);
      const text = result?.text?.trim();
      if (text && text.length > 10) return text;
    } catch (error) {
      this.logger.debug(`pdf-parse failed: ${toErrorMessage(error)}`);
    }

    try {
      const pdfjs = await this.loadPdfJs();
      if (!pdfjs) return null;
      const loadingTask = pdfjs.getDocument({
        data: buffer,
        isEvalSupported: false,
        disableFontFace: true,
        verbosity: 0,
      });
      const doc = await loadingTask.promise;
      let text = '';
      for (let pageNumber = 1; pageNumber <= doc.numPages; pageNumber++) {
        const page = await doc.getPage(pageNumber);
        const content = await page.getTextContent();
        const pageText = content.items.map((item) => item.str ?? '').join(' ');
        text += `${pageText}\n\n`;
      }
      const trimmed = text.trim();
      return trimmed.length > 10 ? trimmed : null;
    } catch (error) {
      this.logger.debug(`pdfjs-dist failed: ${toErrorMessage(error)}`);
    }

    return null;
  }

  private async tryImageOcr(buffer: Buffer): Promise<string | null> {
    try {
      const tesseract = (await import('tesseract.js')) as TesseractModule;
      const { data } = await tesseract.recognize(buffer, 'eng', {
        psm: 6,
        tessedit_char_whitelist:
          '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz.,:%-()[] ',
      });
      const text = data?.text?.trim();
      return text && text.length > 0 ? text : null;
    } catch (error) {
      this.logger.debug(`tesseract.js failed: ${toErrorMessage(error)}`);
      return null;
    }
  }

  private async loadPdfJs(): Promise<PdfJsModule | null> {
    try {
      return (await import('pdfjs-dist')) as PdfJsModule;
    } catch {
      try {
        const req = eval('require') as NodeRequire;
        return req('pdfjs-dist') as PdfJsModule;
      } catch {
        return null;
      }
    }
  }

  private async loadTextract(): Promise<TextractModule | null> {
    try {
      return (await import('@aws-sdk/client-textract')) as TextractModule;
    } catch {
      try {
        const req = eval('require') as NodeRequire;
        return req('@aws-sdk/client-textract') as TextractModule;
      } catch {
        return null;
      }
    }
  }

  /**
   * High-accuracy path using a managed OCR/understanding provider.
   * Currently supports AWS Textract AnalyzeExpense if available and enabled.
   */
  async parseInvoiceFromUrl(
    url: string,
  ): Promise<{ parsed: ParsedInvoice; rawText?: string }> {
    const { buffer, contentType } = await this.fetchBuffer(url);
    // Try AWS Textract if configured
    const provider = (process.env.INVOICE_OCR_PROVIDER || 'auto').toLowerCase();
    if (provider === 'python' || provider === 'auto') {
      const py = await this.tryPythonOcr(buffer, contentType);
      if (py && py.lines?.length) return { parsed: py };
      if (provider === 'python') {
        // explicit python choice, don't cascade to textract
      } else {
        // auto mode → try textract next
        const tex = await this.tryTextract(buffer);
        if (tex && tex.lines?.length) return { parsed: tex };
      }
    } else if (provider === 'textract' || provider === 'auto') {
      const tex = await this.tryTextract(buffer);
      if (tex && tex.lines?.length) {
        return { parsed: tex };
      }
      if (provider === 'auto') {
        // try python as secondary
        const py = await this.tryPythonOcr(buffer, contentType);
        if (py && py.lines?.length) return { parsed: py };
      }
    }
    // Fallback to text parsing pipeline
    const text = await this.parseTextFromBuffer(buffer, contentType);
    const parsed = this.parseInvoiceText(text);
    return { parsed, rawText: text };
  }

  private async tryPythonOcr(
    buffer: Buffer,
    contentType: string | null,
  ): Promise<ParsedInvoice | null> {
    const endpoint = process.env.INVOICE_OCR_URL;
    if (!endpoint) return null;
    const g = globalThis as unknown as { fetch?: typeof fetch };
    const f = g.fetch;
    if (!f) return null;
    const payload = JSON.stringify({
      contentType: contentType || 'application/octet-stream',
      data: buffer.toString('base64'),
    });
    const headers: Record<string, string> = {
      'content-type': 'application/json',
    };
    const sleep = (ms: number) =>
      new Promise((resolve) => setTimeout(resolve, ms));
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const res = await f(endpoint, {
          method: 'POST',
          headers,
          body: payload,
        });
        if (res.ok) {
          const json: unknown = await res.json();
          const parsed = coerceParsedInvoice(json);
          return parsed.lines.length ? parsed : null;
        }
        this.logger.warn(
          `Python OCR request failed with status ${res.status} (attempt ${attempt + 1})`,
        );
      } catch (error) {
        this.logger.warn(
          `Python OCR request failed (attempt ${attempt + 1}): ${toErrorMessage(error)}`,
        );
      }
      await sleep(250 * (attempt + 1));
    }
    return null;
  }

  private async tryTextract(buffer: Buffer): Promise<ParsedInvoice | null> {
    try {
      const textract = await this.loadTextract();
      if (!textract) return null;
      const { TextractClient, AnalyzeExpenseCommand } = textract;
      const client = new TextractClient({
        region:
          process.env.AWS_REGION ||
          process.env.AWS_DEFAULT_REGION ||
          'us-east-1',
      });
      const out = await client.send(
        new AnalyzeExpenseCommand({ Document: { Bytes: buffer } }),
      );
      const toNum = (s?: string) => {
        if (!s) return undefined as number | undefined;
        const n = parseFloat(String(s).replace(/,/g, ''));
        return isFinite(n) ? n : undefined;
      };
      const parsed: ParsedInvoice = {
        supplierName: undefined,
        invoiceNumber: undefined,
        date: undefined,
        total: undefined,
        lines: [],
      };
      const doc = out?.ExpenseDocuments?.[0];
      if (!doc) return null;
      for (const sf of doc.SummaryFields || []) {
        const t = sf.Type?.Text || '';
        const v =
          sf.ValueDetection?.Text ||
          sf.ValueDetection?.NormalizedValue?.Value ||
          '';
        switch (t) {
          case 'VENDOR_NAME':
            parsed.supplierName = v || parsed.supplierName;
            break;
          case 'INVOICE_RECEIPT_ID':
            parsed.invoiceNumber = v || parsed.invoiceNumber;
            break;
          case 'INVOICE_RECEIPT_DATE':
          case 'INVOICE_DATE':
            if (v) {
              const dt = new Date(v);
              if (!isNaN(+dt)) parsed.date = dt;
            }
            break;
          case 'TOTAL':
          case 'AMOUNT_DUE':
            parsed.total = toNum(v) ?? parsed.total;
            break;
        }
      }
      for (const group of doc.LineItemGroups || []) {
        for (const li of group.LineItems || []) {
          const fields = li.LineItemExpenseFields || [];
          const grab = (type: string) => {
            const found = fields.find((f) => f.Type?.Text === type);
            return (
              found?.ValueDetection?.Text ||
              found?.ValueDetection?.NormalizedValue?.Value ||
              ''
            );
          };
          const desc =
            grab('ITEM') ||
            grab('DESCRIPTION') ||
            grab('PRODUCT_CODE') ||
            grab('OTHER') ||
            '';
          const qty = toNum(grab('QUANTITY')) || 1;
          const unitPrice =
            toNum(grab('UNIT_PRICE')) ?? toNum(grab('PRICE')) ?? undefined;
          const total =
            toNum(grab('NET_PRICE')) ??
            toNum(grab('TOTAL')) ??
            (unitPrice != null ? +(unitPrice * qty) : undefined);
          // discount percent may appear as field or label; best effort
          const discStr = grab('DISCOUNT') || '';
          const discPctMatch = /(\d+(?:\.\d+)?)\s*%/.exec(discStr);
          const discountPct = discPctMatch
            ? parseFloat(discPctMatch[1])
            : undefined;
          const discountedUnit =
            discountPct != null && unitPrice != null
              ? +(unitPrice * (1 - discountPct / 100)).toFixed(2)
              : undefined;
          if (desc && qty && (unitPrice != null || total != null)) {
            parsed.lines.push({
              description: desc,
              qty,
              unitPrice: unitPrice ?? +(total! / qty).toFixed(2),
              discountPct,
              discountedUnitPrice: discountedUnit,
              lineTotal: total ?? +(qty * (unitPrice ?? 0)).toFixed(2),
            });
          }
        }
      }
      return parsed;
    } catch (error) {
      this.logger.debug(`Textract analysis failed: ${toErrorMessage(error)}`);
      return null;
    }
  }

  parseInvoiceText(text: string): ParsedInvoice {
    const out: ParsedInvoice = {
      supplierName: undefined,
      invoiceNumber: undefined,
      date: undefined,
      total: undefined,
      lines: [],
    };
    const norm = text.replace(/\r/g, '');

    // Basic metadata extraction (best-effort)
    const invMatch =
      /(Invoice|Invoice\s*#|Invoice\s*No\.?):\s*([A-Z0-9-]+)/i.exec(norm);
    if (invMatch) out.invoiceNumber = invMatch[2];
    const dateMatch =
      /(Date|Invoice\s*Date):\s*(\d{1,2}[./-]\d{1,2}[./-]\d{2,4})/i.exec(norm);
    if (dateMatch) {
      const parts = dateMatch[2]
        .replace(/-/g, '.')
        .replace(/\//g, '.')
        .split('.')
        .map((x) => parseInt(x, 10));
      if (parts.length >= 3) {
        const [d, m, y] =
          parts.length === 3 ? parts : [parts[0], parts[1], parts[2]];
        if (!isNaN(d) && !isNaN(m) && !isNaN(y))
          out.date = new Date(y < 100 ? 2000 + y : y, m - 1, d);
      }
    }
    const supplierMatch =
      /(Seinde\s+Signature\s+Ltd|Seinde\s+Signature|Supplier:\s*([\w .&-]+))/i.exec(
        norm,
      );
    if (supplierMatch) out.supplierName = supplierMatch[2] || supplierMatch[1];

    const toNumber = (s: string) =>
      parseFloat(
        String(s)
          .replace(/,/g, '')
          .replace(/[^0-9.-]/g, ''),
      );
    const pushLine = (
      desc: string,
      qty: number,
      unit: number,
      amount?: number,
      discountPct?: number,
      discountedUnit?: number,
    ) => {
      if (!desc || !qty) return;
      const total =
        typeof amount === 'number' && !isNaN(amount) ? amount : qty * unit;
      out.lines.push({
        description: desc.trim(),
        qty,
        unitPrice: unit,
        discountPct,
        discountedUnitPrice: discountedUnit,
        lineTotal: total,
      });
    };

    // Try structured table parsing first (common layouts)
    const lines = norm
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    const startIdx = Math.max(
      0,
      lines.findIndex((l) => /\b(qty|quantity)\b/i.test(l)),
    );
    for (let i = startIdx; i < lines.length; i++) {
      const l = lines[i];
      const cleaned = l
        .replace(/\[/g, ' ')
        .replace(/\]/g, ' ')
        .replace(/[()|]/g, ' ')
        .replace(/\s+/g, ' ')
        .trim();
      // Pattern A: qty desc unit disc% discounted amount
      let m: RegExpExecArray | null;
      m =
        /^\s*(\d{1,5})\s+(.+?)\s+([\d,.]+)\s+(\d{1,2})%\s+([\d,.]+)\s+([\d,.]+)\s*$/.exec(
          cleaned,
        ) ||
        /^\s*(\d{1,5})\s+(.+?)\s+([\d,.]+)\s+(\d{1,2})%\s+([\d,.]+)\s+([\d,.]+)\s*$/.exec(
          l,
        );
      if (m) {
        pushLine(
          m[2],
          parseInt(m[1], 10),
          toNumber(m[3]),
          toNumber(m[6]),
          parseFloat(m[4]),
          toNumber(m[5]),
        );
        continue;
      }

      // Pattern B: qty desc unit amount (no discount column)
      m =
        /^\s*(\d{1,5})\s+(.+?)\s+([\d,.]+)\s+([\d,.]+)\s*$/.exec(cleaned) ||
        /^\s*(\d{1,5})\s+(.+?)\s+([\d,.]+)\s+([\d,.]+)\s*$/.exec(l);
      if (m) {
        pushLine(m[2], parseInt(m[1], 10), toNumber(m[3]), toNumber(m[4]));
        continue;
      }

      // Pattern C: desc qty unit amount (desc first)
      m =
        /^\s*(.+?)\s+(\d{1,5})\s+([\d,.]+)\s+([\d,.]+)\s*$/.exec(cleaned) ||
        /^\s*(.+?)\s+(\d{1,5})\s+([\d,.]+)\s+([\d,.]+)\s*$/.exec(l);
      if (m) {
        pushLine(m[1], parseInt(m[2], 10), toNumber(m[3]), toNumber(m[4]));
        continue;
      }

      // Pattern D: qty x desc @ unit = amount
      m =
        /^\s*(\d{1,5})\s*[xX]\s*(.+?)\s*@\s*([\d,.]+)\s*=\s*([\d,.]+)\s*$/.exec(
          cleaned,
        ) ||
        /^\s*(\d{1,5})\s*[xX]\s*(.+?)\s*@\s*([\d,.]+)\s*=\s*([\d,.]+)\s*$/.exec(
          l,
        );
      if (m) {
        pushLine(m[2], parseInt(m[1], 10), toNumber(m[3]), toNumber(m[4]));
        continue;
      }

      // Pattern E: qty desc amount (compute unit)
      m =
        /^\s*(\d{1,5})\s+(.+?)\s+([\d,.]+)\s*$/.exec(cleaned) ||
        /^\s*(\d{1,5})\s+(.+?)\s+([\d,.]+)\s*$/.exec(l);
      if (m) {
        const qty = parseInt(m[1], 10);
        const amt = toNumber(m[3]);
        const unit = qty ? amt / qty : amt;
        pushLine(m[2], qty, unit, amt);
        continue;
      }

      // Fallback: fuzzy OCR-friendly parsing
      if (!/[0-9]/.test(cleaned)) continue;
      // Extract numeric-like tokens (including OCR mistakes) and normalize them
      const rawTokens = cleaned.split(/\s+/);
      const numeric: Array<{
        raw: string;
        value: number;
        isPercent?: boolean;
        idx: number;
        isInt: boolean;
      }> = [];
      const normToken = (s: string) =>
        s
          .replace(/[Oo]/g, '0')
          .replace(/[lI]/g, '1')
          .replace(/[Ss]/g, '5')
          .replace(/[Bb]/g, '8')
          .replace(/[Ee]/g, '6')
          .replace(/[Aa]/g, '4');
      for (let ti = 0; ti < rawTokens.length; ti++) {
        const t = rawTokens[ti];
        const hasDigit = /[0-9]/.test(t);
        if (!hasDigit) continue;
        const nt = normToken(t);
        const isPct = /%$/.test(nt) || /%/.test(nt);
        const digits = nt.replace(/[^0-9,.]/g, '');
        if (!digits) continue;
        let val: number | null = null;
        if (digits.includes('.')) {
          val = parseFloat(digits.replace(/,/g, ''));
        } else if (digits.includes(',')) {
          // Assume commas are thousand separators
          val = parseFloat(digits.replace(/,/g, ''));
        } else {
          // No separators; if it looks like cents (ends with 00 and length > 4), divide by 100
          if (digits.length > 4) val = parseFloat(digits) / 100;
          else val = parseFloat(digits);
        }
        if (!isFinite(val)) continue;
        numeric.push({
          raw: t,
          value: val,
          isPercent: isPct,
          idx: ti,
          isInt: Number.isInteger(val),
        });
      }
      if (!numeric.length) continue;

      // Heuristics: qty = first small integer; total = last numeric (when percent or multiple numbers), else max
      const smallInts = numeric
        .filter((n) => !n.isPercent && n.isInt && n.value > 0 && n.value <= 500)
        .sort((a, b) => a.idx - b.idx);
      const qty = (smallInts.length ? smallInts[0].value : null) || null;
      if (!qty) continue;
      const candidates = numeric
        .filter((n) => !n.isPercent && n.value >= 0.01)
        .sort((a, b) => a.idx - b.idx);
      if (!candidates.length) continue;
      const hasPct = numeric.some((n) => n.isPercent);
      const totalTok =
        hasPct || candidates.length >= 3
          ? candidates[candidates.length - 1]
          : candidates.reduce((a, b) => (b.value > a.value ? b : a));
      let unit = +(totalTok.value / qty).toFixed(2);
      // Try to use an explicit unit token right after qty if close
      const qtyIdx = smallInts[0].idx;
      const afterQty = candidates.find(
        (n) => n.idx > qtyIdx && Math.abs(n.value - unit) / (unit || 1) < 0.2,
      );
      if (afterQty) unit = afterQty.value;
      // Optional discount percent if present
      const pctTok = numeric.find((n) => n.isPercent);
      const discountPct = pctTok
        ? Math.min(100, Math.max(0, pctTok.value))
        : undefined;
      const discountedUnit =
        discountPct != null
          ? +(unit * (1 - discountPct / 100)).toFixed(2)
          : undefined;
      // Description = tokens before first numeric token
      const firstNumIdx = Math.min(...numeric.map((n) => n.idx));
      const desc = rawTokens.slice(0, firstNumIdx).join(' ').trim();
      if (desc)
        pushLine(desc, qty, unit, totalTok.value, discountPct, discountedUnit);
    }

    // Parse total amount if present
    const totMatch =
      /\b(total|amount\s*due)\b\s*[:-]?\s*([\d,]+(?:\.\d{2})?)/i.exec(norm);
    if (totMatch) out.total = toNumber(totMatch[2]);

    return out;
  }
}
