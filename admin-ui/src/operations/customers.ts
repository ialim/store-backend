import { gql } from '@apollo/client';

export const Customers = gql`
  query Customers($take: Int, $where: UserWhereInput) {
    listUsers(take: $take, where: $where) {
      id
      email
      customerProfile {
        fullName
        email
        phone
        profileStatus
        preferredStore { id name }
      }
    }
  }
`;

export const StoresForCustomers = gql`query StoresForCustomers { listStores(take: 200) { id name } }`;

export const AdminUpdateCustomerProfile = gql`
  mutation AdminUpdateCustomerProfile($userId: String!, $input: AdminUpdateCustomerProfileInput!) {
    adminUpdateCustomerProfile(userId: $userId, input: $input) { userId profileStatus }
  }
`;

export const AdminCreateCustomer = gql`
  mutation AdminCreateCustomer($input: AdminCreateCustomerInput!) {
    adminCreateCustomer(input: $input) { id email customerProfile { fullName } }
  }
`;

