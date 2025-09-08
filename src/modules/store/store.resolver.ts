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
import { Resolver, Query, Args, Mutation } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { StoreService } from './store.service';
@Resolver(() => Store)
export class StoresResolver {
  constructor(private readonly StoreService: StoreService) {}

  @Query(() => Store, { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  findFirstStore(@Args() args: FindFirstStoreArgs) {
    return this.StoreService.findFirst(args);
  }

  @Query(() => Store, { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  findUniqueStore(@Args() args: FindUniqueStoreArgs) {
    return this.StoreService.findUnique(args);
  }

  @Query(() => [Store], { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  listStores(@Args() args: FindManyStoreArgs) {
    return this.StoreService.findMany(args);
  }

  @Query(() => [StoreGroupBy], { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  groupByStore(@Args() args: StoreGroupByArgs) {
    return this.StoreService.groupBy(args);
  }

  @Query(() => AggregateStore, { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  aggregateStore(@Args() args: StoreAggregateArgs) {
    return this.StoreService.aggregate(args);
  }

  @Mutation(() => Store, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  createStore(@Args() args: CreateOneStoreArgs) {
    const Store = this.StoreService.create(args);
    console.log(args, Store);
    return Store;
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  createManyStore(@Args() args: CreateManyStoreArgs) {
    return this.StoreService.createMany(args);
  }

  @Mutation(() => Store, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  updateStore(@Args() args: UpdateOneStoreArgs) {
    return this.StoreService.update(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  updateManyStore(@Args() args: UpdateManyStoreArgs) {
    return this.StoreService.updateMany(args);
  }

  @Mutation(() => Store, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  deleteStore(@Args() args: DeleteOneStoreArgs) {
    return this.StoreService.delete(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  deleteManyStore(@Args() args: DeleteManyStoreArgs) {
    return this.StoreService.deleteMany(args);
  }
}
