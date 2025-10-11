import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
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
import { AddressService } from '../address/address.service';
import { GeocodeRequest } from '../address/geocoding/geocoding.provider';
import { StoreCreateInput } from '../../shared/prismagraphql/store/store-create.input';
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
  constructor(
    prisma: PrismaService,
    private readonly addressService: AddressService,
  ) {
    super(prisma);
  }

  async createWithAddress(options: {
    data: StoreCreateInput;
    addressRequest: GeocodeRequest;
    assignment?: {
      label?: string | null;
      isPrimary?: boolean;
      metadata?: Prisma.InputJsonValue | null;
    };
  }): Promise<Store> {
    const store = await this.prisma.store.create({
      data: options.data as unknown as Prisma.StoreCreateInput,
    });

    try {
      const verified = await this.addressService.createVerifiedAddress({
        request: options.addressRequest,
        owner: {
          type: 'Store',
          id: store.id,
          label: options.assignment?.label ?? 'Primary',
          isPrimary: options.assignment?.isPrimary ?? true,
          metadata: options.assignment?.metadata ?? null,
        },
      });

      if (!store.location) {
        await this.prisma.store.update({
          where: { id: store.id },
          data: { location: verified.formattedAddress },
        });
      }

      return this.prisma.store.findUniqueOrThrow({
        where: { id: store.id },
      });
    } catch (error) {
      await this.prisma.store.delete({ where: { id: store.id } });
      throw error;
    }
  }
}
