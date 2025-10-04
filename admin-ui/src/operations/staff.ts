import { gql } from '@apollo/client';

export const CreateStaff = gql`
  mutation CreateStaff($input: CreateStaffInput!) {
    createStaff(input: $input) {
      id
      email
    }
  }
`;

export const AssignBiller = gql`
  mutation AssignBiller($input: AssignBillerInput!) {
    assignBiller(input: $input) {
      userId
      billerId
    }
  }
`;

export const StaffDetail = gql`
  query StaffDetail($id: String!) {
    findUniqueUser(where: { id: $id }) {
      id
      email
      createdAt
      updatedAt
      isEmailVerified
      role {
        name
      }
      Store {
        id
        name
        isMain
        location
      }
      Notification {
        id
        type
        message
        isRead
        createdAt
      }
    }
  }
`;

export const SendUserEmailVerification = gql`
  mutation SendUserEmailVerification($userId: String!) {
    sendUserEmailVerification(userId: $userId)
  }
`;
