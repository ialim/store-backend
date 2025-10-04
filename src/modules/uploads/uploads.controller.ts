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
import { existsSync, mkdirSync } from 'fs';
import { join } from 'path';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import multer = require('multer');
import type { Request } from 'express';
import { AuthGuard } from '@nestjs/passport';
import type { AuthenticatedUser } from '../auth/auth.service';

type RequestWithUser = Request & { user?: AuthenticatedUser };

function ensureDir(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

const headerValue = (
  value: string | string[] | undefined,
): string | undefined => {
  if (Array.isArray(value)) return value[0];
  return value ?? undefined;
};

type InvoiceUploadResponse = {
  url: string;
  path: string;
  filename: string;
  size: number;
  mimetype: string;
};

const isMulterFile = (value: unknown): value is Express.Multer.File => {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Record<string, unknown>;
  return (
    typeof candidate.filename === 'string' &&
    typeof candidate.mimetype === 'string' &&
    typeof candidate.size === 'number'
  );
};

@Controller('uploads')
@UseGuards(AuthGuard('jwt'))
export class UploadsController {
  private ensureCanUpload(user?: AuthenticatedUser) {
    const roleName = user?.role?.name;
    const hasPrivilegedRole = roleName
      ? ['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(roleName)
      : false;
    const hasManageProductsPermission = Boolean(
      user?.role?.permissions?.some(
        (permission) => permission.name === 'MANAGE_PRODUCTS',
      ),
    );
    if (!hasPrivilegedRole && !hasManageProductsPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  @Post('invoices')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.diskStorage({
        destination: (
          _req: Request,
          _file: Express.Multer.File,
          cb: (error: Error | null, destination: string) => void,
        ) => {
          const dest = join(process.cwd(), 'uploads', 'invoices');
          ensureDir(dest);
          cb(null, dest);
        },
        filename: (
          _req: Request,
          file: Express.Multer.File,
          cb: (error: Error | null, filename: string) => void,
        ) => {
          const original =
            typeof file.originalname === 'string' && file.originalname
              ? file.originalname
              : 'invoice';
          const safe = original.replace(/[^a-zA-Z0-9._-]/g, '_');
          cb(null, `${Date.now()}_${safe}`);
        },
      }),
      limits: { fileSize: 25 * 1024 * 1024 },
    }),
  )
  uploadInvoice(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req?: RequestWithUser,
  ): InvoiceUploadResponse {
    if (!file || !isMulterFile(file)) {
      throw new BadRequestException('No file');
    }
    this.ensureCanUpload(req?.user);
    const path = `/uploads/invoices/${file.filename}`;
    const protoHeader = headerValue(req?.headers['x-forwarded-proto']);
    const proto = protoHeader || req?.protocol || 'http';
    const forwardedHost = headerValue(req?.headers['x-forwarded-host']);
    const host = forwardedHost || req?.get?.('host') || undefined;
    const origin = host ? `${proto}://${host}` : '';
    const url = origin ? `${origin}${path}` : path;
    return {
      url,
      path,
      filename: file.filename,
      size: file.size,
      mimetype: file.mimetype,
    };
  }
}
