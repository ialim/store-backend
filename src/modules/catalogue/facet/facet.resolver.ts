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
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../../auth/guards/gql-auth.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { FacetService } from './facet.service';

@ObjectType()
class FacetGQL {
  @Field(() => ID)
  id!: string;
  @Field()
  name!: string;
  @Field()
  code!: string;
  @Field()
  isPrivate!: boolean;
  @Field(() => [String])
  values!: string[];
}

@InputType()
class CreateFacetInput {
  @Field()
  name!: string;
  @Field()
  code!: string;
  @Field({ nullable: true })
  isPrivate?: boolean;
  @Field(() => [String])
  values!: string[];
}

@InputType()
class UpdateFacetInput {
  @Field(() => ID)
  id!: string;
  @Field({ nullable: true })
  name?: string;
  @Field({ nullable: true })
  isPrivate?: boolean;
  @Field(() => [String], { nullable: true })
  values?: string[];
}

@ObjectType()
class FacetAssignment {
  @Field(() => FacetGQL)
  facet!: FacetGQL;
  @Field()
  value!: string;
}

@Resolver(() => FacetGQL)
export class FacetResolver {
  constructor(private readonly service: FacetService) {}

  @Query(() => [FacetGQL])
  listFacets() {
    return this.service.list();
  }

  @Mutation(() => FacetGQL)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  createFacet(@Args('input') input: CreateFacetInput) {
    return this.service.create(input);
  }

  @Mutation(() => FacetGQL)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  updateFacet(@Args('input') input: UpdateFacetInput) {
    const { id, ...patch } = input;
    return this.service.update(id, patch);
  }

  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  deleteFacet(@Args('id') id: string) {
    return this.service.delete(id).then(() => 'OK');
  }

  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  assignFacetToProduct(
    @Args('productId') productId: string,
    @Args('facetId') facetId: string,
    @Args('value') value: string,
  ) {
    return this.service
      .assignToProduct(productId, facetId, value)
      .then(() => 'OK');
  }

  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  removeFacetFromProduct(
    @Args('productId') productId: string,
    @Args('facetId') facetId: string,
    @Args('value') value: string,
  ) {
    return this.service
      .removeFromProduct(productId, facetId, value)
      .then(() => 'OK');
  }

  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  assignFacetToVariant(
    @Args('productVariantId') productVariantId: string,
    @Args('facetId') facetId: string,
    @Args('value') value: string,
  ) {
    return this.service
      .assignToVariant(productVariantId, facetId, value)
      .then(() => 'OK');
  }

  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  removeFacetFromVariant(
    @Args('productVariantId') productVariantId: string,
    @Args('facetId') facetId: string,
    @Args('value') value: string,
  ) {
    return this.service
      .removeFromVariant(productVariantId, facetId, value)
      .then(() => 'OK');
  }

  @Query(() => [FacetAssignment])
  productFacets(@Args('productId') productId: string) {
    return this.service
      .listProductAssignments(productId)
      .then((rows: any[]) =>
        rows.map((r) => ({ facet: r.facet, value: r.value })),
      );
  }

  @Query(() => [FacetAssignment])
  variantFacets(@Args('productVariantId') productVariantId: string) {
    return this.service
      .listVariantAssignments(productVariantId)
      .then((rows: any[]) =>
        rows.map((r) => ({ facet: r.facet, value: r.value })),
      );
  }

  @Mutation(() => Int)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  bulkAssignFacetToVariants(
    @Args({ name: 'variantIds', type: () => [String] }) variantIds: string[],
    @Args('facetId') facetId: string,
    @Args('value') value: string,
  ) {
    const ids = Array.isArray(variantIds) ? variantIds.filter((x) => !!x) : [];
    return this.service.bulkAssignToVariants(ids, facetId, value);
  }

  @Mutation(() => Int)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  bulkAssignFacetToProducts(
    @Args({ name: 'productIds', type: () => [String] }) productIds: string[],
    @Args('facetId') facetId: string,
    @Args('value') value: string,
  ) {
    const ids = Array.isArray(productIds) ? productIds.filter((x) => !!x) : [];
    return this.service.bulkAssignToProducts(ids, facetId, value);
  }

  @Mutation(() => Int)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  bulkRemoveFacetFromVariants(
    @Args({ name: 'variantIds', type: () => [String] }) variantIds: string[],
    @Args('facetId') facetId: string,
    @Args('value') value: string,
  ) {
    const ids = Array.isArray(variantIds) ? variantIds.filter((x) => !!x) : [];
    return this.service.bulkRemoveFromVariants(ids, facetId, value);
  }

  @Mutation(() => Int)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  bulkRemoveFacetFromProducts(
    @Args({ name: 'productIds', type: () => [String] }) productIds: string[],
    @Args('facetId') facetId: string,
    @Args('value') value: string,
  ) {
    const ids = Array.isArray(productIds) ? productIds.filter((x) => !!x) : [];
    return this.service.bulkRemoveFromProducts(ids, facetId, value);
  }
}
