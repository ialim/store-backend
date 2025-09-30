import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { GraphQLAuthContext } from '../types/auth-context.type';
import { AuthenticatedUser } from '../auth.service';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.get<string[]>(
      'permissions',
      context.getHandler(),
    );
    if (!requiredPermissions) {
      return true;
    }
    const ctx = GqlExecutionContext.create(context);
    const graphqlContext = ctx.getContext<GraphQLAuthContext>();
    const user: AuthenticatedUser | undefined = graphqlContext.req.user;
    if (!user || !user.role) {
      throw new ForbiddenException('No user or role found in request');
    }
    const userPermissions = (user.role.permissions ?? []).map((p) => p.name);
    const hasPermission = requiredPermissions.every((permission) =>
      userPermissions.includes(permission),
    );
    if (!hasPermission) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
