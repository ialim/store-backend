import { Resolver, Mutation, Args, Query } from '@nestjs/graphql';
import { UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { LoginInput } from './dto/login.input';
import { AuthResponse } from './dto/auth-response.output';
import { ChangePasswordInput } from './dto/change-password.input';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from './guards/gql-auth.guard';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '../../shared/prismagraphql/user/user.model';
import { AuthenticatedUser } from './auth.service';

@Resolver()
export class AuthResolver {
  constructor(private authService: AuthService) {}

  @Mutation(() => AuthResponse)
  login(@Args('input') input: LoginInput) {
    return this.authService.login(input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard)
  changePassword(
    @Args('input') input: ChangePasswordInput,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    if (!user?.id) {
      throw new UnauthorizedException('User not found in request context');
    }
    return this.authService.changePassword(user.id, input);
  }

  @Query(() => User)
  @UseGuards(GqlAuthGuard)
  me(@CurrentUser() user: AuthenticatedUser) {
    return user;
  }
}
