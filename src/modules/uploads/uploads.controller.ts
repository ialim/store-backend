import { Controller, Post, UploadedFile, UseInterceptors, BadRequestException, Req } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
import type { Request } from 'express';

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

@Controller('uploads')
export class UploadsController {
  @Post('invoices')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (_req, _file, cb) => {
          const dest = join(process.cwd(), 'uploads', 'invoices');
          ensureDir(dest);
          cb(null, dest);
        },
        filename: (_req, file, cb) => {
          const safe = (file.originalname || 'invoice').replace(/[^a-zA-Z0-9._-]/g, '_');
          cb(null, `${Date.now()}_${safe}`);
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  uploadInvoice(@UploadedFile() file?: any, @Req() req?: Request) {
    if (!file) throw new BadRequestException('No file');
    const path = `/uploads/invoices/${file.filename}`;
    const proto = (req?.headers['x-forwarded-proto'] as string) || req?.protocol || 'http';
    const host = req?.headers['x-forwarded-host'] || req?.get('host');
    const origin = host ? `${proto}://${host}` : '';
    const url = origin ? `${origin}${path}` : path;
    return { url, path, filename: file.filename, size: file.size, mimetype: file.mimetype };
  }
}
