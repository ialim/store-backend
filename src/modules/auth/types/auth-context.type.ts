import { Request } from 'express';
import { AuthenticatedUser } from '../auth.service';

export type GraphQLAuthContext = {
  req: Request & { user?: AuthenticatedUser };
};
