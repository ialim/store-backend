import { Injectable, Logger } from '@nestjs/common';
import { InvoiceImportStatus as PrismaInvoiceImportStatus } from '@prisma/client';
import { PrismaService } from '../../common/prisma/prisma.service';
import { InvoiceIngestService } from './invoice-ingest.service';
import { normalizeParsedByVendor } from './vendor-rules';

type BullTypes = {
  Queue: any;
  Worker: any;
  QueueScheduler: any;
  JobsOptions: any;
};

@Injectable()
export class InvoiceImportQueue {
  private logger = new Logger(InvoiceImportQueue.name);
  private bull: BullTypes | null = null;
  private queue: any | null = null;
  private scheduler: any | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ingest: InvoiceIngestService,
  ) {
    this.setup().catch(() => {});
  }

  private async setup() {
    try {
      let reqFn: NodeJS.Require | null = null;
      try {
        // eslint-disable-next-line no-eval
        reqFn = eval('require');
      } catch {}
      const mod = reqFn ? (reqFn('bullmq') as any) : null;
      const { Queue, Worker, QueueScheduler } = mod || {};
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
      this.bull = {
        Queue,
        Worker,
        QueueScheduler,
        JobsOptions: undefined,
      };
      this.queue = new Queue('invoice-imports', { connection });
      this.scheduler = new QueueScheduler('invoice-imports', { connection });
      // Worker
      // eslint-disable-next-line @typescript-eslint/no-misused-promises
      new Worker(
        'invoice-imports',
        async (job: { data: { id: string; url: string; supplierName?: string | null } }) => {
          const { id, url, supplierName } = job.data as {
            id: string;
            url: string;
            supplierName?: string | null;
          };
          await this.processImport(id, url, supplierName ?? null);
        },
        { connection },
      );
      this.logger.log('BullMQ invoice-imports queue initialized');
    } catch (e) {
      this.logger.log('BullMQ not available; falling back to in-process tasks');
    }
  }

  async enqueue(id: string, url: string, supplierName?: string | null) {
    if (this.queue && this.bull) {
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
        this.logger.error(err?.message || String(err)),
      );
    });
  }

  private sanitizeRaw(text: string): string {
    return text.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
  }
  private sanitizeDeep<T>(value: T): T {
    const strip = (s: string) =>
      s.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, '');
    if (value == null) return value;
    if (typeof value === 'string') return (strip(value) as unknown) as T;
    if (Array.isArray(value))
      return (value.map((v) => this.sanitizeDeep(v)) as unknown) as T;
    if (typeof value === 'object') {
      const out: Record<string, unknown> = {};
      for (const [k, v] of Object.entries(value as Record<string, unknown>))
        out[k] = this.sanitizeDeep(v);
      return (out as unknown) as T;
    }
    return value;
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
      const normalized = normalizeParsedByVendor(this.sanitizeDeep(parsed));
      const raw = rawText ? this.sanitizeRaw(rawText) : undefined;
      const parsedClean = this.sanitizeDeep(
        raw ? { ...normalized, rawText: raw } : normalized,
      );
      const supplierName =
        (existingSupplier ?? '').trim() || (normalized.supplierName ?? null);
      await this.prisma.invoiceImport.update({
        where: { id },
        data: {
          status: normalized.lines.length
            ? PrismaInvoiceImportStatus.READY
            : PrismaInvoiceImportStatus.NEEDS_REVIEW,
          parsed: parsedClean,
          supplierName,
          message: null,
        },
      });
    } catch (err: unknown) {
      await this.prisma.invoiceImport.update({
        where: { id },
        data: {
          status: PrismaInvoiceImportStatus.FAILED,
          message: (err as { message?: string })?.message || String(err),
        },
      });
    }
  }
}
