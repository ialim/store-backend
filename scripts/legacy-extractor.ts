import 'dotenv/config';
import { mkdir, readFile, writeFile, rename } from 'fs/promises';
import { existsSync } from 'fs';
import { resolve, dirname, join } from 'path';
import { setTimeout as delay } from 'timers/promises';
import * as mssql from 'mssql';

interface CliOptions {
  job: JobName;
  storeCode: string;
  tariffId?: number;
  cursor?: string | null;
  limit: number;
  dryRun: boolean;
  baseUrl: string;
  apiKey?: string;
}

type JobName = 'prices' | 'tickets' | 'invoices';

type JobCursor = string | null;

interface JobState {
  job: JobName;
  storeCode: string;
  lastCursor: JobCursor;
  pendingCursor?: JobCursor;
  lastRunAt?: string;
  lastBatchFile?: string;
  lastError?: string | null;
}

interface BatchMetadata {
  job: JobName;
  storeCode: string;
  sequence: number;
  createdAt: string;
  count: number;
  cursor: JobCursor;
  sourceCursor?: JobCursor;
}

interface BatchEnvelope<T> {
  metadata: BatchMetadata;
  payload: T;
}

interface PriceRow {
  tariffId: number;
  articleCode: string;
  description: string;
  refProveedor: string | null;
  priceGross: number | null;
  discount: number | null;
  priceNet: number | null;
  priceGrossAlt: number | null;
  discountAlt: number | null;
  priceNetAlt: number | null;
  priceDate: Date | null;
  warehouseCode: string;
  stockQuantity: number | null;
  stockDate: Date | null;
  CursorValue: Date | null;
}

interface TicketRow {
  fo: number | null;
  serie: string | null;
  ticketNumber: number | null;
  suffix: string | null;
  issuedAt: Date | null;
  openedAt: Date | null;
  closedAt: Date | null;
  totalNet: number | null;
  customerCode: number | null;
  vendorCode: number | null;
  warehouseCode: string | null;
  drawerCode: string | null;
  LinesJson: string | null;
  CursorValue: string | null;
}

interface InvoiceRow {
  serie: string | null;
  invoiceNumber: number | null;
  suffix: string | null;
  issuedAt: Date | null;
  totalNet: number | null;
  customerCode: number | null;
  vendorCode: number | null;
  warehouseCode: string | null;
  LinesJson: string | null;
  CursorValue: string | null;
}

interface LegacyTicketLinePayload {
  lineNumber: number | null;
  articleCode: string | null;
  sizeCode: string | null;
  colorCode: string | null;
  quantity: number | null;
  price: number | null;
  priceVat: number | null;
  lineTotal: number | null;
  vendorCode: number | null;
}

interface LegacyPricePayload {
  storeCode: string;
  tariffId: number;
  articleCode: string;
  description: string | null;
  refProveedor: string | null;
  priceGross: number | null;
  discount: number | null;
  priceNet: number | null;
  priceGrossAlt: number | null;
  discountAlt: number | null;
  priceNetAlt: number | null;
  priceDate: string | null;
  warehouseCode: string;
  stockQuantity: number | null;
  stockDate: string | null;
}

interface LegacyTicketPayload {
  storeCode: string;
  warehouseCode: string | null;
  fo: number | null;
  serie: string | null;
  ticketNumber: number | null;
  suffix: string | null;
  issuedAt: string | null;
  openedAt: string | null;
  closedAt: string | null;
  totalNet: number | null;
  customerCode: number | null;
  vendorCode: number | null;
  lines: LegacyTicketLinePayload[];
}

interface LegacyInvoiceLinePayload {
  lineNumber: number | null;
  articleCode: string | null;
  sizeCode: string | null;
  colorCode: string | null;
  quantity: number | null;
  price: number | null;
  priceVat: number | null;
  lineTotal: number | null;
}

interface LegacyInvoicePayload {
  storeCode: string;
  warehouseCode: string | null;
  serie: string | null;
  invoiceNumber: number | null;
  suffix: string | null;
  issuedAt: string | null;
  totalNet: number | null;
  customerCode: number | null;
  vendorCode: number | null;
  lines: LegacyInvoiceLinePayload[];
}

interface JobDefinition<Row, Payload> {
  sqlFile: string;
  cursorType: 'date' | 'string';
  endpointPath: string;
  batchSize: number;
  selectLimit: number;
  mapRows: (rows: Row[], opts: { storeCode: string }) => Array<{ payload: Payload; cursor: JobCursor }>;
  wrapPayload: (items: Payload[]) => unknown;
  prepareCursorParam: (cursor: JobCursor) => unknown;
  extractCursor: (row: Row) => JobCursor;
}

