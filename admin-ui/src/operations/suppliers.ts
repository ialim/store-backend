import { gql } from '@apollo/client';

export const Suppliers = gql`
  query Suppliers($take: Int, $skip: Int) {
    listSuppliers(take: $take, skip: $skip) {
      id
      name
      creditLimit
      currentBalance
      createdAt
    }
  }
`;
