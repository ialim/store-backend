import {
  User,
  FindFirstUserArgs,
  FindUniqueUserArgs,
  FindManyUserArgs,
  UserGroupBy,
  UserGroupByArgs,
  AggregateUser,
  UserAggregateArgs,
  CreateOneUserArgs,
  CreateManyUserArgs,
  UpdateOneUserArgs,
  UpdateManyUserArgs,
  DeleteOneUserArgs,
  DeleteManyUserArgs,
} from '../../shared/prismagraphql/user';
import { AffectedRows } from '../../shared/prismagraphql/prisma';
import {
  Resolver,
  Query,
  Args,
  Mutation,
  ResolveField,
  Parent,
} from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserService } from './users.service';
import { Role } from '../../shared/prismagraphql/role/role.model';
import { CustomerProfile } from '../../shared/prismagraphql/customer-profile/customer-profile.model';
import { ResellerProfile } from '../../shared/prismagraphql/reseller-profile/reseller-profile.model';
import { User as UserModel } from '../../shared/prismagraphql/user/user.model';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../shared/permissions';
@Resolver(() => User)
export class UsersResolver {
  constructor(private readonly userService: UserService) {}

  @Query(() => User, { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.user.READ as string)
  findFirstUser(@Args() args: FindFirstUserArgs) {
    return this.userService.findFirst(args);
  }

  @Query(() => User, { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.user.READ as string)
  findUniqueUser(@Args() args: FindUniqueUserArgs) {
    return this.userService.findUnique(args);
  }

  @Query(() => [User], { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.user.READ as string)
  listUsers(@Args() args: FindManyUserArgs) {
    return this.userService.findMany(args);
  }

  @Query(() => [UserGroupBy], { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.user.READ as string)
  groupByUser(@Args() args: UserGroupByArgs) {
    return this.userService.groupBy(args);
  }

  @Query(() => AggregateUser, { nullable: false })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.user.READ as string)
  aggregateUser(@Args() args: UserAggregateArgs) {
    return this.userService.aggregate(args);
  }

  @Mutation(() => User, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.user.CREATE as string)
  createUser(@Args() args: CreateOneUserArgs) {
    return this.userService.create(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.user.CREATE as string)
  createManyUser(@Args() args: CreateManyUserArgs) {
    return this.userService.createMany(args);
  }

  @Mutation(() => User, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.user.UPDATE as string)
  updateUser(@Args() args: UpdateOneUserArgs) {
    return this.userService.update(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.user.UPDATE as string)
  updateManyUser(@Args() args: UpdateManyUserArgs) {
    return this.userService.updateMany(args);
  }

  @Mutation(() => User, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.user.DELETE as string)
  deleteUser(@Args() args: DeleteOneUserArgs) {
    return this.userService.delete(args);
  }

  @Mutation(() => AffectedRows, { nullable: true })
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.user.DELETE as string)
  deleteManyUser(@Args() args: DeleteManyUserArgs) {
    return this.userService.deleteMany(args);
  }

  // Field resolvers to ensure nested data resolves without explicit include
  @ResolveField(() => Role, { name: 'role' })
  @UseGuards(GqlAuthGuard)
  role(@Parent() user: { roleId: string }) {
    return this.userService.prisma.role.findUnique({
      where: { id: user.roleId },
    });
  }

  @ResolveField(() => CustomerProfile, {
    name: 'customerProfile',
    nullable: true,
  })
  @UseGuards(GqlAuthGuard)
  customerProfile(@Parent() user: { id: string }) {
    return this.userService.prisma.customerProfile.findUnique({
      where: { userId: user.id },
    });
  }

  @ResolveField(() => ResellerProfile, {
    name: 'resellerProfile',
    nullable: true,
  })
  @UseGuards(GqlAuthGuard)
  resellerProfile(@Parent() user: { id: string }) {
    return this.userService.prisma.resellerProfile.findUnique({
      where: { userId: user.id },
    });
  }

  @Query(() => [UserModel])
  @UseGuards(GqlAuthGuard, RolesGuard, PermissionsGuard)
  @Roles('ADMIN', 'SUPERADMIN')
  @Permissions(PERMISSIONS.user.READ as string)
  listManagers() {
    return this.userService.prisma.user.findMany({
      where: { role: { name: 'MANAGER' } },
      orderBy: { email: 'asc' },
      take: 500,
    });
  }
}