const BASE_DIR = resolve(process.cwd(), 'extractor');
const SQL_DIR = resolve(BASE_DIR, 'sql');
const STATE_DIR = resolve(BASE_DIR, 'state');
const BATCH_DIR = resolve(BASE_DIR, 'batches');

const JOBS: Record<JobName, JobDefinition<any, any>> = {
  prices: {
    sqlFile: join(SQL_DIR, 'prices.sql'),
    cursorType: 'date',
    endpointPath: '/sync/prices',
    batchSize: 500,
    selectLimit: 2000,
    mapRows: (rows: PriceRow[], { storeCode }) =>
      rows.map((row) => {
        const cursor = row.CursorValue
          ? new Date(row.CursorValue).toISOString()
          : row.priceDate
          ? new Date(row.priceDate).toISOString()
          : null;
        const payload: LegacyPricePayload = {
          storeCode,
          tariffId: Number(row.tariffId ?? 0),
          articleCode: String(row.articleCode ?? ''),
          description: row.description ?? null,
          refProveedor: row.refProveedor ?? null,
          priceGross: normalizeNumber(row.priceGross),
          discount: normalizeNumber(row.discount),
          priceNet: normalizeNumber(row.priceNet),
          priceGrossAlt: normalizeNumber(row.priceGrossAlt),
          discountAlt: normalizeNumber(row.discountAlt),
          priceNetAlt: normalizeNumber(row.priceNetAlt),
          priceDate: row.priceDate ? new Date(row.priceDate).toISOString() : null,
          warehouseCode: String(row.warehouseCode ?? storeCode),
          stockQuantity: normalizeNumber(row.stockQuantity),
          stockDate: row.stockDate ? new Date(row.stockDate).toISOString() : null,
        };
        return { payload, cursor };
      }),
    wrapPayload: (items: LegacyPricePayload[]) => ({ rows: items }),
    prepareCursorParam: (cursor) => (cursor ? new Date(cursor) : null),
    extractCursor: (row: PriceRow) =>
      row.CursorValue
        ? new Date(row.CursorValue).toISOString()
        : row.priceDate
        ? new Date(row.priceDate).toISOString()
        : null,
  },
  tickets: {
    sqlFile: join(SQL_DIR, 'tickets.sql'),
    cursorType: 'string',
    endpointPath: '/sync/tickets',
    batchSize: 200,
    selectLimit: 1000,
    mapRows: (rows: TicketRow[], { storeCode }) =>
      rows.map((row) => {
        const lines: LegacyTicketLinePayload[] = parseJsonArray<LegacyTicketLinePayload>(
          row.LinesJson,
        ).map((line) => ({
          lineNumber: toInteger(line.lineNumber),
          articleCode: line.articleCode ?? null,
          sizeCode: line.sizeCode ?? null,
          colorCode: line.colorCode ?? null,
          quantity: normalizeNumber(line.quantity),
          price: normalizeNumber(line.price),
          priceVat: normalizeNumber(line.priceVat),
          lineTotal: normalizeNumber(line.lineTotal),
          vendorCode:
            line.vendorCode != null ? Number.parseInt(String(line.vendorCode), 10) : null,
        }));
        const payload: LegacyTicketPayload = {
          storeCode,
          warehouseCode: row.warehouseCode ?? null,
          fo: row.fo ?? null,
          serie: row.serie ?? null,
          ticketNumber: row.ticketNumber ?? null,
          suffix: row.suffix ?? null,
          issuedAt: row.issuedAt ? new Date(row.issuedAt).toISOString() : null,
          openedAt: row.openedAt ? new Date(row.openedAt).toISOString() : null,
          closedAt: row.closedAt ? new Date(row.closedAt).toISOString() : null,
          totalNet: normalizeNumber(row.totalNet),
          customerCode: row.customerCode ?? null,
          vendorCode: row.vendorCode ?? null,
          lines,
        };
        return { payload, cursor: row.CursorValue ?? null };
      }),
    wrapPayload: (items: LegacyTicketPayload[]) => ({ tickets: items }),
    prepareCursorParam: (cursor) => cursor ?? null,
    extractCursor: (row: TicketRow) => row.CursorValue ?? null,
  },
  invoices: {
    sqlFile: join(SQL_DIR, 'invoices.sql'),
    cursorType: 'string',
    endpointPath: '/sync/invoices',
    batchSize: 200,
    selectLimit: 1000,
    mapRows: (rows: InvoiceRow[], { storeCode }) =>
      rows.map((row) => {
        const lines: LegacyInvoiceLinePayload[] = parseJsonArray<LegacyInvoiceLinePayload>(
          row.LinesJson,
        ).map((line) => ({
          lineNumber: toInteger(line.lineNumber),
          articleCode: line.articleCode ?? null,
          sizeCode: line.sizeCode ?? null,
          colorCode: line.colorCode ?? null,
          quantity: normalizeNumber(line.quantity),
          price: normalizeNumber(line.price),
          priceVat: normalizeNumber(line.priceVat),
          lineTotal: normalizeNumber(line.lineTotal),
        }));
        const payload: LegacyInvoicePayload = {
          storeCode,
          warehouseCode: row.warehouseCode ?? null,
          serie: row.serie ?? null,
          invoiceNumber: row.invoiceNumber ?? null,
          suffix: row.suffix ?? null,
          issuedAt: row.issuedAt ? new Date(row.issuedAt).toISOString() : null,
          totalNet: normalizeNumber(row.totalNet),
          customerCode: row.customerCode ?? null,
          vendorCode: row.vendorCode ?? null,
          lines,
        };
        return { payload, cursor: row.CursorValue ?? null };
      }),
    wrapPayload: (items: LegacyInvoicePayload[]) => ({ invoices: items }),
    prepareCursorParam: (cursor) => cursor ?? null,
    extractCursor: (row: InvoiceRow) => row.CursorValue ?? null,
  },
};

