import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VerificationService } from './verification.service';
import { AuthenticatedUser } from '../auth/auth.service';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../shared/permissions';

@Resolver()
export class VerificationResolver {
  constructor(private verificationService: VerificationService) {}

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  sendEmailVerification(@CurrentUser() user: AuthenticatedUser) {
    return this.verificationService.sendEmailVerification(user.id);
  }

  @Mutation(() => Boolean)
  verifyEmail(@Args('token') token: string) {
    return this.verificationService.verifyEmail(token);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('SUPERADMIN', 'ADMIN')
  @Permissions(PERMISSIONS.user.UPDATE as string)
  sendUserEmailVerification(@Args('userId') userId: string) {
    return this.verificationService.sendEmailVerification(userId);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  sendPhoneVerification(@CurrentUser() user: AuthenticatedUser) {
    return this.verificationService.sendPhoneVerification(user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  verifyPhone(
    @Args('code') code: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    return this.verificationService.verifyPhone(user.id, code);
  }
}
