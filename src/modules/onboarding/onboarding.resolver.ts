import { Resolver, Mutation, Args, Query, Int } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { AuthResponse } from '../auth/dto/auth-response.output';
import { OnboardingService } from './onboarding.service';
import { CreateUserInput } from '../users/dto/create-user.input';
import { UpdateCustomerProfileInput } from './dto/update-customer-profile.input';
import { ApplyResellerInput } from './dto/apply-reseller.input';
import { ApproveResellerInput } from './dto/approve-reseller.input';
import { ResellerProfile } from '../../shared/prismagraphql/reseller-profile/reseller-profile.model';
import { User } from '../../shared/prismagraphql/user/user.model';
import { CustomerProfile } from '../../shared/prismagraphql/customer-profile/customer-profile.model';
import { AdminUpdateCustomerProfileInput } from './dto/admin-update-customer-profile.input';
import { AdminCreateCustomerInput } from './dto/admin-create-customer.input';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { AuthenticatedUser } from '../auth/auth.service';

@Resolver()
export class OnboardingResolver {
  constructor(private onboardingService: OnboardingService) {}

  @Mutation(() => AuthResponse)
  signupCustomer(@Args('input') input: CreateUserInput) {
    return this.onboardingService.signupCustomer(input);
  }

  @Mutation(() => CustomerProfile)
  @UseGuards(GqlAuthGuard)
  completeCustomerProfile(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Args('input') input: UpdateCustomerProfileInput,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException('Missing authenticated user');
    }
    return this.onboardingService.completeCustomerProfile(user.id, input);
  }

  @Mutation(() => CustomerProfile)
  @UseGuards(GqlAuthGuard)
  updateMyProfile(
    @CurrentUser() user: AuthenticatedUser | undefined,
    @Args('input') input: UpdateCustomerProfileInput,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException('Missing authenticated user');
    }
    return this.onboardingService.updateMyProfile(user.id, input);
  }

  @Mutation(() => ResellerProfile)
  applyReseller(@Args('input') input: ApplyResellerInput) {
    return this.onboardingService.applyReseller(input);
  }

  @Mutation(() => ResellerProfile)
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions('APPROVE_RESELLER')
  approveReseller(
    @Args('resellerId') resellerId: string,
    @Args('input') input: ApproveResellerInput,
  ) {
    return this.onboardingService.approveReseller(resellerId, input);
  }

  @Query(() => [ResellerProfile])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions('APPROVE_RESELLER')
  pendingResellerApplications(
    @Args('take', { type: () => Int, nullable: true }) take?: number,
    @Args('skip', { type: () => Int, nullable: true }) skip?: number,
    @Args('q', { nullable: true }) q?: string,
  ) {
    return this.onboardingService.listPendingResellerApplications(
      take,
      skip,
      q,
    );
  }

  @Query(() => [User])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions('APPROVE_RESELLER')
  listBillers() {
    return this.onboardingService.listBillers();
  }

  @Query(() => [ResellerProfile])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  resellers(
    @Args('status', { nullable: true })
    status?: 'PENDING' | 'ACTIVE' | 'REJECTED',
    @Args('take', { type: () => Int, nullable: true }) take?: number,
    @Args('skip', { type: () => Int, nullable: true }) skip?: number,
    @Args('q', { nullable: true }) q?: string,
  ) {
    return this.onboardingService.listResellers({ status, take, skip, q });
  }

  @Query(() => ResellerProfile, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  resellerProfile(@Args('userId') userId: string) {
    return this.onboardingService.getResellerProfile(userId);
  }

  @Mutation(() => ResellerProfile)
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions('APPROVE_RESELLER')
  activateReseller(
    @Args('resellerId') resellerId: string,
    @Args('billerId', { nullable: true }) billerId?: string,
  ) {
    return this.onboardingService.activateReseller(resellerId, billerId);
  }

  @Mutation(() => ResellerProfile)
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions('APPROVE_RESELLER')
  rejectReseller(
    @Args('resellerId') resellerId: string,
    @Args('reason', { nullable: true }) reason?: string,
  ) {
    return this.onboardingService.rejectReseller(resellerId, reason);
  }

  @Mutation(() => CustomerProfile)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  adminUpdateCustomerProfile(
    @Args('userId') userId: string,
    @Args('input') input: AdminUpdateCustomerProfileInput,
  ) {
    return this.onboardingService.adminUpdateCustomerProfile(userId, input);
  }

  @Mutation(() => User)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  adminCreateCustomer(@Args('input') input: AdminCreateCustomerInput) {
    return this.onboardingService.adminCreateCustomer(input);
  }
}