async function main() {
  const options = parseArgs(process.argv.slice(2));
  validateOptions(options);
  await ensureDirectories();
  const jobDef = JOBS[options.job];
  const sqlText = await readSql(jobDef.sqlFile);

  const stateFile = stateFilePath(options.job, options.storeCode);
  const state = await loadState(stateFile, options.job, options.storeCode);

  const effectiveCursor = chooseCursor(
    state.lastCursor,
    options.cursor ?? null,
    jobDef.cursorType,
  );

  const requestedLimit = options.limit > 0 ? options.limit : jobDef.selectLimit;

  const rows = await fetchRows(sqlText, {
    job: options.job,
    storeCode: options.storeCode,
    tariffId: options.tariffId,
    limit: requestedLimit,
    cursor: jobDef.prepareCursorParam(effectiveCursor),
  });

  if (!rows.length) {
    console.log(`No rows for job=${options.job} store=${options.storeCode}`);
    await saveState(stateFile, {
      ...state,
      lastRunAt: new Date().toISOString(),
      lastError: null,
      pendingCursor: null,
    });
    return;
  }

  const mapped = jobDef.mapRows(rows, { storeCode: options.storeCode });
  if (!mapped.length) {
    console.log(`Rows fetched but none mapped for job=${options.job}`);
    return;
  }

  const batches = chunk(mapped, jobDef.batchSize);
  console.log(
    `Prepared ${batches.length} batch(es) for job=${options.job}, total rows=${mapped.length}`,
  );

  const baseUrl = options.baseUrl.replace(/\/$/, '');

  let sequence = 0;
  let lastCursor: JobCursor = state.lastCursor;
  let lastError: string | null = null;
  let lastBatchFile: string | undefined;

  for (const batch of batches) {
    sequence += 1;
    const cursor = batch[batch.length - 1].cursor ?? lastCursor ?? null;
    const batchPayloadItems = batch.map((item) => item.payload);
    const payloadEnvelope = jobDef.wrapPayload(batchPayloadItems);

    const metadata: BatchMetadata = {
      job: options.job,
      storeCode: options.storeCode,
      sequence,
      createdAt: new Date().toISOString(),
      count: batch.length,
      cursor,
      sourceCursor: effectiveCursor,
    };

    const batchDir = resolve(BATCH_DIR, options.job);
    await mkdir(batchDir, { recursive: true });
    const filename = `${metadata.createdAt.replace(/[:.]/g, '-')}-${String(sequence).padStart(4, '0')}.json`;
    const filePath = join(batchDir, filename);

    const envelope: BatchEnvelope<unknown> = {
      metadata,
      payload: payloadEnvelope,
    };

    await writeFile(filePath, JSON.stringify(envelope, null, 2), 'utf8');

    if (options.dryRun) {
      console.log(`[dry-run] wrote batch file ${filePath}`);
      lastCursor = cursor;
      lastBatchFile = filePath;
      continue;
    }

    const uploadSucceeded = await uploadWithRetry({
      baseUrl,
      endpointPath: jobDef.endpointPath,
      payload: payloadEnvelope,
      apiKey: options.apiKey,
    });

    if (uploadSucceeded) {
      const sentPath = filePath.replace(/\.json$/, '.sent.json');
      await rename(filePath, sentPath);
      lastCursor = cursor;
      lastBatchFile = sentPath;
      lastError = null;
      console.log(`Uploaded batch ${sequence}/${batches.length} (${metadata.count} rows)`);
      await saveState(stateFile, {
        ...state,
        lastCursor,
        pendingCursor: null,
        lastBatchFile: sentPath,
        lastRunAt: new Date().toISOString(),
        lastError: null,
      });
    } else {
      lastError = 'Upload failed after retries';
      await saveState(stateFile, {
        ...state,
        pendingCursor: cursor,
        lastBatchFile: filePath,
        lastRunAt: new Date().toISOString(),
        lastError,
      });
      console.error(`Stopping after failed upload for batch ${sequence}`);
      return;
    }
  }

  await saveState(stateFile, {
    ...state,
    lastCursor,
    pendingCursor: null,
    lastBatchFile,
    lastRunAt: new Date().toISOString(),
    lastError,
  });
}

