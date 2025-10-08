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
import { PermissionsGuard } from '../../auth/guards/permissions.guard';
import { Permissions } from '../../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../../shared/permissions';

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

type ProductAssignmentRow = Awaited<
  ReturnType<FacetService['listProductAssignments']>
>[number];

type VariantAssignmentRow = Awaited<
  ReturnType<FacetService['listVariantAssignments']>
>[number];

const mapAssignment = (
  row: ProductAssignmentRow | VariantAssignmentRow,
): FacetAssignment => ({
  facet: row.facet as unknown as FacetGQL,
  value: row.value,
});

@Resolver(() => FacetGQL)
export class FacetResolver {
  constructor(private readonly service: FacetService) {}

  @Query(() => [FacetGQL])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  listFacets() {
    return this.service.list();
  }

  @Mutation(() => FacetGQL)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.CREATE as string)
  createFacet(@Args('input') input: CreateFacetInput) {
    return this.service.create(input);
  }

  @Mutation(() => FacetGQL)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.UPDATE as string)
  updateFacet(@Args('input') input: UpdateFacetInput) {
    const { id, ...patch } = input;
    return this.service.update(id, patch);
  }

  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.DELETE as string)
  async deleteFacet(@Args('id') id: string): Promise<string> {
    await this.service.delete(id);
    return 'OK';
  }

  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.UPDATE as string)
  async assignFacetToProduct(
    @Args('productId') productId: string,
    @Args('facetId') facetId: string,
    @Args('value') value: string,
  ): Promise<string> {
    await this.service.assignToProduct(productId, facetId, value);
    return 'OK';
  }

  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.UPDATE as string)
  async removeFacetFromProduct(
    @Args('productId') productId: string,
    @Args('facetId') facetId: string,
    @Args('value') value: string,
  ): Promise<string> {
    await this.service.removeFromProduct(productId, facetId, value);
    return 'OK';
  }

  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.UPDATE as string)
  async assignFacetToVariant(
    @Args('productVariantId') productVariantId: string,
    @Args('facetId') facetId: string,
    @Args('value') value: string,
  ): Promise<string> {
    await this.service.assignToVariant(productVariantId, facetId, value);
    return 'OK';
  }

  @Mutation(() => String)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.UPDATE as string)
  async removeFacetFromVariant(
    @Args('productVariantId') productVariantId: string,
    @Args('facetId') facetId: string,
    @Args('value') value: string,
  ): Promise<string> {
    await this.service.removeFromVariant(productVariantId, facetId, value);
    return 'OK';
  }

  @Query(() => [FacetAssignment])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  async productFacets(
    @Args('productId') productId: string,
  ): Promise<FacetAssignment[]> {
    const rows = await this.service.listProductAssignments(productId);
    return rows.map((r) => mapAssignment(r));
  }

  @Query(() => [FacetAssignment])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.product.READ as string)
  async variantFacets(
    @Args('productVariantId') productVariantId: string,
  ): Promise<FacetAssignment[]> {
    const rows = await this.service.listVariantAssignments(productVariantId);
    return rows.map((r) => mapAssignment(r));
  }

  @Mutation(() => Int)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.UPDATE as string)
  bulkAssignFacetToVariants(
    @Args({ name: 'variantIds', type: () => [String] }) variantIds: string[],
    @Args('facetId') facetId: string,
    @Args('value') value: string,
  ) {
    const ids = Array.isArray(variantIds) ? variantIds.filter((x) => !!x) : [];
    return this.service.bulkAssignToVariants(ids, facetId, value);
  }

  @Mutation(() => Int)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.UPDATE as string)
  bulkAssignFacetToProducts(
    @Args({ name: 'productIds', type: () => [String] }) productIds: string[],
    @Args('facetId') facetId: string,
    @Args('value') value: string,
  ) {
    const ids = Array.isArray(productIds) ? productIds.filter((x) => !!x) : [];
    return this.service.bulkAssignToProducts(ids, facetId, value);
  }

  @Mutation(() => Int)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.UPDATE as string)
  bulkRemoveFacetFromVariants(
    @Args({ name: 'variantIds', type: () => [String] }) variantIds: string[],
    @Args('facetId') facetId: string,
    @Args('value') value: string,
  ) {
    const ids = Array.isArray(variantIds) ? variantIds.filter((x) => !!x) : [];
    return this.service.bulkRemoveFromVariants(ids, facetId, value);
  }

  @Mutation(() => Int)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.product.UPDATE as string)
  bulkRemoveFacetFromProducts(
    @Args({ name: 'productIds', type: () => [String] }) productIds: string[],
    @Args('facetId') facetId: string,
    @Args('value') value: string,
  ) {
    const ids = Array.isArray(productIds) ? productIds.filter((x) => !!x) : [];
    return this.service.bulkRemoveFromProducts(ids, facetId, value);
  }
}
