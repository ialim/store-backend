import {
  Store,
  FindFirstStoreArgs,
  FindUniqueStoreArgs,
  FindManyStoreArgs,
  StoreGroupBy,
  StoreGroupByArgs,
  AggregateStore,
  StoreAggregateArgs,
  CreateOneStoreArgs,
  CreateManyStoreArgs,
  UpdateOneStoreArgs,
  UpdateManyStoreArgs,
  DeleteOneStoreArgs,
  DeleteManyStoreArgs,
} from '../../shared/prismagraphql/store';
import { AffectedRows } from '../../shared/prismagraphql/prisma';
import {
  Resolver,
  Query,
  Args,
  Mutation,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { ObjectType, Field, InputType } from '@nestjs/graphql';
import { StoreService } from './store.service';
import { User } from '../../shared/prismagraphql/user/user.model';
import { Address } from '../../shared/prismagraphql/address/address.model';
import { StoreCreateInput } from '../../shared/prismagraphql/store/store-create.input';
import { AddressService } from '../address/address.service';
import { GeocodeBiasInput } from '../address/address.resolver';
import { GraphQLJSON } from 'graphql-type-json';
import { Prisma } from '@prisma/client';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../shared/permissions';

@InputType()
class StoreAddressInput {
  @Field()
  query!: string;

  @Field(() => GeocodeBiasInput, { nullable: true })
  bias?: GeocodeBiasInput;

  @Field(() => [String], { nullable: true })
  countryCodes?: string[];

  @Field({ nullable: true })
  label?: string;

  @Field({ nullable: true })
  isPrimary?: boolean;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown>;
}

@Resolver(() => Store)
export class StoresResolver {
  constructor(private readonly StoreService: StoreService) {}

  @Query(() => Store, { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.store.READ as string)
  findFirstStore(@Args() args: FindFirstStoreArgs) {
    return this.StoreService.findFirst(args);
  }

  @Query(() => Store, { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.store.READ as string)
  findUniqueStore(@Args() args: FindUniqueStoreArgs) {
    return this.StoreService.findUnique(args);
  }

  @Query(() => [Store], { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.store.READ as string)
  listStores(@Args() args: FindManyStoreArgs) {
    return this.StoreService.findMany(args);
  }

  @Query(() => [StoreGroupBy], { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.store.READ as string)
  groupByStore(@Args() args: StoreGroupByArgs) {
    return this.StoreService.groupBy(args);
  }

  @Query(() => AggregateStore, { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.store.READ as string)
  aggregateStore(@Args() args: StoreAggregateArgs) {
    return this.StoreService.aggregate(args);
  }

  @Mutation(() => Store, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.store.CREATE as string)
  createStore(@Args() args: CreateOneStoreArgs) {
    const Store = this.StoreService.create(args);
    console.log(args, Store);
    return Store;
  }

  @Mutation(() => Store, {
    nullable: false,
    description:
      'Create a store and attach a verified primary address using the geocoding provider.',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.store.CREATE as string)
  createStoreWithAddress(
    @Args('data') data: StoreCreateInput,
    @Args('address') address: StoreAddressInput,
  ) {
    return this.StoreService.createWithAddress({
      data,
      addressRequest: {
        query: address.query,
        bias: address.bias
          ? {
              latitude: address.bias.latitude,
              longitude: address.bias.longitude,
              radiusMeters: address.bias.radiusMeters ?? undefined,
            }
          : undefined,
        countryCodes: address.countryCodes ?? undefined,
      },
      assignment: {
        label: address.label ?? 'Primary',
        isPrimary: address.isPrimary ?? true,
        metadata: address.metadata
          ? (address.metadata as Prisma.InputJsonValue)
          : null,
      },
    });
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.store.CREATE as string)
  createManyStore(@Args() args: CreateManyStoreArgs) {
    return this.StoreService.createMany(args);
  }

  @Mutation(() => Store, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.store.UPDATE as string)
  updateStore(@Args() args: UpdateOneStoreArgs) {
    return this.StoreService.update(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.store.UPDATE as string)
  updateManyStore(@Args() args: UpdateManyStoreArgs) {
    return this.StoreService.updateMany(args);
  }

  @Mutation(() => Store, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.store.DELETE as string)
  deleteStore(@Args() args: DeleteOneStoreArgs) {
    return this.StoreService.delete(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.store.DELETE as string)
  deleteManyStore(@Args() args: DeleteManyStoreArgs) {
    return this.StoreService.deleteMany(args);
  }
}

@Resolver(() => Store)
export class StoreFieldsResolver {
  constructor(
    private readonly storeService: StoreService,
    private readonly addressService: AddressService,
  ) {}

  @ResolveField(() => User)
  async manager(@Parent() store: { managerId: string }): Promise<User> {
    // Ensure we resolve the required relation to avoid null for non-null field
    const manager = await this.storeService.prisma.user.findUnique({
      where: { id: store.managerId },
    });
    if (!manager) {
      throw new Error('Manager not found');
    }
    return manager;
  }

  @ResolveField(() => [Address], {
    description:
      'Addresses that have been linked to this store via the AddressAssignment table.',
  })
  async addresses(@Parent() store: { id: string }): Promise<Address[]> {
    const assignments =
      await this.addressService.prisma.addressAssignment.findMany({
        where: { ownerType: 'Store', ownerId: store.id, archivedAt: null },
        include: { address: true },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
      });
    return assignments.map((assignment) => assignment.address as Address);
  }

  @ResolveField(() => Address, {
    nullable: true,
    description: 'Primary address linked to this store, if available.',
  })
  async primaryAddress(
    @Parent() store: { id: string },
  ): Promise<Address | null> {
    const assignment =
      await this.addressService.prisma.addressAssignment.findFirst({
        where: {
          ownerType: 'Store',
          ownerId: store.id,
          archivedAt: null,
        },
        orderBy: [{ isPrimary: 'desc' }, { createdAt: 'desc' }],
        include: { address: true },
      });
    return assignment?.address ?? null;
  }
}

@ObjectType()
class StoreManagerDiagnostic {
  @Field(() => String)
  id!: string;
  @Field(() => String)
  name!: string;
  @Field(() => String)
  managerId!: string;
  @Field(() => Boolean)
  validManager!: boolean;
  @Field(() => String, { nullable: true })
  managerEmail?: string | null;
}

@Resolver()
export class StoreDiagnosticsResolver {
  constructor(private readonly storeService: StoreService) {}

  @Query(() => [StoreManagerDiagnostic], {
    description: 'List stores whose managerId does not resolve to a User',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.store.READ as string)
  async storesWithInvalidManagers(): Promise<StoreManagerDiagnostic[]> {
    const stores = await this.storeService.prisma.store.findMany({
      select: { id: true, name: true, managerId: true },
    });
    const ids = Array.from(new Set(stores.map((s) => s.managerId)));
    const users = await this.storeService.prisma.user.findMany({
      where: { id: { in: ids } },
      select: { id: true, email: true },
    });
    const byId = new Map(users.map((u) => [u.id, u.email] as const));
    const invalid = stores.filter((s) => !byId.has(s.managerId));
    return invalid.map((s) => ({
      id: s.id,
      name: s.name,
      managerId: s.managerId,
      validManager: false,
      managerEmail: null,
    }));
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.store.UPDATE as string)
  async assignStoreManager(
    @Args('storeId') storeId: string,
    @Args('managerId') managerId: string,
  ) {
    await this.storeService.prisma.store.update({
      where: { id: storeId },
      data: { managerId },
    });
    return true;
  }

  @Mutation(() => Number)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.store.UPDATE as string)
  async bulkAssignStoreManager(
    @Args({ name: 'storeIds', type: () => [String] }) storeIds: string[],
    @Args('managerId') managerId: string,
  ) {
    if (!storeIds?.length) return 0;
    const res = await this.storeService.prisma.store.updateMany({
      where: { id: { in: storeIds } },
      data: { managerId },
    });
    return res.count || 0;
  }
}
