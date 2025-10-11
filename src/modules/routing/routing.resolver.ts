import {
  Resolver,
  Query,
  Args,
  Float,
  registerEnumType,
} from '@nestjs/graphql';
import { UseGuards, BadRequestException } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../shared/permissions';
import {
  RoutingService,
  RouteEstimate,
  RoutingProfile,
} from './routing.service';
import { PrismaService } from '../../common/prisma/prisma.service';
import { ObjectType, Field } from '@nestjs/graphql';

registerEnumType(RoutingProfile, {
  name: 'RoutingProfile',
});

@ObjectType()
class RouteEstimateModel {
  @Field(() => Float)
  distanceMeters!: number;

  @Field(() => Float)
  durationSeconds!: number;

  @Field()
  provider!: string;

  @Field(() => RoutingProfile)
  profile!: RoutingProfile;
}

@Resolver()
export class RoutingResolver {
  constructor(
    private readonly routingService: RoutingService,
    private readonly prisma: PrismaService,
  ) {}

  @Query(() => RouteEstimateModel, {
    nullable: false,
    description:
      'Estimate distance and ETA between two stored addresses using the configured routing provider.',
  })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER')
  @Permissions(PERMISSIONS.address.READ as string)
  async estimateRouteByAddresses(
    @Args('originAddressId') originAddressId: string,
    @Args('destinationAddressId') destinationAddressId: string,
    @Args('profile', { type: () => RoutingProfile, nullable: true })
    profile?: RoutingProfile,
  ): Promise<RouteEstimate> {
    const [origin, destination] = await Promise.all([
      this.prisma.address.findUnique({ where: { id: originAddressId } }),
      this.prisma.address.findUnique({ where: { id: destinationAddressId } }),
    ]);

    if (!origin || !destination) {
      throw new BadRequestException('Origin or destination address not found');
    }

    if (origin.latitude == null || origin.longitude == null) {
      throw new BadRequestException('Origin address is missing coordinates');
    }
    if (destination.latitude == null || destination.longitude == null) {
      throw new BadRequestException(
        'Destination address is missing coordinates',
      );
    }

    return this.routingService.estimateRoute({
      profile: profile ?? RoutingProfile.DRIVING,
      coordinates: [
        { latitude: origin.latitude, longitude: origin.longitude },
        { latitude: destination.latitude, longitude: destination.longitude },
      ],
    });
  }
}
