import { Resolver, Query, Mutation, Args } from '@nestjs/graphql';
import { UseGuards } from '@nestjs/common';
import { RolesService } from './roles.service';
import { Role as RoleModel } from '../../shared/prismagraphql/role/role.model';
import { Permission as PermissionModel } from '../../shared/prismagraphql/permission/permission.model';
import { CreateRoleInput } from './dto/create-role.input';
import { UpdateRoleInput } from './dto/update-role.input';
import { AssignRoleInput } from './dto/assign-role.input';
import { GqlAuthGuard } from '../auth/guards/gql-auth.guard';
import { PermissionsGuard } from '../auth/guards/permissions.guard';
import { Permissions } from '../auth/decorators/permissions.decorator';
import { PERMISSIONS } from '../../../shared/permissions';

@Resolver(() => RoleModel)
export class RolesResolver {
  constructor(private readonly rolesService: RolesService) {}

  @Query(() => [PermissionModel])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.role.READ as string)
  rolePermissions() {
    return this.rolesService.listPermissions();
  }

  @Query(() => [RoleModel])
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.role.READ as string)
  roles() {
    return this.rolesService.listRoles();
  }

  @Mutation(() => RoleModel)
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.role.CREATE as string)
  createRole(@Args('input') input: CreateRoleInput) {
    return this.rolesService.createRole(input);
  }

  @Mutation(() => RoleModel)
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.role.UPDATE as string)
  updateRole(
    @Args('roleId') roleId: string,
    @Args('input') input: UpdateRoleInput,
  ) {
    return this.rolesService.updateRole(roleId, input);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.role.DELETE as string)
  deleteRole(@Args('roleId') roleId: string) {
    return this.rolesService.deleteRole(roleId);
  }

  @Mutation(() => Boolean)
  @UseGuards(GqlAuthGuard, PermissionsGuard)
  @Permissions(PERMISSIONS.role.UPDATE as string)
  assignRole(@Args('input') input: AssignRoleInput) {
    return this.rolesService.assignRole(input);
  }
}