function parseArgs(argv: string[]): CliOptions {
  const map = new Map<string, string>();
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        map.set(key, next);
        i += 1;
      } else {
        map.set(key, 'true');
      }
    }
  }

  const job = map.get('job') as JobName;
  const storeCode = map.get('store') ?? map.get('storeCode');

  return {
    job,
    storeCode: storeCode ?? '',
    tariffId: map.has('tariff') ? Number(map.get('tariff')) : undefined,
    cursor: map.get('from') ?? map.get('cursor') ?? null,
    limit: map.has('limit') ? Number(map.get('limit')) : 0,
    dryRun: map.get('dry-run') === 'true' || map.get('dryRun') === 'true',
    baseUrl: process.env.SYNC_BASE_URL ?? map.get('baseUrl') ?? 'http://localhost:3000',
    apiKey: process.env.SYNC_API_KEY ?? map.get('apiKey') ?? undefined,
  };
}

function validateOptions(options: CliOptions) {
  if (!options.job || !['prices', 'tickets', 'invoices'].includes(options.job)) {
    throw new Error('Missing or invalid --job (prices|tickets|invoices)');
  }
  if (!options.storeCode) {
    throw new Error('Missing --store (legacy store code)');
  }
  if (options.job === 'prices' && !options.tariffId) {
    throw new Error('Prices job requires --tariff');
  }
  if (!process.env.LEGACY_DB_SERVER) {
    throw new Error('LEGACY_DB_SERVER environment variable is required');
  }
  if (!process.env.LEGACY_DB_USER) {
    throw new Error('LEGACY_DB_USER environment variable is required');
  }
  if (!process.env.LEGACY_DB_PASSWORD) {
    throw new Error('LEGACY_DB_PASSWORD environment variable is required');
  }
  if (!process.env.LEGACY_DB_DATABASE) {
    throw new Error('LEGACY_DB_DATABASE environment variable is required');
  }
}

async function ensureDirectories() {
  await mkdir(BASE_DIR, { recursive: true });
  await mkdir(SQL_DIR, { recursive: true });
  await mkdir(STATE_DIR, { recursive: true });
  await mkdir(BATCH_DIR, { recursive: true });
}

async function readSql(sqlFile: string): Promise<string> {
  if (!existsSync(sqlFile)) {
    throw new Error(`SQL file not found: ${sqlFile}`);
  }
  const buffer = await readFile(sqlFile, 'utf8');
  return buffer;
}

function stateFilePath(job: JobName, storeCode: string) {
  const safeStore = storeCode.replace(/[^a-zA-Z0-9_-]/g, '_');
  return resolve(STATE_DIR, `${job}-${safeStore}.json`);
}

async function loadState(pathname: string, job: JobName, storeCode: string): Promise<JobState> {
  if (!existsSync(pathname)) {
    return { job, storeCode, lastCursor: null };
  }
  const raw = await readFile(pathname, 'utf8');
  const state = JSON.parse(raw) as JobState;
  return {
    job,
    storeCode,
    lastCursor: state.lastCursor ?? null,
    pendingCursor: state.pendingCursor ?? null,
    lastRunAt: state.lastRunAt,
    lastBatchFile: state.lastBatchFile,
    lastError: state.lastError ?? null,
  };
}

