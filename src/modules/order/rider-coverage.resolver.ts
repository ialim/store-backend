import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RiderCoverageArea } from '../../shared/prismagraphql/rider-coverage-area/rider-coverage-area.model';
import { RiderCoverageService } from './rider-coverage.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../shared/permissions';
import { UpsertRiderCoverageInput } from './dto/rider-coverage-area.input';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.service';

@Resolver()
export class RiderCoverageResolver {
  constructor(private readonly coverage: RiderCoverageService) {}

  @Query(() => [RiderCoverageArea])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('RIDER')
  async myCoverageAreas(@CurrentUser() user: AuthenticatedUser) {
    return this.coverage.listForRider(user.id);
  }

  @Query(() => [RiderCoverageArea])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER')
  @Permissions(PERMISSIONS.order.READ as string)
  async riderCoverageAreas(@Args('riderId') riderId: string) {
    return this.coverage.listForRider(riderId);
  }

  @Mutation(() => [RiderCoverageArea])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER')
  @Permissions(PERMISSIONS.order.UPDATE as string)
  async upsertRiderCoverage(@Args('input') input: UpsertRiderCoverageInput) {
    return this.coverage.upsertCoverage({
      riderId: input.riderId,
      coverage: input.coverage,
    });
  }
}
