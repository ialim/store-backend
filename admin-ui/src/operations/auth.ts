import { gql } from '@apollo/client';

export const Login = gql`
  mutation Login($input: LoginInput!) {
    login(input: $input) {
      accessToken
      user {
        id
        email
        role { id name }
      }
    }
  }
`;

export const Me = gql`
  query Me {
    me {
      id
      email
      role {
        id
        name
        permissions { id name module action }
      }
      customerProfile {
        fullName
        email
        phone
      }
    }
  }
`;

export const ChangePassword = gql`
  mutation ChangePassword($input: ChangePasswordInput!) {
    changePassword(input: $input)
  }
`;
