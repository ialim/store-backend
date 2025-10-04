import { gql } from '@apollo/client';

export const VerifyEmail = gql`
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token)
  }
`;
