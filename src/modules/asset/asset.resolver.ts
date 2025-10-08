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
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../shared/permissions';
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
@UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
@Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
export class AssetResolver {
  constructor(private readonly assetService: AssetService) {}

  @Query(() => [Asset])
  @Permissions(PERMISSIONS.asset.READ as string)
  assets(@Args() args: FindManyAssetArgs) {
    return this.assetService.findMany(args);
  }

  @Query(() => Asset, { nullable: true })
  @Permissions(PERMISSIONS.asset.READ as string)
  asset(@Args() args: FindUniqueAssetArgs) {
    return this.assetService.findUnique(args);
  }

  @Query(() => Asset, { nullable: true })
  @Permissions(PERMISSIONS.asset.READ as string)
  findFirstAsset(@Args() args: FindFirstAssetArgs) {
    return this.assetService.findFirst(args);
  }

  @Query(() => AggregateAsset)
  @Permissions(PERMISSIONS.asset.READ as string)
  aggregateAsset(@Args() args: AssetAggregateArgs) {
    return this.assetService.aggregate(args);
  }

  @Query(() => [AssetGroupBy])
  @Permissions(PERMISSIONS.asset.READ as string)
  groupByAsset(@Args() args: AssetGroupByArgs) {
    return this.assetService.groupBy(args);
  }

  @Mutation(() => Boolean)
  @Permissions(PERMISSIONS.asset.DELETE as string)
  removeAsset(@Args('assetId') assetId: string) {
    return this.assetService.deleteAssetById(assetId);
  }

  @Mutation(() => AssetAssignment)
  @Permissions(PERMISSIONS.asset.UPDATE as string)
  assignAsset(@Args('input') input: AssignAssetInput) {
    return this.assetService.assignAsset(input.assetId, {
      entityType: input.entityType as AssetEntityTypePrisma,
      entityId: input.entityId,
      isPrimary: input.isPrimary,
    });
  }

  @Mutation(() => Boolean)
  @Permissions(PERMISSIONS.asset.UPDATE as string)
  unassignAsset(@Args('input') input: AssignAssetInput) {
    return this.assetService.unassignAsset({
      assetId: input.assetId,
      entityType: input.entityType as AssetEntityTypePrisma,
      entityId: input.entityId,
    });
  }

  @Query(() => [AssetAssignment])
  @Permissions(PERMISSIONS.asset.READ as string)
  assetAssignments(@Args('input') input: AssetAssignmentsByEntityInput) {
    return this.assetService.assignmentsForEntity(
      input.entityType as AssetEntityTypePrisma,
      input.entityId,
    );
  }

  @Query(() => AssetAssignment, { nullable: true })
  @Permissions(PERMISSIONS.asset.READ as string)
  primaryAssetAssignment(@Args('input') input: AssetAssignmentsByEntityInput) {
    return this.assetService.primaryAssignment(
      input.entityType as AssetEntityTypePrisma,
      input.entityId,
    );
  }

  @ResolveField(() => [AssetAssignment])
  @Permissions(PERMISSIONS.asset.READ as string)
  assignments(@Parent() asset: { id: string }) {
    return this.assetService.assignmentsForAsset(asset.id);
  }
}
