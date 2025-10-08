import { Injectable, Logger } from '@nestjs/common';
import {
  DeleteObjectCommand,
  PutObjectCommand,
  S3Client,
  type DeleteObjectCommandInput,
  type PutObjectCommandInput,
} from '@aws-sdk/client-s3';
import { randomUUID } from 'crypto';

interface UploadObjectInput {
  key?: string;
  filename: string;
  body: PutObjectCommandInput['Body'];
  contentType?: string;
  contentLength?: number;
  metadata?: Record<string, string>;
  entityNamespace?: string;
}

@Injectable()
export class AssetStorageService {
  private readonly logger = new Logger(AssetStorageService.name);
  private readonly client: S3Client;
  private readonly bucket: string;
  private readonly region: string;
  private readonly endpoint?: string;
  private readonly forcePathStyle: boolean;
  private readonly baseUrl?: string;
  private readonly acl?: string;
  private readonly keyPrefix?: string;

  constructor() {
    this.bucket =
      process.env.ASSET_S3_BUCKET ?? process.env.S3_BUCKET ?? 'assets';
    this.region =
      process.env.ASSET_S3_REGION ?? process.env.AWS_REGION ?? 'us-east-1';
    this.endpoint = process.env.ASSET_S3_ENDPOINT ?? process.env.S3_ENDPOINT;
    this.forcePathStyle = !['false', '0'].includes(
      (process.env.ASSET_S3_FORCE_PATH_STYLE ?? 'true').toLowerCase(),
    );
    this.baseUrl = process.env.ASSET_PUBLIC_URL;
    this.acl = process.env.ASSET_S3_ACL;
    const prefix = process.env.ASSET_S3_PREFIX ?? process.env.S3_PREFIX;
    if (prefix) {
      this.keyPrefix = prefix.replace(/^\/+|\/+$|^\.+/g, '');
    }

    const accessKeyId =
      process.env.ASSET_S3_ACCESS_KEY ?? process.env.AWS_ACCESS_KEY_ID;
    const secretAccessKey =
      process.env.ASSET_S3_SECRET_KEY ?? process.env.AWS_SECRET_ACCESS_KEY;
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

  async uploadObject(input: UploadObjectInput): Promise<{
    bucket: string;
    key: string;
    url: string;
  }> {
    const key = this.buildObjectKey(input);

    const putParams: PutObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
      Body: input.body,
      ContentType: input.contentType,
      ContentLength: input.contentLength,
      Metadata: input.metadata,
    };

    if (this.acl) {
      putParams.ACL = this.acl as PutObjectCommandInput['ACL'];
    }

    await this.client.send(new PutObjectCommand(putParams));

    const url = this.buildObjectUrl(key);
    return { bucket: this.bucket, key, url };
  }

  async deleteObject(key: string): Promise<void> {
    const deleteParams: DeleteObjectCommandInput = {
      Bucket: this.bucket,
      Key: key,
    };
    try {
      await this.client.send(new DeleteObjectCommand(deleteParams));
    } catch (error) {
      const stack = error instanceof Error ? error.stack : undefined;
      this.logger.error(`Failed to delete object ${key}`, stack);
    }
  }

  getBucket(): string {
    return this.bucket;
  }

  private buildObjectKey(input: UploadObjectInput): string {
    if (input.key) {
      return this.applyPrefix(input.key);
    }
    const namespace = input.entityNamespace
      ? this.sanitizeSegment(input.entityNamespace)
      : 'general';
    const filename = this.sanitizeFilename(input.filename);
    const generated = `${randomUUID()}-${filename}`;
    const segments = [this.keyPrefix, namespace, generated].filter(
      Boolean,
    ) as string[];
    return segments.join('/');
  }

  private sanitizeFilename(filename: string): string {
    const fallback = 'asset';
    if (!filename) return fallback;
    const trimmed = filename.trim();
    if (!trimmed) return fallback;
    const sanitized = trimmed.replace(/[^a-zA-Z0-9._-]+/g, '-');
    return sanitized.length ? sanitized : fallback;
  }

  private sanitizeSegment(value: string): string {
    return value.replace(/[^a-zA-Z0-9_-]+/g, '-').toLowerCase();
  }

  private applyPrefix(key: string): string {
    if (!this.keyPrefix) {
      return key.replace(/^\/+/, '');
    }
    const normalizedKey = key.replace(/^\/+/, '');
    return `${this.keyPrefix}/${normalizedKey}`;
  }

  private buildObjectUrl(key: string): string {
    const encodedKey = key
      .split('/')
      .map((segment) => encodeURIComponent(segment).replace(/%2F/gi, '/'))
      .join('/');

    if (this.baseUrl) {
      const trimmedBase = this.baseUrl.replace(/\/+$/, '');
      return `${trimmedBase}/${encodedKey}`;
    }

    if (this.endpoint) {
      try {
        const endpointUrl = new URL(this.endpoint);
        const origin = endpointUrl.origin.replace(/\/$/, '');
        if (this.forcePathStyle) {
          return `${origin}/${this.bucket}/${encodedKey}`;
        }
        return `${endpointUrl.protocol}//${this.bucket}.${endpointUrl.host}/${encodedKey}`;
      } catch (error) {
        this.logger.warn(`Invalid ASSET_S3_ENDPOINT: ${error}`);
      }
    }

    return `https://${this.bucket}.s3.${this.region}.amazonaws.com/${encodedKey}`;
  }
}
