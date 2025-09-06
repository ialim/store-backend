import { Resolver, Mutation, Args, Context } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { AuthResponse } from '../auth/dto/auth-response.output';
import { OnboardingService } from './onboarding.service';
import { CreateUserInput } from '../users/dto/create-user.input';
import { UpdateCustomerProfileInput } from './dto/update-customer-profile.input';
import { ApplyResellerInput } from './dto/apply-reseller.input';
import { ApproveResellerInput } from './dto/approve-reseller.input';
import { CustomerProfile } from '../../shared/prismagraphql/customer-profile/customer-profile.model';
import { ResellerProfile } from '../../shared/prismagraphql/reseller-profile/reseller-profile.model';

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
    @Context('req') req,
    @Args('input') input: UpdateCustomerProfileInput,
  ) {
    return this.onboardingService.completeCustomerProfile(req.user.id, input);
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
}
