import { ObjectType, Field } from '@nestjs/graphql';
import { User } from '../../../shared/prismagraphql/user/user.model';

@ObjectType()
export class AuthResponse {
  @Field()
  accessToken: string;

  @Field(() => User)
  user: User;
}
