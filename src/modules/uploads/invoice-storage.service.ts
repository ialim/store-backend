import { Injectable, Logger } from '@nestjs/common';
import {
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
  type GetObjectCommandInput,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';
import type { Readable } from 'stream';

type UploadInvoiceInput = {
  filename: string;
  contentType?: string | null;
  contentLength?: number | null;
  body: Buffer;
};

type ParsedInvoiceUri = {
  bucket: string;
  key: string;
};

type ObjectStreamResult = {
  stream: Readable;
  contentType: string;
  contentLength?: number;
  filename: string;
  lastModified?: Date;
};

type ObjectBufferResult = {
  buffer: Buffer;
  contentType: string;
  filename: string;
};

@Injectable()
export class InvoiceStorageService {
  private readonly logger = new Logger(InvoiceStorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint?: string;
  private readonly forcePathStyle: boolean;
  private readonly keyPrefix: string;

  constructor() {
    this.bucket =
      process.env.INVOICE_S3_BUCKET ??
      process.env.ASSET_S3_BUCKET ??
      'store-invoices';
    this.region =
      process.env.INVOICE_S3_REGION ??
      process.env.ASSET_S3_REGION ??
      process.env.AWS_REGION ??
      'us-east-1';
    this.endpoint =
      process.env.INVOICE_S3_ENDPOINT ?? process.env.ASSET_S3_ENDPOINT;
    this.forcePathStyle = !['false', '0'].includes(
      (
        process.env.INVOICE_S3_FORCE_PATH_STYLE ??
        process.env.ASSET_S3_FORCE_PATH_STYLE ??
        'true'
      ).toLowerCase(),
    );

    const prefix =
      process.env.INVOICE_S3_PREFIX ??
      process.env.ASSET_S3_PREFIX ??
      'invoices';
    this.keyPrefix = prefix.replace(/^\/+|\/+$|^\.+/g, '') || 'invoices';

    const accessKeyId =
      process.env.INVOICE_S3_ACCESS_KEY ??
      process.env.ASSET_S3_ACCESS_KEY ??
      process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey =
      process.env.INVOICE_S3_SECRET_KEY ??
      process.env.ASSET_S3_SECRET_KEY ??
      process.env.AWS_SECRET_ACCESS_KEY;
    const credentials =
      accessKeyId && secretAccessKey
        ? { accessKeyId, secretAccessKey }
        : undefined;

    this.client = new S3Client({
      region: this.region,
      endpoint: this.endpoint,
      forcePathStyle: this.forcePathStyle,
      credentials,
    });
  }

  async uploadInvoice(
    input: UploadInvoiceInput,
  ): Promise<{ bucket: string; key: string; uri: string; filename: string }> {
    const key = this.buildObjectKey(input.filename);
    const sanitizedName = this.sanitizeFilename(input.filename);

    const putParams: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
      Body: input.body,
      ContentType: input.contentType ?? undefined,
      ContentLength: input.contentLength ?? undefined,
      Metadata: {
        originalname: sanitizedName,
      },
    };

    await this.client.send(new PutObjectCommand(putParams));

    return {
      bucket: this.bucket,
      key,
      uri: this.buildUri(key),
      filename: sanitizedName,
    };
  }

  parseUri(source: string | null | undefined): ParsedInvoiceUri | null {
    if (!source) return null;
    if (source.startsWith('s3://')) {
      const withoutScheme = source.slice(5);
      const sep = withoutScheme.indexOf('/');
      if (sep <= 0) return null;
      return {
        bucket: withoutScheme.slice(0, sep),
        key: withoutScheme.slice(sep + 1),
      };
    }
    if (source.startsWith('minio://')) {
      const withoutScheme = source.slice(8);
      const sep = withoutScheme.indexOf('/');
      if (sep <= 0) return null;
      return {
        bucket: withoutScheme.slice(0, sep),
        key: withoutScheme.slice(sep + 1),
      };
    }
    // Treat bare keys as belonging to configured bucket
    if (!source.includes('://')) {
      return { bucket: this.bucket, key: source.replace(/^\/+/, '') };
    }
    return null;
  }

  buildUri(key: string, bucket = this.bucket): string {
    const normalizedKey = key.replace(/^\/+/, '');
    return `s3://${bucket}/${normalizedKey}`;
  }

  async getObjectStream(
    source: string | ParsedInvoiceUri,
  ): Promise<ObjectStreamResult> {
    const target = this.normalizeSource(source);
    const commandInput: GetObjectCommandInput = {
      Bucket: target.bucket,
      Key: target.key,
    };
    const res = await this.client.send(new GetObjectCommand(commandInput));
    const stream = res.Body as Readable | undefined;
    if (!stream) {
      throw new Error('Invoice object stream unavailable');
    }
    const contentType = res.ContentType || 'application/octet-stream';
    const metadataName =
      res.Metadata?.originalname ?? target.key.split('/').pop() ?? 'invoice';
    return {
      stream,
      contentType,
      contentLength: res.ContentLength ?? undefined,
      filename: metadataName,
      lastModified: res.LastModified,
    };
  }

  async getObjectBuffer(
    source: string | ParsedInvoiceUri,
  ): Promise<ObjectBufferResult> {
    const { stream, contentType, filename } =
      await this.getObjectStream(source);
    const buffer = await this.streamToBuffer(stream);
    return { buffer, contentType, filename };
  }

  private normalizeSource(source: string | ParsedInvoiceUri): ParsedInvoiceUri {
    if (typeof source === 'string') {
      const parsed = this.parseUri(source);
      if (!parsed) {
        throw new Error(`Unsupported invoice uri: ${source}`);
      }
      return parsed;
    }
    if (!source.bucket || !source.key) {
      throw new Error('Invalid invoice storage target');
    }
    return { bucket: source.bucket, key: source.key };
  }

  private buildObjectKey(originalName: string): string {
    const sanitized = this.sanitizeFilename(originalName);
    const generated = randomUUID();
    const segments = [this.keyPrefix, generated, sanitized].filter(Boolean);
    return segments.join('/');
  }

  private sanitizeFilename(name: string): string {
    const fallback = 'invoice';
    if (!name) return `${fallback}.pdf`;
    const trimmed = name.trim();
    if (!trimmed) return `${fallback}.pdf`;
    const sanitized = trimmed.replace(/[^a-zA-Z0-9._-]+/g, '-');
    return sanitized.length ? sanitized : `${fallback}.pdf`;
  }

  private async streamToBuffer(stream: Readable): Promise<Buffer> {
    const chunks: Buffer[] = [];
    for await (const chunk of stream as AsyncIterable<Buffer | string>) {
      const bufferChunk = Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
      chunks.push(bufferChunk);
    }
    return Buffer.concat(chunks);
  }
}
