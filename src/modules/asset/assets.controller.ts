import {
  BadRequestException,
  Body,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
// eslint-disable-next-line @typescript-eslint/no-require-imports
import multer = require('multer');
import { AssetEntityType, AssetKind, Prisma } from '@prisma/client';
import { AssetService, AssetWithAssignments } from './asset.service';

const MAX_FILE_SIZE = Number.parseInt(
  process.env.ASSET_MAX_FILE_SIZE ?? `${25 * 1024 * 1024}`,
  10,
);

const parseBoolean = (value: string | string[] | undefined): boolean => {
  if (Array.isArray(value)) return value.some(parseBoolean);
  if (!value) return false;
  return ['true', '1', 'yes', 'on'].includes(value.toLowerCase());
};

const coerceEnum = <T extends Record<string, string>>(
  enumType: T,
  value?: string | string[],
): T[keyof T] | undefined => {
  if (Array.isArray(value)) {
    return coerceEnum(enumType, value[0]);
  }
  if (!value) return undefined;
  const upper = value.toUpperCase();
  return enumType[upper as keyof T];
};

const parseMetadata = (
  value?: string | string[],
): Prisma.JsonValue | undefined => {
  if (!value) return undefined;
  const input = Array.isArray(value) ? value[0] : value;
  if (!input.trim()) return undefined;
  try {
    return JSON.parse(input) as Prisma.JsonValue;
  } catch {
    throw new BadRequestException('metadata must be valid JSON');
  }
};

@Controller('assets')
@UseGuards(AuthGuard('jwt'))
export class AssetsController {
  constructor(private readonly assetService: AssetService) {}

  @Post()
  @UseInterceptors(
    FileInterceptor('file', {
      storage: multer.memoryStorage(),
      limits: {
        fileSize: Number.isFinite(MAX_FILE_SIZE) ? MAX_FILE_SIZE : undefined,
      },
    }),
  )
  async uploadAsset(
    @UploadedFile() file: Express.Multer.File | undefined,
    @Body()
    body: {
      kind?: string | string[];
      entityType?: string | string[];
      entityId?: string | string[];
      isPrimary?: string | string[];
      metadata?: string | string[];
    },
  ): Promise<AssetWithAssignments> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    const kind = coerceEnum(AssetKind, body.kind) ?? AssetKind.IMAGE;

    const entityType = coerceEnum(AssetEntityType, body.entityType);
    const rawEntityId = Array.isArray(body.entityId)
      ? body.entityId[0]
      : body.entityId;
    const entityId = rawEntityId?.toString().trim() || undefined;

    const metadata = parseMetadata(body.metadata);

    if ((entityType && !entityId) || (!entityType && entityId)) {
      throw new BadRequestException(
        'entityType and entityId must be provided together',
      );
    }

    const assignment =
      entityType && entityId
        ? {
            entityType,
            entityId,
            isPrimary: parseBoolean(body.isPrimary),
          }
        : undefined;

    return this.assetService.uploadAsset(file, {
      kind,
      metadata,
      assignment,
    });
  }
}
