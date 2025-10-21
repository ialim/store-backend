import { BadRequestException, Injectable } from '@nestjs/common';
import { AssetKind, AssetEntityType, Prisma } from '@prisma/client';
import { randomUUID } from 'crypto';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BaseCrudService } from '../base.services';
import {
  Asset,
  CreateManyAssetArgs,
  CreateOneAssetArgs,
  DeleteManyAssetArgs,
  DeleteOneAssetArgs,
  FindFirstAssetArgs,
  FindManyAssetArgs,
  FindUniqueAssetArgs,
  AssetGroupByArgs,
  AssetAggregateArgs,
  UpdateManyAssetArgs,
  UpdateOneAssetArgs,
} from '../../shared/prismagraphql/asset';
import { AssetStorageService } from './asset-storage.service';

interface UploadAssetOptions {
  kind?: AssetKind;
  metadata?: Prisma.JsonValue;
  assignment?: {
    entityType: AssetEntityType;
    entityId: string;
    isPrimary?: boolean;
  };
}

export type AssetWithAssignments = Prisma.AssetGetPayload<{
  include: { assignments: true };
}>;

type AssetAssignmentWithAsset = Prisma.AssetAssignmentGetPayload<{
  include: { asset: true };
}>;

type AssignmentWhere = {
  assetId: string;
  entityType: AssetEntityType;
  entityId: string;
};

@Injectable()
export class AssetService extends BaseCrudService<
  Asset,
  FindFirstAssetArgs,
  FindUniqueAssetArgs,
  FindManyAssetArgs,
  AssetGroupByArgs,
  AssetAggregateArgs,
  CreateOneAssetArgs,
  CreateManyAssetArgs,
  UpdateOneAssetArgs,
  UpdateManyAssetArgs,
  DeleteOneAssetArgs,
  DeleteManyAssetArgs
> {
  constructor(
    prisma: PrismaService,
    private readonly storage: AssetStorageService,
  ) {
    super(prisma);
  }

  async uploadAsset(
    file: Express.Multer.File | undefined,
    options: UploadAssetOptions = {},
  ): Promise<AssetWithAssignments> {
    if (!file || !file.buffer) {
      throw new BadRequestException('No file provided');
    }

    const sanitizedFilename = this.sanitizeFilename(
      file.originalname ?? 'asset',
    );

    const namespace = options.assignment?.entityType
      ? options.assignment.entityType.toLowerCase()
      : 'general';

    const key = `${namespace}/${randomUUID()}-${sanitizedFilename}`;

    const uploadResult = await this.storage.uploadObject({
      filename: sanitizedFilename,
      body: file.buffer,
      contentType: file.mimetype,
      contentLength: file.size,
      entityNamespace: namespace,
      key,
    });

    const createData: Prisma.AssetCreateInput = {
      kind: options.kind ?? AssetKind.IMAGE,
      bucket: uploadResult.bucket,
      key: uploadResult.key,
      url: uploadResult.url,
      filename: sanitizedFilename,
      mimetype: file.mimetype,
      size: file.size,
      metadata: options.metadata ?? undefined,
    };

    const created = await this.prisma.asset.create({ data: createData });

    if (options.assignment) {
      await this.assignAssetInternal(created.id, options.assignment);
    }

    return this.prisma.asset.findUniqueOrThrow({
      where: { id: created.id },
      include: { assignments: true },
    });
  }

  async assignAsset(
    assetId: string,
    assignment: {
      entityType: AssetEntityType;
      entityId: string;
      isPrimary?: boolean;
    },
  ): Promise<AssetAssignmentWithAsset> {
    await this.prisma.asset.findUniqueOrThrow({ where: { id: assetId } });
    return this.assignAssetInternal(assetId, assignment);
  }

  async unassignAsset(where: AssignmentWhere): Promise<boolean> {
    await this.prisma.assetAssignment.delete({
      where: {
        assetId_entityType_entityId: where,
      },
    });
    return true;
  }

  async primaryAssignment(
    entityType: AssetEntityType,
    entityId: string,
  ): Promise<AssetAssignmentWithAsset | null> {
    return this.prisma.assetAssignment.findFirst({
      where: { entityType, entityId, isPrimary: true },
      include: { asset: true },
    });
  }

  async assignmentsForEntity(
    entityType: AssetEntityType,
    entityId: string,
  ): Promise<AssetAssignmentWithAsset[]> {
    return this.prisma.assetAssignment.findMany({
      where: { entityType, entityId },
      orderBy: { createdAt: 'desc' },
      include: { asset: true },
    });
  }

  async assignmentsForAsset(
    assetId: string,
  ): Promise<AssetAssignmentWithAsset[]> {
    return this.prisma.assetAssignment.findMany({
      where: { assetId },
      orderBy: { createdAt: 'desc' },
      include: { asset: true },
    });
  }

  async deleteAssetById(assetId: string): Promise<boolean> {
    const asset = await this.prisma.asset.findUnique({
      where: { id: assetId },
    });
    if (!asset) {
      return false;
    }
    await this.storage.deleteObject(asset.key);
    await this.prisma.asset.delete({ where: { id: assetId } });
    return true;
  }

  private async assignAssetInternal(
    assetId: string,
    assignment: {
      entityType: AssetEntityType;
      entityId: string;
      isPrimary?: boolean;
    },
  ): Promise<AssetAssignmentWithAsset> {
    if (assignment.isPrimary) {
      await this.prisma.assetAssignment.updateMany({
        where: {
          entityType: assignment.entityType,
          entityId: assignment.entityId,
          isPrimary: true,
        },
        data: { isPrimary: false },
      });
    }

    return this.prisma.assetAssignment.upsert({
      where: {
        assetId_entityType_entityId: {
          assetId,
          entityType: assignment.entityType,
          entityId: assignment.entityId,
        },
      },
      create: {
        assetId,
        entityType: assignment.entityType,
        entityId: assignment.entityId,
        isPrimary: assignment.isPrimary ?? false,
      },
      update: {
        isPrimary: assignment.isPrimary ?? undefined,
      },
      include: { asset: true },
    });
  }

  private sanitizeFilename(filename: string): string {
    const fallback = 'asset';
    const trimmed = filename.trim();
    if (!trimmed) return fallback;
    const sanitized = trimmed.replace(/[^a-zA-Z0-9._-]+/g, '-');
    return sanitized.length ? sanitized : fallback;
  }
}
