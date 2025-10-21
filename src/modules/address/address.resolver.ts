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
import {
  UseGuards,
  UnauthorizedException,
  ForbiddenException,
} from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../shared/permissions';
import { AddressService } from './address.service';
import { GraphQLJSON } from 'graphql-type-json';
import { Prisma } from '@prisma/client';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';
import { AddressCreateInput } from '../../shared/prismagraphql/address/address-create.input';

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
class CreateMyAddressInput {
  @Field(() => AddressCreateInput)
  address!: AddressCreateInput;

  @Field({ nullable: true })
  label?: string;

  @Field({ nullable: true })
  isPrimary?: boolean;

  @Field(() => GraphQLJSON, { nullable: true })
  metadata?: Record<string, unknown>;
}

@InputType()
class CreateMyVerifiedAddressInput {
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

@InputType()
class UpdateMyAddressAssignmentInput {
  @Field()
  addressId!: string;

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
class VerifyAddressPatchInput {
  @Field({ nullable: true })
  formattedAddress?: string;

  @Field(() => Number, { nullable: true })
  latitude?: number | null;

  @Field(() => Number, { nullable: true })
  longitude?: number | null;

  @Field(() => Number, { nullable: true })
  confidence?: number | null;
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

  private toMetadataValue(
    metadata?: Record<string, unknown> | null,
  ): Prisma.InputJsonValue | typeof Prisma.JsonNull | undefined {
    if (metadata === undefined) {
      return undefined;
    }
    if (metadata === null) {
      return Prisma.JsonNull;
    }
    return metadata as Prisma.InputJsonValue;
  }

  private async requireUserAssignment(addressId: string, userId: string) {
    const assignment =
      await this.addressService.prisma.addressAssignment.findFirst({
        where: {
          addressId,
          ownerType: 'USER',
          ownerId: userId,
          archivedAt: null,
        },
      });
    if (!assignment) {
      throw new ForbiddenException('Address not found for current user');
    }
    return assignment;
  }

