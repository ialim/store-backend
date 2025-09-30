import {
  Resolver,
  Query,
  Mutation,
  Args,
  Field,
  ObjectType,
  ID,
  InputType,
  Int,
  registerEnumType,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { CollectionService, FacetFilter } from './collection.service';
import { GraphQLJSON } from 'graphql-type-json';
import { Product } from '../../../shared/prismagraphql/product';
import { ProductVariant } from '../../../shared/prismagraphql/product-variant';

export enum CollectionTarget {
  PRODUCT = 'PRODUCT',
  VARIANT = 'VARIANT',
}
registerEnumType(CollectionTarget, { name: 'CollectionTarget' });

@ObjectType()
class CollectionGQL {
  @Field(() => ID)
  id!: string;
  @Field()
  name!: string;
  @Field()
  code!: string;
  @Field(() => CollectionTarget)
  target!: CollectionTarget;
  @Field(() => GraphQLJSON)
  filters!: FacetFilter[];
  @Field()
  createdAt!: Date;
  @Field()
  updatedAt!: Date;
}

@InputType()
class FacetFilterInput {
  @Field()
  facetId!: string;
  @Field()
  value!: string;
}

@InputType()
class CreateCollectionInput {
  @Field()
  name!: string;
  @Field()
  code!: string;
  @Field(() => CollectionTarget)
  target!: CollectionTarget;
  @Field(() => [FacetFilterInput])
  filters!: FacetFilterInput[];
}

@InputType()
class UpdateCollectionInput {
  @Field(() => ID)
  id!: string;
  @Field({ nullable: true })
  name?: string;
  @Field({ nullable: true })
  code?: string;
  @Field(() => [FacetFilterInput], { nullable: true })
  filters?: FacetFilterInput[];
}

@Resolver(() => CollectionGQL)
export class CollectionResolver {
  constructor(private readonly service: CollectionService) {}

  @Query(() => [CollectionGQL])
  @UseGuards(GqlAuthGuard)
  collections() {
    return this.service.list();
  }

  @Query(() => CollectionGQL)
  @UseGuards(GqlAuthGuard)
  collection(@Args('id') id: string) {
    return this.service.byId(id);
  }

  @Mutation(() => CollectionGQL)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  createCollection(@Args('input') input: CreateCollectionInput) {
    return this.service.create({ ...input, filters: input.filters });
  }

  @Mutation(() => CollectionGQL)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  updateCollection(@Args('input') input: UpdateCollectionInput) {
    return this.service.update(input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  deleteCollection(@Args('id') id: string) {
    return this.service.delete(id);
  }

  @Query(() => Int)
  @UseGuards(GqlAuthGuard)
  collectionMembersCount(@Args('id') id: string) {
    return this.service.membersCount(id);
  }

  @Query(() => [ProductVariant])
  @UseGuards(GqlAuthGuard)
  collectionVariants(
    @Args('id') id: string,
    @Args('take', { type: () => Int, nullable: true }) take?: number,
    @Args('skip', { type: () => Int, nullable: true }) skip?: number,
  ) {
    return this.service.variantMembers(id, take, skip);
  }

  @Query(() => [Product])
  @UseGuards(GqlAuthGuard)
  collectionProducts(
    @Args('id') id: string,
    @Args('take', { type: () => Int, nullable: true }) take?: number,
    @Args('skip', { type: () => Int, nullable: true }) skip?: number,
  ) {
    return this.service.productMembers(id, take, skip);
  }
}
