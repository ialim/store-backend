import {
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  BadRequestException,
  ForbiddenException,
  Req,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as multer from 'multer';
import { VariantImportService } from './variant-import.service';
import { AuthGuard } from '@nestjs/passport';
import type { Request } from 'express';
import type { AuthenticatedUser } from '../../auth/auth.service';

type RequestWithUser = Request & { user?: AuthenticatedUser };

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
  async importVariants(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Req() req: RequestWithUser,
  ) {
    if (!file || !file.buffer) {
      throw new BadRequestException('No CSV file provided');
    }
    const user = req.user;
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
    const summary = await this.variantImportService.importFromCsv(file.buffer);
    return summary;
  }
}
