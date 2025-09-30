import { Resolver, Query, Mutation, Args, Context, Int } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { SupportService } from './support.service';
import {
  SendSupportMessageInput,
  AdminSendSupportMessageInput,
} from './dto/send-support-message.input';
import { SupportMessage } from '../../shared/prismagraphql/support-message/support-message.model';
import { AuthenticatedUser } from '../auth/auth.service';

type RequestWithUser = Request & { user: AuthenticatedUser };

@Resolver()
export class SupportResolver {
  constructor(private support: SupportService) {}

  @Query(() => [SupportMessage])
  @UseGuards(GqlAuthGuard)
  mySupportMessages(@Context('req') req: RequestWithUser) {
    return this.support.myMessages(req.user.id);
  }

  @Query(() => [SupportMessage])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  supportConversation(@Args('userId') userId: string) {
    return this.support.conversation(userId);
  }

  @Query(() => [SupportMessage])
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  recentSupportThreads(
    @Args('limit', { type: () => Int, nullable: true }) limit?: number,
  ) {
    return this.support.recentThreads(limit ?? 20);
  }

  @Mutation(() => SupportMessage)
  @UseGuards(GqlAuthGuard)
  sendSupportMessage(
    @Context('req') req: RequestWithUser,
    @Args('input') input: SendSupportMessageInput,
  ) {
    return this.support.sendFromUser(req.user.id, input.message);
  }

  @Mutation(() => SupportMessage)
  @UseGuards(GqlAuthGuard, RolesGuard)
  @Roles('SUPERADMIN', 'ADMIN', 'MANAGER')
  adminSendSupportMessage(
    @Context('req') req: RequestWithUser,
    @Args('input') input: AdminSendSupportMessageInput,
  ) {
    return this.support.sendFromAdmin(input.userId, req.user.id, input.message);
  }
}
