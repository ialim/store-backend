import {
  Resolver,
  Query,
  Args,
  Mutation,
  InputType,
  Field,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { AssetService } from './asset.service';
import {
  Asset,
  FindManyAssetArgs,
  FindUniqueAssetArgs,
  FindFirstAssetArgs,
  AssetAggregateArgs,
  AggregateAsset,
  AssetGroupByArgs,
  AssetGroupBy,
} from '../../shared/prismagraphql/asset';
import { AssetAssignment } from '../../shared/prismagraphql/asset-assignment/asset-assignment.model';
import { AssetEntityType } from '../../shared/prismagraphql/prisma/asset-entity-type.enum';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AssetEntityType as AssetEntityTypePrisma } from '@prisma/client';

@InputType()
class AssignAssetInput {
  @Field(() => String)
  assetId!: string;

  @Field(() => AssetEntityType)
  entityType!: `${AssetEntityType}`;

  @Field(() => String)
  entityId!: string;

  @Field(() => Boolean, { nullable: true })
  isPrimary?: boolean;
}

@InputType()
class AssetAssignmentsByEntityInput {
  @Field(() => AssetEntityType)
  entityType!: `${AssetEntityType}`;

  @Field(() => String)
  entityId!: string;
}

@Resolver(() => Asset)
@UseGuards(GqlAuthGuard, RolesGuard)
@Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
export class AssetResolver {
  constructor(private readonly assetService: AssetService) {}

  @Query(() => [Asset])
  assets(@Args() args: FindManyAssetArgs) {
    return this.assetService.findMany(args);
  }

  @Query(() => Asset, { nullable: true })
  asset(@Args() args: FindUniqueAssetArgs) {
    return this.assetService.findUnique(args);
  }

  @Query(() => Asset, { nullable: true })
  findFirstAsset(@Args() args: FindFirstAssetArgs) {
    return this.assetService.findFirst(args);
  }

  @Query(() => AggregateAsset)
  aggregateAsset(@Args() args: AssetAggregateArgs) {
    return this.assetService.aggregate(args);
  }

  @Query(() => [AssetGroupBy])
  groupByAsset(@Args() args: AssetGroupByArgs) {
    return this.assetService.groupBy(args);
  }

  @Mutation(() => Boolean)
  removeAsset(@Args('assetId') assetId: string) {
    return this.assetService.deleteAssetById(assetId);
  }

  @Mutation(() => AssetAssignment)
  assignAsset(@Args('input') input: AssignAssetInput) {
    return this.assetService.assignAsset(input.assetId, {
      entityType: input.entityType as AssetEntityTypePrisma,
      entityId: input.entityId,
      isPrimary: input.isPrimary,
    });
  }

  @Mutation(() => Boolean)
  unassignAsset(@Args('input') input: AssignAssetInput) {
    return this.assetService.unassignAsset({
      assetId: input.assetId,
      entityType: input.entityType as AssetEntityTypePrisma,
      entityId: input.entityId,
    });
  }

  @Query(() => [AssetAssignment])
  assetAssignments(@Args('input') input: AssetAssignmentsByEntityInput) {
    return this.assetService.assignmentsForEntity(
      input.entityType as AssetEntityTypePrisma,
      input.entityId,
    );
  }

  @Query(() => AssetAssignment, { nullable: true })
  primaryAssetAssignment(@Args('input') input: AssetAssignmentsByEntityInput) {
    return this.assetService.primaryAssignment(
      input.entityType as AssetEntityTypePrisma,
      input.entityId,
    );
  }

  @ResolveField(() => [AssetAssignment])
  assignments(@Parent() asset: { id: string }) {
    return this.assetService.assignmentsForAsset(asset.id);
  }
}
