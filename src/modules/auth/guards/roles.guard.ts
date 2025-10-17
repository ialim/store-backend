import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { GqlExecutionContext } from '@nestjs/graphql';
import { GraphQLAuthContext } from '../types/auth-context.type';
import { AuthenticatedUser } from '../auth.service';
import { ROLES_KEY } from '../decorators/roles.decorator';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<string[]>(
      ROLES_KEY,
      [context.getHandler(), context.getClass()],
    );
    if (!requiredRoles) {
      return true;
    }
    const ctx = GqlExecutionContext.create(context);
    const graphqlContext = ctx.getContext<GraphQLAuthContext>();
    const user: AuthenticatedUser | undefined = graphqlContext.req.user;
    if (!user) {
      throw new UnauthorizedException();
    }
    const roleName = user.role?.name;
    if (roleName && requiredRoles.includes(roleName)) {
      return true;
    }
    throw new ForbiddenException("You don't have permission (RolesGuard)");
  }
}
