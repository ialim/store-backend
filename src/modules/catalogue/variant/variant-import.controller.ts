import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { VariantImportService } from './variant-import.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('catalogue/variants')
@UseGuards(AuthGuard('jwt'))
export class VariantImportController {
  constructor(private readonly variantImportService: VariantImportService) {}

  @Post('import')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 10 * 1024 * 1024 },
    }),
  )
  async importVariants(@UploadedFile() file: Express.Multer.File | undefined) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No CSV file provided');
    }
    const summary = await this.variantImportService.importFromCsv(file.buffer);
    return summary;
  }
}
