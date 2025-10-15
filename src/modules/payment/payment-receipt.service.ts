import { BadRequestException, Injectable } from '@nestjs/common';
import { AssetStorageService } from '../asset/asset-storage.service';

export type PaymentReceiptUploadResult = {
  bucket: string;
  key: string;
  url: string;
  filename: string;
  mimetype: string;
  size: number;
};

@Injectable()
export class PaymentReceiptService {
  constructor(private readonly storage: AssetStorageService) {}

  async uploadReceipt(
    file: Express.Multer.File | undefined,
  ): Promise<PaymentReceiptUploadResult> {
    if (!file || !file.buffer || file.size <= 0) {
      throw new BadRequestException('No file provided');
    }

    const filename = this.sanitizeFilename(file.originalname ?? 'receipt');

    const upload = await this.storage.uploadObject({
      filename,
      body: file.buffer,
      contentType: file.mimetype,
      contentLength: file.size,
      entityNamespace: 'payment-receipts',
    });

    return {
      bucket: upload.bucket,
      key: upload.key,
      url: upload.url,
      filename,
      mimetype: file.mimetype,
      size: file.size,
    };
  }

  private sanitizeFilename(filename: string): string {
    const trimmed = filename.trim();
    if (!trimmed) return 'receipt';
    const sanitized = trimmed.replace(/[^a-zA-Z0-9._-]+/g, '-');
    return sanitized.length ? sanitized : 'receipt';
  }
}
