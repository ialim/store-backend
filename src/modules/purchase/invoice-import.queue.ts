import { Injectable, Logger } from '@nestjs/common';
import {
  Prisma,
  InvoiceImportStatus as PrismaInvoiceImportStatus,
} from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InvoiceIngestService } from './invoice-ingest.service';
import { normalizeParsedByVendor } from './vendor-rules';

type InvoiceImportJobData = {
  id: string;
  url: string;
  supplierName?: string | null;
};
type BullQueue<T> = import('bullmq').Queue<T, unknown, string>;
type BullQueueScheduler = import('bullmq').QueueScheduler;
type BullQueueModule = typeof import('bullmq');

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
export class InvoiceImportQueue {
  private logger = new Logger(InvoiceImportQueue.name);
  private queue: BullQueue<InvoiceImportJobData> | null = null;
  private scheduler: BullQueueScheduler | null = null;
  private static readonly controlCharPattern = new RegExp(
    '[\\u0000-\\u0008\\u000B\\u000C\\u000E-\\u001F]',
    'g',
  );

  constructor(
    private readonly prisma: PrismaService,
    private readonly ingest: InvoiceIngestService,
  ) {
    void this.setup();
  }

  private async setup() {
    try {
      const connection = process.env.REDIS_URL
        ? { url: process.env.REDIS_URL }
        : process.env.REDIS_HOST
          ? {
              host: process.env.REDIS_HOST,
              port: Number(process.env.REDIS_PORT || 6379),
            }
          : null;
      if (!connection) {
        this.logger.log(
          'Redis not configured; falling back to in-process tasks',
        );
        return;
      }
      const mod: BullQueueModule = await import('bullmq');
      const { Queue, Worker, QueueScheduler } = mod;
      this.queue = new Queue<InvoiceImportJobData>('invoice-imports', {
        connection,
      });
      this.scheduler = new QueueScheduler('invoice-imports', { connection });
      new Worker<InvoiceImportJobData>(
        'invoice-imports',
        async ({ data }) => {
          const { id, url, supplierName } = data;
          await this.processImport(id, url, supplierName ?? null);
        },
        { connection },
      );
      this.logger.log('BullMQ invoice-imports queue initialized');
    } catch (error) {
      this.logger.warn(
        `BullMQ not available; falling back to in-process tasks: ${toErrorMessage(
          error,
        )}`,
      );
    }
  }

  async enqueue(id: string, url: string, supplierName?: string | null) {
    if (this.queue) {
      await this.queue.add(
        'process',
        { id, url, supplierName },
        { attempts: 3, backoff: { type: 'exponential', delay: 500 } },
      );
      return;
    }
    // Fallback: run soon without durability
    setImmediate(() => {
      this.processImport(id, url, supplierName ?? null).catch((err) =>
        this.logger.error(toErrorMessage(err)),
      );
    });
  }

  private sanitizeString(value: string): string {
    return value.replace(InvoiceImportQueue.controlCharPattern, '');
  }

  private sanitizeJson(value: unknown): Prisma.JsonValue {
    if (value === null) return null;
    if (value === undefined) return null;
    if (typeof value === 'string') return this.sanitizeString(value);
    if (typeof value === 'number' || typeof value === 'boolean') return value;
    if (value instanceof Date) return value.toISOString();
    if (Array.isArray(value)) {
      return value.map((v) => this.sanitizeJson(v)) as Prisma.JsonValue;
    }
    if (typeof value === 'object') {
      const out: Record<string, Prisma.JsonValue> = {};
      for (const [key, v] of Object.entries(value as Record<string, unknown>)) {
        const sanitized = this.sanitizeJson(v);
        out[key] = sanitized;
      }
      return out;
    }
    if (typeof value === 'symbol') {
      return this.sanitizeString(value.toString());
    }
    if (typeof value === 'bigint') {
      return this.sanitizeString(value.toString());
    }
    if (typeof value === 'function') {
      return this.sanitizeString(value.name || '[function]');
    }
    return this.sanitizeString('');
  }

  private async processImport(
    id: string,
    url: string,
    existingSupplier?: string | null,
  ) {
    try {
      await this.prisma.invoiceImport.update({
        where: { id },
        data: { status: PrismaInvoiceImportStatus.PROCESSING },
      });
      const { parsed, rawText } = await this.ingest.parseInvoiceFromUrl(url);
      const normalized = normalizeParsedByVendor(parsed);
      const raw = rawText ? this.sanitizeString(rawText) : undefined;
      const parsedPayload = raw ? { ...normalized, rawText: raw } : normalized;
      const parsedClean = this.sanitizeJson(parsedPayload);
      const parsedValue =
        parsedClean === null
          ? Prisma.DbNull
          : (parsedClean as Prisma.InputJsonValue);
      const supplierName =
        (existingSupplier ?? '').trim() || normalized.supplierName || null;
      await this.prisma.invoiceImport.update({
        where: { id },
        data: {
          status: normalized.lines.length
            ? PrismaInvoiceImportStatus.READY
            : PrismaInvoiceImportStatus.NEEDS_REVIEW,
          parsed: parsedValue,
          supplierName,
          message: null,
        },
      });
    } catch (err: unknown) {
      await this.prisma.invoiceImport.update({
        where: { id },
        data: {
          status: PrismaInvoiceImportStatus.FAILED,
          message: toErrorMessage(err),
        },
      });
    }
  }
}
