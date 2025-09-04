import { registerEnumType } from '@nestjs/graphql';

export enum RoleName {
  ADMIN = 'ADMIN',
  BILLER = 'BILLER',
  MANAGER = 'MANAGER',
}

registerEnumType(RoleName, { name: 'RoleName' });
