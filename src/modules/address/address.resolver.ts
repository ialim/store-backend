import {
  Address,
  FindManyAddressArgs,
  FindUniqueAddressArgs,
  FindFirstAddressArgs,
  AddressGroupBy,
  AddressGroupByArgs,
  AggregateAddress,
  AddressAggregateArgs,
  CreateOneAddressArgs,
  CreateManyAddressArgs,
  UpdateOneAddressArgs,
  UpdateManyAddressArgs,
  DeleteOneAddressArgs,
  DeleteManyAddressArgs,
} from '../../shared/prismagraphql/address';
import {
  AddressAssignment,
  FindManyAddressAssignmentArgs,
  FindUniqueAddressAssignmentArgs,
  AddressAssignmentGroupBy,
  AddressAssignmentGroupByArgs,
  AggregateAddressAssignment,
  AddressAssignmentAggregateArgs,
  CreateOneAddressAssignmentArgs,
  CreateManyAddressAssignmentArgs,
  UpdateOneAddressAssignmentArgs,
  UpdateManyAddressAssignmentArgs,
  DeleteOneAddressAssignmentArgs,
  DeleteManyAddressAssignmentArgs,
} from '../../shared/prismagraphql/address-assignment';
import { AffectedRows } from '../../shared/prismagraphql/prisma';
import {
  Resolver,
  Query,
  Mutation,
  Args,
  ResolveField,
  Parent,
  InputType,
  Field,
  ObjectType,
  Int,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../shared/permissions';
import { AddressService } from './address.service';
import { GraphQLJSON } from 'graphql-type-json';
import type { Prisma } from '@prisma/client';

@InputType()
export class GeocodeBiasInput {
  @Field()
  latitude!: number;

  @Field()
  longitude!: number;

  @Field({ nullable: true })
  radiusMeters?: number;
}

@InputType()
class VerifiedAddressOwnerInput {
  @Field()
  ownerType!: string;

  @Field()
  ownerId!: string;

  @Field({ nullable: true })
  label?: string;

  @Field({ nullable: true })
  isPrimary?: boolean;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown>;
}

@InputType()
class CreateVerifiedAddressInput {
  @Field()
  query!: string;

  @Field(() => GeocodeBiasInput, { nullable: true })
  bias?: GeocodeBiasInput;

  @Field(() => [String], { nullable: true })
  countryCodes?: string[];

  @Field(() => VerifiedAddressOwnerInput, { nullable: true })
  owner?: VerifiedAddressOwnerInput;
}

@ObjectType()
class AddressSuggestionModel {
  @Field(() => String)
  id!: string;

  @Field(() => String)
  formattedAddress!: string;

  @Field(() => Number, { nullable: true })
  latitude?: number | null;

  @Field(() => Number, { nullable: true })
  longitude?: number | null;

  @Field(() => String, { nullable: true })
  countryCode?: string | null;

  @Field(() => String)
  provider!: string;
}

@InputType()
class AttachAddressInput {
  @Field()
  addressId!: string;

  @Field()
  ownerType!: string;

  @Field()
  ownerId!: string;

  @Field({ nullable: true })
  label?: string;

  @Field({ nullable: true })
  isPrimary?: boolean;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown>;
}

@Resolver(() => Address)
export class AddressResolver {
  constructor(private readonly addressService: AddressService) {}

  @Query(() => [AddressSuggestionModel], {
    nullable: false,
    description:
      'Search address suggestions using the configured geocoding provider.',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.address.READ as string)
  async searchAddresses(
    @Args('query') query: string,
    @Args('countryCodes', { type: () => [String], nullable: true })
    countryCodes?: string[],
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ): Promise<AddressSuggestionModel[]> {
    const suggestions = await this.addressService.searchSuggestions({
      query,
      countryCodes,
      limit: limit ?? 5,
    });
    return suggestions.map((suggestion) => ({
      id: suggestion.id,
      formattedAddress: suggestion.formattedAddress,
      latitude: suggestion.latitude ?? null,
      longitude: suggestion.longitude ?? null,
      countryCode: suggestion.countryCode ?? null,
      provider: suggestion.provider,
    }));
  }

  @Query(() => Address, { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.address.READ as string)
  findFirstAddress(@Args() args: FindFirstAddressArgs) {
    return this.addressService.findFirst(args);
  }

  @Query(() => Address, { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.address.READ as string)
  findUniqueAddress(@Args() args: FindUniqueAddressArgs) {
    return this.addressService.findUnique(args);
  }

  @Query(() => [Address], { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.address.READ as string)
  listAddresses(@Args() args: FindManyAddressArgs) {
    return this.addressService.findMany(args);
  }

  @Query(() => [AddressGroupBy], { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.address.READ as string)
  groupByAddress(@Args() args: AddressGroupByArgs) {
    return this.addressService.groupBy(args);
  }

  @Query(() => AggregateAddress, { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.address.READ as string)
  aggregateAddress(@Args() args: AddressAggregateArgs) {
    return this.addressService.aggregate(args);
  }

  @Mutation(() => Address, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.address.CREATE as string)
  createAddress(@Args() args: CreateOneAddressArgs) {
    return this.addressService.create(args);
  }

  @Mutation(() => Address, {
    nullable: false,
    description:
      'Resolve and persist an address using the configured geocoding provider.',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.address.CREATE as string)
  createVerifiedAddress(@Args('input') input: CreateVerifiedAddressInput) {
    return this.addressService.createVerifiedAddress({
      request: {
        query: input.query,
        bias: input.bias
          ? {
              latitude: input.bias.latitude,
              longitude: input.bias.longitude,
              radiusMeters: input.bias.radiusMeters ?? undefined,
            }
          : undefined,
        countryCodes: input.countryCodes ?? undefined,
      },
      owner: input.owner
        ? {
            type: input.owner.ownerType,
            id: input.owner.ownerId,
            label: input.owner.label ?? null,
            isPrimary: input.owner.isPrimary ?? false,
            metadata: input.owner.metadata
              ? (input.owner.metadata as Prisma.InputJsonValue)
              : null,
          }
        : undefined,
    });
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.address.CREATE as string)
  createManyAddress(@Args() args: CreateManyAddressArgs) {
    return this.addressService.createMany(args);
  }

  @Mutation(() => Address, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.address.UPDATE as string)
  updateAddress(@Args() args: UpdateOneAddressArgs) {
    return this.addressService.update(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.address.UPDATE as string)
  updateManyAddress(@Args() args: UpdateManyAddressArgs) {
    return this.addressService.updateMany(args);
  }

  @Mutation(() => Address, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.address.DELETE as string)
  deleteAddress(@Args() args: DeleteOneAddressArgs) {
    return this.addressService.delete(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.address.DELETE as string)
  deleteManyAddress(@Args() args: DeleteManyAddressArgs) {
    return this.addressService.deleteMany(args);
  }

  @Mutation(() => AddressAssignment, {
    nullable: false,
    description:
      'Attach an existing address to an owning entity (store, user, order, etc.)',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.address.UPDATE as string)
  attachAddress(@Args('input') input: AttachAddressInput) {
    const { addressId, metadata, ownerType, ownerId, label, isPrimary } = input;
    return this.addressService.attachAddress(addressId, {
      type: ownerType,
      id: ownerId,
      label: label ?? null,
      isPrimary: isPrimary ?? false,
      metadata: metadata ? (metadata as Prisma.InputJsonValue) : null,
    });
  }
}

@Resolver(() => AddressAssignment)
export class AddressAssignmentsResolver {
  constructor(private readonly addressService: AddressService) {}

  @Query(() => [AddressAssignment], { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.address.READ as string)
  listAddressAssignments(@Args() args: FindManyAddressAssignmentArgs) {
    return this.addressService.assignments.findMany(args);
  }

  @Query(() => AddressAssignment, { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.address.READ as string)
  findUniqueAddressAssignment(@Args() args: FindUniqueAddressAssignmentArgs) {
    return this.addressService.assignments.findUnique(args);
  }

  @Mutation(() => AddressAssignment, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.address.UPDATE as string)
  updateAddressAssignment(@Args() args: UpdateOneAddressAssignmentArgs) {
    return this.addressService.assignments.update(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.address.UPDATE as string)
  updateManyAddressAssignment(@Args() args: UpdateManyAddressAssignmentArgs) {
    return this.addressService.assignments.updateMany(args);
  }

  @Mutation(() => AddressAssignment, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.address.DELETE as string)
  deleteAddressAssignment(@Args() args: DeleteOneAddressAssignmentArgs) {
    return this.addressService.assignments.delete(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.address.DELETE as string)
  deleteManyAddressAssignment(@Args() args: DeleteManyAddressAssignmentArgs) {
    return this.addressService.assignments.deleteMany(args);
  }

  @Mutation(() => AddressAssignment, {
    nullable: false,
    description: 'Archive an address assignment without deleting it.',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.address.UPDATE as string)
  archiveAddressAssignment(@Args('id') id: string) {
    return this.addressService.archiveAssignment(id);
  }

  @Mutation(() => AddressAssignment, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.address.CREATE as string)
  createAddressAssignment(@Args() args: CreateOneAddressAssignmentArgs) {
    return this.addressService.assignments.create(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.address.CREATE as string)
  createManyAddressAssignment(@Args() args: CreateManyAddressAssignmentArgs) {
    return this.addressService.assignments.createMany(args);
  }

  @Query(() => AggregateAddressAssignment, { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.address.READ as string)
  aggregateAddressAssignment(@Args() args: AddressAssignmentAggregateArgs) {
    return this.addressService.assignments.aggregate(args);
  }

  @Query(() => [AddressAssignmentGroupBy], { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.address.READ as string)
  groupByAddressAssignment(@Args() args: AddressAssignmentGroupByArgs) {
    return this.addressService.assignments.groupBy(args);
  }
}

@Resolver(() => Address)
export class AddressFieldResolver {
  constructor(private readonly addressService: AddressService) {}

  @ResolveField(() => [AddressAssignment])
  assignments(@Parent() address: Address) {
    return this.addressService.prisma.addressAssignment.findMany({
      where: { addressId: address.id, archivedAt: null },
    });
  }
}