  @Query(() => [AddressSuggestionModel], {
    nullable: false,
    description:
      'Search address suggestions using the configured geocoding provider.',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER', 'BILLER', 'RESELLER')
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

  @Query(() => [Address], {
    nullable: false,
    description:
      'Addresses that require manual review (unverified or manually provided).',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER', 'BILLER', 'RESELLER', 'CUSTOMER')
  @Permissions(PERMISSIONS.address.READ as string)
  addressesNeedingReview(
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    return this.addressService.addressesNeedingReview(limit);
  }

  @Query(() => Address, { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER', 'BILLER', 'RESELLER', 'CUSTOMER')
  @Permissions(PERMISSIONS.address.READ as string)
  findFirstAddress(@Args() args: FindFirstAddressArgs) {
    return this.addressService.findFirst(args);
  }

  @Query(() => Address, { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER', 'BILLER', 'RESELLER', 'CUSTOMER')
  @Permissions(PERMISSIONS.address.READ as string)
  findUniqueAddress(@Args() args: FindUniqueAddressArgs) {
    return this.addressService.findUnique(args);
  }

  @Query(() => [Address], { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER', 'BILLER', 'RESELLER', 'CUSTOMER')
  @Permissions(PERMISSIONS.address.READ as string)
  listAddresses(@Args() args: FindManyAddressArgs) {
    return this.addressService.findMany(args);
  }

  @Query(() => [Address], {
    nullable: false,
    description: 'Addresses assigned to the current user.',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER', 'RESELLER', 'CUSTOMER')
  @Permissions(PERMISSIONS.address.READ as string)
  async myAddresses(@CurrentUser() user: AuthenticatedUser | undefined) {
    if (!user?.id) {
      throw new UnauthorizedException('Missing authenticated user');
    }
    return this.addressService.prisma.address.findMany({
      where: {
        assignments: {
          some: {
            ownerType: 'USER',
            ownerId: user.id,
            archivedAt: null,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      include: {
        assignments: {
          where: {
            ownerType: 'USER',
            ownerId: user.id,
            archivedAt: null,
          },
        },
      },
    });
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
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER', 'BILLER')
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
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER', 'BILLER')
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

  @Mutation(() => Address, {
    nullable: false,
    description: 'Create a new address and assign it to the current user.',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER', 'RESELLER', 'CUSTOMER')
  @Permissions(PERMISSIONS.address.CREATE as string)
  async createMyAddress(
    @Args('input') input: CreateMyAddressInput,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException('Missing authenticated user');
    }
    const addressData = { ...(input.address as Prisma.AddressCreateInput) };
    delete (addressData as Prisma.AddressCreateInput).assignments;

    const ownerMetadata = this.toMetadataValue(input.metadata);
    return this.addressService.createAndAssign({
      address: addressData,
      owner: {
        type: 'USER',
        id: user.id,
        label: input.label ?? null,
        isPrimary: input.isPrimary ?? false,
        ...(ownerMetadata !== undefined && { metadata: ownerMetadata }),
      },
    });
  }

  @Mutation(() => Address, {
    nullable: false,
    description: 'Geocode and save a new address for the current user.',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER', 'RESELLER', 'CUSTOMER')
  @Permissions(PERMISSIONS.address.CREATE as string)
  async createMyVerifiedAddress(
    @Args('input') input: CreateMyVerifiedAddressInput,
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException('Missing authenticated user');
    }
    const ownerMetadata = this.toMetadataValue(input.metadata);
    const owner: {
      type: string;
      id: string;
      label?: string | null;
      isPrimary?: boolean;
      metadata?: Prisma.InputJsonValue | typeof Prisma.JsonNull | null;
    } = {
      type: 'USER',
      id: user.id,
      label: input.label ?? null,
      isPrimary: input.isPrimary ?? false,
    };
    if (ownerMetadata !== undefined) {
      owner.metadata = ownerMetadata;
    }
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
      owner,
    });
  }

  @Mutation(() => AddressAssignment, {
    nullable: false,
    description: 'Attach an existing address to the current user.',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER', 'RESELLER', 'CUSTOMER')
  @Permissions(PERMISSIONS.address.UPDATE as string)
  async attachMyAddress(
    @Args('addressId') addressId: string,
    @Args('label', { type: () => String, nullable: true })
    label: string | null,
    @Args('isPrimary', { type: () => Boolean, nullable: true })
    isPrimary?: boolean,
    @Args('metadata', { type: () => GraphQLJSON, nullable: true })
    metadata?: Record<string, unknown>,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException('Missing authenticated user');
    }
    const metadataValue = this.toMetadataValue(metadata);
    return this.addressService.attachAddress(addressId, {
      type: 'USER',
      id: user.id,
      label: label ?? null,
      isPrimary: isPrimary ?? false,
      ...(metadataValue !== undefined && { metadata: metadataValue }),
    });
  }

  @Mutation(() => AddressAssignment, {
    nullable: false,
    description: 'Update the assignment metadata for one of your addresses.',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER', 'RESELLER', 'CUSTOMER')
  @Permissions(PERMISSIONS.address.UPDATE as string)
  async updateMyAddressAssignment(
    @Args('input') input: UpdateMyAddressAssignmentInput,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException('Missing authenticated user');
    }
    const assignment = await this.requireUserAssignment(
      input.addressId,
      user.id,
    );
    const data: Prisma.AddressAssignmentUpdateInput = {};
    if (input.label !== undefined) {
      data.label = input.label ?? null;
    }
    if (input.isPrimary !== undefined) {
      data.isPrimary = input.isPrimary;
    }
    if (input.metadata !== undefined) {
      data.metadata = this.toMetadataValue(input.metadata);
    }
    return this.addressService.prisma.addressAssignment.update({
      where: { id: assignment.id },
      data,
    });
  }

  @Mutation(() => AddressAssignment, {
    nullable: false,
    description: 'Archive one of your address assignments.',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER', 'RESELLER', 'CUSTOMER')
  @Permissions(PERMISSIONS.address.UPDATE as string)
  async archiveMyAddress(
    @Args('addressId') addressId: string,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException('Missing authenticated user');
    }
    const assignment = await this.requireUserAssignment(addressId, user.id);
    return this.addressService.archiveAssignment(assignment.id);
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

  @Query(() => [AddressAssignment], {
    nullable: false,
    description: 'Address assignments belonging to the current user.',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER', 'RESELLER', 'CUSTOMER')
  @Permissions(PERMISSIONS.address.READ as string)
  async myAddressAssignments(
    @CurrentUser() user: AuthenticatedUser | undefined,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException('Missing authenticated user');
    }
    return this.addressService.prisma.addressAssignment.findMany({
      where: {
        ownerType: 'USER',
        ownerId: user.id,
        archivedAt: null,
      },
      orderBy: { createdAt: 'desc' },
      include: { address: true },
    });
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

  @Mutation(() => Address, {
    nullable: false,
    description:
      'Mark an address as verified and optionally adjust its details.',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.address.UPDATE as string)
  verifyAddress(
    @Args('addressId') addressId: string,
    @Args('patch', { type: () => VerifyAddressPatchInput, nullable: true })
    patch?: VerifyAddressPatchInput,
  ) {
    return this.addressService.verifyAddress({ id: addressId, patch });
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
