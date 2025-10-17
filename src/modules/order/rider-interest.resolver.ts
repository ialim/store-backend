import { Args, Mutation, Query, Resolver } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { Fulfillment } from '../../shared/prismagraphql/fulfillment/fulfillment.model';
import { FulfillmentRiderInterest } from '../../shared/prismagraphql/fulfillment-rider-interest/fulfillment-rider-interest.model';
import { RiderInterestService } from './rider-interest.service';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import type { AuthenticatedUser } from '../auth/auth.service';
import { RegisterFulfillmentInterestInput } from './dto/register-fulfillment-interest.input';
import { AssignFulfillmentRiderInput } from './dto/assign-fulfillment-rider.input';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../shared/permissions';

@Resolver()
export class RiderInterestResolver {
  constructor(private readonly riderInterests: RiderInterestService) {}

  @Query(() => [Fulfillment])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('RIDER')
  async deliverableFulfillments(@CurrentUser() user: AuthenticatedUser) {
    return this.riderInterests.availableDeliveriesForRider(user.id);
  }

  @Query(() => [FulfillmentRiderInterest])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('RIDER')
  async myFulfillmentInterests(@CurrentUser() user: AuthenticatedUser) {
    return this.riderInterests.myInterests(user.id);
  }

  @Query(() => [FulfillmentRiderInterest])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER')
  @Permissions(PERMISSIONS.order.READ as string)
  async fulfillmentRiderInterests(@Args('saleOrderId') saleOrderId: string) {
    return this.riderInterests.listForSaleOrder(saleOrderId);
  }

  @Mutation(() => FulfillmentRiderInterest)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('RIDER')
  async registerFulfillmentInterest(
    @Args('input') input: RegisterFulfillmentInterestInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.riderInterests.registerInterest({
      fulfillmentId: input.fulfillmentId,
      riderId: user.id,
      etaMinutes: input.etaMinutes,
      message: input.message,
      proposedCost: input.proposedCost,
    });
  }

  @Mutation(() => FulfillmentRiderInterest)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('RIDER')
  async withdrawFulfillmentInterest(
    @Args('fulfillmentId') fulfillmentId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.riderInterests.withdrawInterest(fulfillmentId, user.id);
  }

  @Mutation(() => FulfillmentRiderInterest)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER')
  @Permissions(PERMISSIONS.sale.UPDATE as string)
  async assignFulfillmentRider(
    @Args('input') input: AssignFulfillmentRiderInput,
  ) {
    return this.riderInterests.assignRider(input.fulfillmentId, input.riderId);
  }
}
