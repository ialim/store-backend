import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { Notification } from '../../shared/prismagraphql/notification/notification.model';
import { NotificationService } from './notification.service';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';

@Resolver(() => Notification)
export class NotificationResolver {
  constructor(private notificationService: NotificationService) {}

  @Query(() => [Notification])
  @UseGuards(GqlAuthGuard)
  async notifications(@CurrentUser() user) {
    return this.notificationService.getNotifications(user.id);
  }

  @Mutation(() => Notification)
  @UseGuards(GqlAuthGuard)
  async markAsRead(@Args('id') id: string) {
    return this.notificationService.markAsRead(id);
  }
}
