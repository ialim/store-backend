import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { FileInterceptor } from '@nestjs/platform-express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import multer = require('multer');
import { PaymentReceiptService } from './payment-receipt.service';

const MAX_FILE_SIZE = Number.parseInt(
  process.env.PAYMENT_RECEIPT_MAX_FILE_SIZE ?? `${10 * 1024 * 1024}`,
  10,
);

@Controller('payments/receipts')
@UseGuards(AuthGuard('jwt'))
export class PaymentReceiptController {
  constructor(private readonly receipts: PaymentReceiptService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: Number.isFinite(MAX_FILE_SIZE) ? MAX_FILE_SIZE : undefined,
      },
    }),
  )
  uploadReceipt(@UploadedFile() file: Express.Multer.File | undefined) {
    return this.receipts.uploadReceipt(file);
  }
}
