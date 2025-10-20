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
import { PERMISSIONS_KEY } from '../decorators/permissions.decorator';
import { PERMISSIONS } from '../../../../shared/permissions';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<string[]>(
      PERMISSIONS_KEY,
      [context.getHandler(), context.getClass()],
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
    if (user.role.name === 'SUPERADMIN') {
      return true;
    }
    const userPermissions = (user.role.permissions ?? []).map((p) => p.name);
    const missing = requiredPermissions.filter(
      (permission) => !userPermissions.includes(permission),
    );
    if (missing.length === 0) {
      return true;
    }

    const roleName = (user.role.name || '').toUpperCase();
    const readBypass = new Set(
      [PERMISSIONS.order?.READ, PERMISSIONS.sale?.READ].filter(
        (perm): perm is string => typeof perm === 'string' && perm.length > 0,
      ),
    );
    if (
      ['RESELLER', 'BILLER', 'RIDER'].includes(roleName) &&
      missing.every((perm) => readBypass.has(perm))
    ) {
      return true;
    }

    if (missing.length) {
      throw new ForbiddenException('Insufficient permissions');
    }
    return true;
  }
}