async function saveState(pathname: string, state: JobState) {
  await mkdir(dirname(pathname), { recursive: true });
  await writeFile(pathname, JSON.stringify(state, null, 2), 'utf8');
}

async function fetchRows(
  sqlText: string,
  params: {
    job: JobName;
    storeCode: string;
    tariffId?: number;
    limit: number;
    cursor: unknown;
  },
): Promise<any[]> {
  const pool = await createConnection();
  try {
    const request = pool.request();
    request.input('storeCode', mssql.VarChar, params.storeCode);
    request.input('limit', mssql.Int, params.limit);
    if (params.job === 'prices') {
      request.input('tariffId', mssql.Int, params.tariffId ?? 1);
      if (params.cursor) {
        request.input('cursor', mssql.DateTime2, params.cursor as Date);
      } else {
        request.input('cursor', mssql.DateTime2, null);
      }
    } else {
      if (params.cursor) {
        request.input('cursor', mssql.VarChar, String(params.cursor));
      } else {
        request.input('cursor', mssql.VarChar, null);
      }
    }
    const result = await request.query(sqlText);
    return result.recordset ?? [];
  } finally {
    await pool.close();
  }
}

async function createConnection() {
  const config: mssql.config = {
    server: String(process.env.LEGACY_DB_SERVER),
    user: String(process.env.LEGACY_DB_USER),
    password: String(process.env.LEGACY_DB_PASSWORD),
    database: String(process.env.LEGACY_DB_DATABASE),
    port: process.env.LEGACY_DB_PORT ? Number(process.env.LEGACY_DB_PORT) : 1433,
    options: {
      encrypt: false,
      trustServerCertificate: true,
    },
    pool: {
      min: 0,
      max: 10,
      idleTimeoutMillis: 30000,
    },
  };
  return mssql.connect(config);
}

function chooseCursor(stateCursor: JobCursor, cliCursor: JobCursor, type: 'date' | 'string'): JobCursor {
  if (!cliCursor) return stateCursor ?? null;
  if (!stateCursor) return cliCursor;
  if (type === 'date') {
    const cliDate = new Date(cliCursor).getTime();
    const stateDate = new Date(stateCursor).getTime();
    return cliDate > stateDate ? cliCursor : stateCursor;
  }
  return cliCursor > stateCursor ? cliCursor : stateCursor;
}

async function uploadWithRetry(options: {
  baseUrl: string;
  endpointPath: string;
  payload: unknown;
  apiKey?: string;
}) {
  const url = `${options.baseUrl}${options.endpointPath}`;
  const maxAttempts = 5;
  const baseDelayMs = 2_000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(options.apiKey ? { Authorization: `Bearer ${options.apiKey}` } : {}),
        },
        body: JSON.stringify(options.payload),
      });

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`HTTP ${response.status}: ${text}`);
      }

      const result = await response.json().catch(() => ({}));
      if (!isValidSyncResponse(result)) {
        throw new Error('Unexpected response payload');
      }

      return true;
    } catch (error) {
      const wait = baseDelayMs * Math.pow(2, attempt - 1);
      console.warn(`Upload attempt ${attempt} failed: ${(error as Error).message}`);
      if (attempt === maxAttempts) {
        return false;
      }
      await delay(wait);
    }
  }

  return false;
}

function isValidSyncResponse(response: unknown): boolean {
  if (!response || typeof response !== 'object') return false;
  const maybe = response as { processed?: number; applied?: number; failed?: number };
  return (
    (typeof maybe.processed === 'number' && maybe.processed >= 0) ||
    (typeof maybe.applied === 'number' && maybe.applied >= 0)
  );
}

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return [items];
  const result: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    result.push(items.slice(i, i + size));
  }
  return result;
}

function normalizeNumber(value: unknown): number | null {
  if (value == null) return null;
  const num = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(num) ? num : null;
}

function toInteger(value: unknown): number | null {
  const num = normalizeNumber(value);
  if (num == null) return null;
  return Math.trunc(num);
}

function parseJsonArray<T>(json: string | null): T[] {
  if (!json) return [];
  try {
    const data = JSON.parse(json) as T[];
    if (Array.isArray(data)) return data;
    return [];
  } catch {
    return [];
  }
}

main().catch((error) => {
  console.error('Extractor run failed:', error);
  process.exitCode = 1;
});
