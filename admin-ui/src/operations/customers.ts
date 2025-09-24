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

export const Customer = gql`
  query Customer($id: String!) {
    findUniqueUser(where: { id: $id }) {
      id
      email
      customerProfile {
        fullName
        email
        phone
        profileStatus
        preferredStore { id name }
        sales {
          id
          status
          createdAt
          totalAmount
          store { id name }
          receipt { id issuedAt consumerSaleId }
        }
      }
    }
  }
`;

export const StoresForCustomers = gql`
  query StoresForCustomers { listStores(take: 200) { id name } }
`;

export const AdminUpdateCustomerProfile = gql`
  mutation AdminUpdateCustomerProfile($userId: String!, $input: AdminUpdateCustomerProfileInput!) {
    adminUpdateCustomerProfile(userId: $userId, input: $input) {
      userId
      profileStatus
    }
  }
`;

export const AdminCreateCustomer = gql`
  mutation AdminCreateCustomer($input: AdminCreateCustomerInput!) {
    adminCreateCustomer(input: $input) { id email customerProfile { fullName } }
  }
`;

export const ConsumerSalesByCustomer = gql`
  query ConsumerSalesByCustomer($customerId: String!, $take: Int, $skip: Int, $order: String, $cursorId: String) {
    consumerSalesByCustomer(customerId: $customerId, take: $take, skip: $skip, order: $order, cursorId: $cursorId) {
      id
      status
      totalAmount
      createdAt
      store { id name }
    }
  }
`;

export const ConsumerReceiptsByCustomer = gql`
  query ConsumerReceiptsByCustomer($customerId: String!, $take: Int, $skip: Int, $order: String, $cursorId: String) {
    consumerReceiptsByCustomer(customerId: $customerId, take: $take, skip: $skip, order: $order, cursorId: $cursorId) {
      id
      issuedAt
      consumerSaleId
    }
  }
`;

export const CompleteCustomerProfile = gql`
  mutation CompleteCustomerProfile($input: UpdateCustomerProfileInput!) {
    completeCustomerProfile(input: $input) {
      userId
      profileStatus
      fullName
      email
      phone
    }
  }
`;

export const SignupCustomer = gql`
  mutation SignupCustomer($input: CreateUserInput!) {
    signupCustomer(input: $input) {
      accessToken
      user { id email }
    }
  }
`;
