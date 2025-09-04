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
import { StoreService } from './store.service';
@Resolver(() => Store)
export class StoresResolver {
  constructor(private readonly StoreService: StoreService) {}

  @Query(() => Store, { nullable: false })
  findFirstStore(@Args() args: FindFirstStoreArgs) {
    this.StoreService.findFirst(args);
  }

  @Query(() => Store, { nullable: false })
  findUniqueStore(@Args() args: FindUniqueStoreArgs) {
    return this.StoreService.findUnique(args);
  }

  @Query(() => [Store], { nullable: false })
  listStores(@Args() args: FindManyStoreArgs) {
    return this.StoreService.findMany(args);
  }

  @Query(() => [StoreGroupBy], { nullable: false })
  groupByStore(@Args() args: StoreGroupByArgs) {
    return this.StoreService.groupBy(args);
  }

  @Query(() => AggregateStore, { nullable: false })
  aggregateStore(@Args() args: StoreAggregateArgs) {
    return this.StoreService.aggregate(args);
  }

  @Mutation(() => Store, { nullable: true })
  createStore(@Args() args: CreateOneStoreArgs) {
    const Store = this.StoreService.create(args);
    console.log(args, Store);
    return Store;
  }

  @Mutation(() => AffectedRows, { nullable: true })
  createManyStore(@Args() args: CreateManyStoreArgs) {
    return this.StoreService.createMany(args);
  }

  @Mutation(() => Store, { nullable: true })
  updateStore(@Args() args: UpdateOneStoreArgs) {
    return this.StoreService.update(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  updateManyStore(@Args() args: UpdateManyStoreArgs) {
    return this.StoreService.updateMany(args);
  }

  @Mutation(() => Store, { nullable: true })
  deleteStore(@Args() args: DeleteOneStoreArgs) {
    return this.StoreService.delete(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  deleteManyStore(@Args() args: DeleteManyStoreArgs) {
    return this.StoreService.deleteMany(args);
  }
}
