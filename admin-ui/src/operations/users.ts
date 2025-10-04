import { gql } from '@apollo/client';

export const Users = gql`
  query Users($take: Int) {
    listUsers(take: $take) {
      id
      email
      createdAt
      isEmailVerified
      role { name }
      customerProfile { fullName }
      resellerProfile { tier }
    }
  }
`;
