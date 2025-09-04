import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BaseCrudService } from '../base.services';
import {
  CreateManyStoreArgs,
  CreateOneStoreArgs,
  DeleteManyStoreArgs,
  DeleteOneStoreArgs,
  FindFirstStoreArgs,
  FindManyStoreArgs,
  FindUniqueStoreArgs,
  UpdateManyStoreArgs,
  UpdateOneStoreArgs,
  Store,
  StoreAggregateArgs,
  StoreGroupByArgs,
} from '../../shared/prismagraphql/store';
@Injectable()
export class StoreService extends BaseCrudService<
  Store,
  FindFirstStoreArgs,
  FindUniqueStoreArgs,
  FindManyStoreArgs,
  StoreGroupByArgs,
  StoreAggregateArgs,
  CreateOneStoreArgs,
  CreateManyStoreArgs,
  UpdateOneStoreArgs,
  UpdateManyStoreArgs,
  DeleteOneStoreArgs,
  DeleteManyStoreArgs
> {
  constructor(prisma: PrismaService) {
    super(prisma);
  }
}
