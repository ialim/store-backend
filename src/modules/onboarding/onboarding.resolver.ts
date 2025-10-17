import { Resolver, Mutation, Args, Query, Int } from '@nestjs/graphql';
import { UseGuards, UnauthorizedException } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../shared/permissions';
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
  @Permissions(PERMISSIONS.resellerProfile.APPROVE as string)
  approveReseller(
    @Args('resellerId') resellerId: string,
    @Args('input') input: ApproveResellerInput,
  ) {
    return this.onboardingService.approveReseller(resellerId, input);
  }

  @Query(() => [ResellerProfile])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.resellerProfile.APPROVE as string)
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
  @Permissions(PERMISSIONS.resellerProfile.APPROVE as string)
  listBillers() {
    return this.onboardingService.listBillers();
  }

  @Query(() => [User])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER', 'ACCOUNTANT')
  @Permissions(PERMISSIONS.order.READ as string)
  orderBillers() {
    return this.onboardingService.listBillers();
  }

  @Query(() => [ResellerProfile])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.resellerProfile.READ as string)
  resellers(
    @Args('status', { nullable: true })
    status?: 'PENDING' | 'ACTIVE' | 'REJECTED',
    @Args('take', { type: () => Int, nullable: true }) take?: number,
    @Args('skip', { type: () => Int, nullable: true }) skip?: number,
    @Args('q', { nullable: true }) q?: string,
  ) {
    return this.onboardingService.listResellers({ status, take, skip, q });
  }

  @Query(() => [ResellerProfile])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER', 'BILLER', 'ACCOUNTANT')
  @Permissions(PERMISSIONS.order.READ as string)
  orderResellers(
    @Args('q', { nullable: true }) q?: string,
    @Args('take', { type: () => Int, nullable: true }) take?: number,
    @CurrentUser() user?: AuthenticatedUser,
  ) {
    return this.onboardingService.listResellers({
      status: 'ACTIVE',
      q,
      take: take ?? 25,
      billerId: user?.role?.name === 'BILLER' && user.id ? user.id : undefined,
    });
  }

  @Query(() => ResellerProfile, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  @Permissions(PERMISSIONS.resellerProfile.READ as string)
  resellerProfile(@Args('userId') userId: string) {
    return this.onboardingService.getResellerProfile(userId);
  }

  @Query(() => ResellerProfile, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('RESELLER')
  myResellerProfile(@CurrentUser() user: AuthenticatedUser | undefined) {
    if (!user?.id) {
      throw new UnauthorizedException('Missing authenticated user');
    }
    return this.onboardingService.getResellerProfile(user.id);
  }

  @Mutation(() => ResellerProfile)
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.resellerProfile.APPROVE as string)
  activateReseller(
    @Args('resellerId') resellerId: string,
    @Args('billerId', { nullable: true }) billerId?: string,
  ) {
    return this.onboardingService.activateReseller(resellerId, billerId);
  }

  @Mutation(() => ResellerProfile)
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.resellerProfile.APPROVE as string)
  rejectReseller(
    @Args('resellerId') resellerId: string,
    @Args('reason', { nullable: true }) reason?: string,
  ) {
    return this.onboardingService.rejectReseller(resellerId, reason);
  }

  @Mutation(() => CustomerProfile)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.customerProfile.UPDATE as string)
  adminUpdateCustomerProfile(
    @Args('userId') userId: string,
    @Args('input') input: AdminUpdateCustomerProfileInput,
  ) {
    return this.onboardingService.adminUpdateCustomerProfile(userId, input);
  }

  @Mutation(() => User)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.user.CREATE as string)
  adminCreateCustomer(@Args('input') input: AdminCreateCustomerInput) {
    return this.onboardingService.adminCreateCustomer(input);
  }
}
