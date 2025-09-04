import { Resolver, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { VerificationService } from './verification.service';

@Resolver()
export class VerificationResolver {
  constructor(private verificationService: VerificationService) {}

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  sendEmailVerification(@CurrentUser() user) {
    return this.verificationService.sendEmailVerification(user.id);
  }

  @Mutation(() => Boolean)
  verifyEmail(@Args('token') token: string) {
    return this.verificationService.verifyEmail(token);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  sendPhoneVerification(@CurrentUser() user) {
    return this.verificationService.sendPhoneVerification(user.id);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  verifyPhone(@Args('code') code: string, @CurrentUser() user) {
    return this.verificationService.verifyPhone(user.id, code);
  }
}
