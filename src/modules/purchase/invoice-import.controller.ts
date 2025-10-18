import {
  Controller,
  ForbiddenException,
  Get,
  NotFoundException,
  Req,
  Res,
  StreamableFile,
  UnauthorizedException,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import type { Request, Response } from 'express';
import { join, extname } from 'path';
import { createReadStream, existsSync, statSync } from 'fs';
import { Readable } from 'stream';
import type { AuthenticatedUser } from '../auth/auth.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PERMISSIONS } from '../../../shared/permissions';
import { InvoiceStorageService } from '../uploads/invoice-storage.service';

type RequestWithUser = Request & { user?: AuthenticatedUser };

type RemoteInvoiceStream = {
  stream: Readable;
  contentType: string;
  contentLength?: number;
  filename: string;
};

@Controller('invoice-imports')
export class InvoiceImportController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly invoiceStorage: InvoiceStorageService,
  ) {}

  @Get(':id/file')
  @UseGuards(AuthGuard('jwt'))
  async downloadInvoiceFile(
    @Req() req: RequestWithUser,
    @Res({ passthrough: true }) res: Response,
  ): Promise<StreamableFile> {
    this.ensureCanDownload(req.user);
    const id = req.params?.id;
    if (!id) {
      throw new NotFoundException('Invoice import not specified');
    }
    const invoice = await this.prisma.invoiceImport.findUnique({
      where: { id },
    });
    if (!invoice || !invoice.url) {
      throw new NotFoundException('Invoice import file not found');
    }
    const storageTarget = this.invoiceStorage.parseUri(invoice.url);
    if (storageTarget) {
      try {
        const { stream, contentType, contentLength, filename } =
          await this.invoiceStorage.getObjectStream(storageTarget);
        res.set({
          'Content-Type': contentType,
          'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
          'Cache-Control': 'private, max-age=0, must-revalidate',
        });
        if (contentLength != null) {
          res.setHeader('Content-Length', contentLength.toString());
        }
        return new StreamableFile(stream);
      } catch {
        // fall back to legacy handling below
      }
    }

    const legacyFile = this.resolveLocalFile(invoice.url);
    if (legacyFile) {
      const { absolutePath, filename, contentType, size } = legacyFile;
      const fileStream = createReadStream(absolutePath);
      res.set({
        'Content-Type': contentType,
        'Content-Length': size.toString(),
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
      });
      return new StreamableFile(fileStream);
    }

    const remote = await this.tryFetchRemote(invoice.url);
    if (remote) {
      const { stream, contentType, contentLength, filename } = remote;
      res.set({
        'Content-Type': contentType,
        'Content-Disposition': `inline; filename="${encodeURIComponent(filename)}"`,
        'Cache-Control': 'private, max-age=0, must-revalidate',
      });
      if (contentLength != null) {
        res.setHeader('Content-Length', contentLength.toString());
      }
      return new StreamableFile(stream);
    }

    throw new NotFoundException('Invoice file is unavailable');
  }

  private ensureCanDownload(user?: AuthenticatedUser | null): void {
    if (!user) throw new UnauthorizedException();
    const roleName = user.role?.name;
    const privilegedRole = roleName
      ? ['SUPERADMIN', 'ADMIN', 'MANAGER'].includes(roleName)
      : false;
    const hasPurchaseRead = Boolean(
      user.role?.permissions?.some(
        (permission) => permission.name === PERMISSIONS.purchase.READ,
      ),
    );
    if (!privilegedRole && !hasPurchaseRead) {
      throw new ForbiddenException('Insufficient permissions');
    }
  }

  private resolveLocalFile(url: string): {
    absolutePath: string;
    filename: string;
    contentType: string;
    size: number;
  } | null {
    let pathname = '';
    try {
      const parsed = new URL(url);
      pathname = parsed.pathname || '';
    } catch {
      pathname = url;
    }
    const match = /\/uploads\/invoices\/([^/?#]+)/i.exec(pathname);
    if (!match) return null;
    let rawName: string;
    try {
      rawName = decodeURIComponent(match[1]);
    } catch {
      return null;
    }
    if (
      !rawName ||
      rawName.includes('..') ||
      rawName.includes('/') ||
      !/^[a-zA-Z0-9._-]+$/.test(rawName)
    ) {
      return null;
    }
    const absolutePath = join(process.cwd(), 'uploads', 'invoices', rawName);
    if (!existsSync(absolutePath)) return null;
    const stats = statSync(absolutePath);
    if (!stats.isFile()) return null;
    return {
      absolutePath,
      filename: rawName,
      contentType: this.guessContentType(rawName),
      size: stats.size,
    };
  }

  private guessContentType(filename: string): string {
    switch (extname(filename).toLowerCase()) {
      case '.pdf':
        return 'application/pdf';
      case '.png':
        return 'image/png';
      case '.jpg':
      case '.jpeg':
        return 'image/jpeg';
      case '.gif':
        return 'image/gif';
      case '.webp':
        return 'image/webp';
      default:
        return 'application/octet-stream';
    }
  }

  private async tryFetchRemote(
    url: string,
  ): Promise<RemoteInvoiceStream | null> {
    try {
      const g = globalThis as unknown as { fetch?: typeof fetch };
      const f = g.fetch;
      if (!f) return null;
      const res = await f(url);
      if (!res.ok || !res.body) return null;
      const contentType =
        res.headers?.get?.('content-type') || 'application/octet-stream';
      const contentLengthHeader = res.headers?.get?.('content-length');
      const contentLength = contentLengthHeader
        ? Number.parseInt(contentLengthHeader, 10)
        : undefined;
      const filename = url.split('/').pop() || 'invoice';
      const nodeStream = Readable.fromWeb(
        res.body as unknown as import('stream/web').ReadableStream<unknown>,
      );
      return {
        stream: nodeStream,
        contentType,
        contentLength,
        filename,
      };
    } catch {
      return null;
    }
  }
}
