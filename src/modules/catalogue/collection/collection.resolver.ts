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
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../../shared/permissions';

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
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  collections() {
    return this.service.list();
  }

  @Query(() => CollectionGQL)
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  collection(@Args('id') id: string) {
    return this.service.byId(id);
  }

  @Mutation(() => CollectionGQL)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.CREATE as string)
  createCollection(@Args('input') input: CreateCollectionInput) {
    return this.service.create({ ...input, filters: input.filters });
  }

  @Mutation(() => CollectionGQL)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.UPDATE as string)
  updateCollection(@Args('input') input: UpdateCollectionInput) {
    return this.service.update(input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.DELETE as string)
  deleteCollection(@Args('id') id: string) {
    return this.service.delete(id);
  }

  @Query(() => Int)
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  collectionMembersCount(@Args('id') id: string) {
    return this.service.membersCount(id);
  }

  @Query(() => [ProductVariant])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  collectionVariants(
    @Args('id') id: string,
    @Args('take', { type: () => Int, nullable: true }) take?: number,
    @Args('skip', { type: () => Int, nullable: true }) skip?: number,
  ) {
    return this.service.variantMembers(id, take, skip);
  }

  @Query(() => [Product])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  collectionProducts(
    @Args('id') id: string,
    @Args('take', { type: () => Int, nullable: true }) take?: number,
    @Args('skip', { type: () => Int, nullable: true }) skip?: number,
  ) {
    return this.service.productMembers(id, take, skip);
  }
}
