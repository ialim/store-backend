import { Module } from '@nestjs/common';
import { UploadsController } from './uploads.controller';
import { InvoiceStorageService } from './invoice-storage.service';

@Module({
  controllers: [UploadsController],
  providers: [InvoiceStorageService],
  exports: [InvoiceStorageService],
})
export class UploadsModule {}
