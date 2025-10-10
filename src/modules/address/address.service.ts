import {
  Inject,
  Injectable,
  NotFoundException,
  ServiceUnavailableException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { BaseCrudService } from '../base.services';
import {
  Address,
  AddressAggregateArgs,
  AddressGroupByArgs,
  CreateManyAddressArgs,
  CreateOneAddressArgs,
  DeleteManyAddressArgs,
  DeleteOneAddressArgs,
  FindFirstAddressArgs,
  FindManyAddressArgs,
  FindUniqueAddressArgs,
  UpdateManyAddressArgs,
  UpdateOneAddressArgs,
} from '../../shared/prismagraphql/address';
import {
  AddressAssignment,
  CreateManyAddressAssignmentArgs,
  CreateOneAddressAssignmentArgs,
  DeleteManyAddressAssignmentArgs,
  DeleteOneAddressAssignmentArgs,
  FindFirstAddressAssignmentArgs,
  FindManyAddressAssignmentArgs,
  FindUniqueAddressAssignmentArgs,
  UpdateManyAddressAssignmentArgs,
  UpdateOneAddressAssignmentArgs,
  AddressAssignmentAggregateArgs,
  AddressAssignmentGroupByArgs,
} from '../../shared/prismagraphql/address-assignment';
import { Prisma, AddressSource } from '@prisma/client';
import {
  GEOCODING_PROVIDER,
  GeocodeRequest,
  GeocodeResult,
  GeocodingProvider,
  GeocodeSuggestion,
} from './geocoding/geocoding.provider';

type AddressWithAssignments = Address & { assignments: AddressAssignment[] };

class AddressAssignmentCrudService extends BaseCrudService<
  AddressAssignment,
  FindFirstAddressAssignmentArgs,
  FindUniqueAddressAssignmentArgs,
  FindManyAddressAssignmentArgs,
  AddressAssignmentGroupByArgs,
  AddressAssignmentAggregateArgs,
  CreateOneAddressAssignmentArgs,
  CreateManyAddressAssignmentArgs,
  UpdateOneAddressAssignmentArgs,
  UpdateManyAddressAssignmentArgs,
  DeleteOneAddressAssignmentArgs,
  DeleteManyAddressAssignmentArgs
> {
  constructor(readonly prisma: PrismaService) {
    super(prisma);
  }
}

@Injectable()
export class AddressService extends BaseCrudService<
  Address,
  FindFirstAddressArgs,
  FindUniqueAddressArgs,
  FindManyAddressArgs,
  AddressGroupByArgs,
  AddressAggregateArgs,
  CreateOneAddressArgs,
  CreateManyAddressArgs,
  UpdateOneAddressArgs,
  UpdateManyAddressArgs,
  DeleteOneAddressArgs,
  DeleteManyAddressArgs
> {
  private readonly assignmentCrud: AddressAssignmentCrudService;

  constructor(
    public readonly prisma: PrismaService,
    @Inject(GEOCODING_PROVIDER)
    private readonly geocodingProvider: GeocodingProvider,
  ) {
    super(prisma);
    this.assignmentCrud = new AddressAssignmentCrudService(prisma);
  }

  /**
   * Create a new address and immediately link it to an owning entity.
   * This is helpful for flows where the address is verified via geocoding
   * before persistence.
   */
  async createAndAssign(options: {
    address: Prisma.AddressCreateInput;
    owner: {
      type: string;
      id: string;
      label?: string | null;
      isPrimary?: boolean;
      metadata?: Prisma.InputJsonValue | null;
    };
  }): Promise<AddressWithAssignments> {
    const { address, owner } = options;
    return this.prisma.$transaction(async (trx) => {
      const record = await trx.address.create({
        data: address,
      });
      await trx.addressAssignment.create({
        data: {
          addressId: record.id,
          ownerType: owner.type,
          ownerId: owner.id,
          label: owner.label ?? null,
          isPrimary: owner.isPrimary ?? false,
          metadata: owner.metadata ?? undefined,
        },
      });
      return trx.address.findUniqueOrThrow({
        where: { id: record.id },
        include: { assignments: true },
      });
    });
  }

  /**
   * Attach an existing address to a new owner.
   */
  async attachAddress(
    addressId: string,
    owner: {
      type: string;
      id: string;
      label?: string | null;
      isPrimary?: boolean;
      metadata?: Prisma.InputJsonValue | null;
    },
  ): Promise<AddressAssignment> {
    const exists = await this.prisma.address.findUnique({
      where: { id: addressId },
    });
    if (!exists) {
      throw new NotFoundException('Address not found');
    }
    return this.prisma.addressAssignment.upsert({
      where: {
        addressId_ownerType_ownerId: {
          addressId,
          ownerType: owner.type,
          ownerId: owner.id,
        },
      },
      create: {
        addressId,
        ownerType: owner.type,
        ownerId: owner.id,
        label: owner.label ?? null,
        isPrimary: owner.isPrimary ?? false,
        metadata: owner.metadata ?? undefined,
      },
      update: {
        label: owner.label ?? null,
        isPrimary: owner.isPrimary ?? false,
        metadata: owner.metadata ?? undefined,
        archivedAt: null,
      },
    });
  }

  /**
   * Resolve a location using the configured geocoding provider and persist it,
   * optionally linking it to an owning entity.
   */
  async createVerifiedAddress(options: {
    request: GeocodeRequest;
    owner?: {
      type: string;
      id: string;
      label?: string | null;
      isPrimary?: boolean;
      metadata?: Prisma.InputJsonValue | null;
    };
  }): Promise<AddressWithAssignments> {
    let result: GeocodeResult;
    try {
      result = await this.geocodingProvider.geocode(options.request);
    } catch (error: unknown) {
      const message =
        typeof error === 'object' &&
        error &&
        'message' in error &&
        typeof (error as { message: unknown }).message === 'string'
          ? (error as { message: string }).message
          : 'Geocoding provider failed to resolve address';
      throw new ServiceUnavailableException(message);
    }

    if (!result.countryCode) {
      throw new BadRequestException('Geocoding result missing country code');
    }

    const data: Prisma.AddressCreateInput = {
      formattedAddress: result.formattedAddress,
      streetLine1: result.streetLine1 ?? null,
      streetLine2: result.streetLine2 ?? null,
      city: result.city ?? null,
      state: result.state ?? null,
      postalCode: result.postalCode ?? null,
      countryCode: result.countryCode.toUpperCase(),
      latitude: result.latitude ?? null,
      longitude: result.longitude ?? null,
      placeId: result.placeId ?? null,
      plusCode: result.plusCode ?? null,
      confidence: result.confidence ?? null,
      provider: result.provider,
      externalRaw: result.raw
        ? (result.raw as Prisma.InputJsonValue)
        : Prisma.JsonNull,
      verifiedAt: new Date(),
    };

    if (options.owner) {
      return this.createAndAssign({
        address: data,
        owner: options.owner,
      });
    }

    const created = await this.prisma.address.create({
      data,
    });
    return this.prisma.address.findUniqueOrThrow({
      where: { id: created.id },
      include: { assignments: true },
    });
  }

  /**
   * Archive an assignment without deleting the address record.
   */
  async archiveAssignment(id: string): Promise<AddressAssignment> {
    return this.prisma.addressAssignment.update({
      where: { id },
      data: { archivedAt: new Date() },
    });
  }

  async addressesNeedingReview(
    limit?: number,
  ): Promise<AddressWithAssignments[]> {
    return this.prisma.address.findMany({
      where: {
        OR: [{ verifiedAt: null }, { provider: AddressSource.MANUAL }],
      },
      include: {
        assignments: {
          where: { archivedAt: null },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: limit,
    }) as unknown as Promise<AddressWithAssignments[]>;
  }

  async verifyAddress(options: {
    id: string;
    patch?: {
      formattedAddress?: string | null;
      latitude?: number | null;
      longitude?: number | null;
      confidence?: number | null;
    };
  }): Promise<AddressWithAssignments> {
    const data: Prisma.AddressUpdateInput = {
      verifiedAt: new Date(),
    };

    if (options.patch) {
      if (options.patch.formattedAddress !== undefined) {
        if (options.patch.formattedAddress !== null) {
          data.formattedAddress = options.patch.formattedAddress;
        }
      }
      if (options.patch.latitude !== undefined) {
        data.latitude = options.patch.latitude;
      }
      if (options.patch.longitude !== undefined) {
        data.longitude = options.patch.longitude;
      }
      if (options.patch.confidence !== undefined) {
        data.confidence = options.patch.confidence;
      }
    }

    return this.prisma.address.update({
      where: { id: options.id },
      data,
      include: { assignments: true },
    }) as unknown as Promise<AddressWithAssignments>;
  }

  async searchSuggestions(
    request: GeocodeRequest,
  ): Promise<GeocodeSuggestion[]> {
    return this.geocodingProvider.autocomplete(request);
  }

  get assignments() {
    return this.assignmentCrud;
  }
}
