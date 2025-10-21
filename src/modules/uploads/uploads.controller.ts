import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Req,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import multer = require('multer');
import type { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedUser } from '../auth/auth.service';
import { InvoiceStorageService } from './invoice-storage.service';
import { PERMISSIONS } from '../../../shared/permissions';

type RequestWithUser = Request & { user?: AuthenticatedUser };

type InvoiceUploadResponse = {
  url: string;
  key: string;
  bucket: string;
  filename: string;
  size: number;
  mimetype: string;
};

const isMulterFile = (value: unknown): value is Express.Multer.File => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.buffer !== 'undefined' &&
    typeof candidate.mimetype === 'string' &&
    typeof candidate.size === 'number'
  );
};

@Controller('uploads')
@UseGuards(AuthGuard('jwt'))
export class UploadsController {
  constructor(private readonly invoiceStorage: InvoiceStorageService) {}

  private ensureCanUpload(user?: AuthenticatedUser) {
    const roleName = user?.role?.name;
    const hasPrivilegedRole = roleName
      ? ['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(roleName)
      : false;
    const hasUploadPermission = Boolean(
      user?.role?.permissions?.some(
        (permission) => permission.name === PERMISSIONS.uploads.CREATE,
      ),
    );
    if (!hasPrivilegedRole && !hasUploadPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  @Post('invoices')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  async uploadInvoice(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req?: RequestWithUser,
  ): Promise<InvoiceUploadResponse> {
    if (!file || !isMulterFile(file)) {
      throw new BadRequestException('No file');
    }
    this.ensureCanUpload(req?.user);
    const invoice = await this.invoiceStorage.uploadInvoice({
      filename: file.originalname || file.fieldname || 'invoice.pdf',
      contentType: file.mimetype,
      contentLength: file.size,
      body: file.buffer,
    });

    return {
      url: invoice.uri,
      key: invoice.key,
      bucket: invoice.bucket,
      filename: invoice.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
