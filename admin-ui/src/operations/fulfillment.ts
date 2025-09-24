import { gql } from '@apollo/client';

export const AssignFulfillmentPersonnel = gql`
  mutation AssignFulfillmentPersonnel($input: AssignFulfillmentPersonnelInput!) {
    assignFulfillmentPersonnel(input: $input) {
      id
      status
      deliveryPersonnelId
      updatedAt
    }
  }
`;

export const UpdateFulfillmentStatus = gql`
  mutation UpdateFulfillmentStatus($input: UpdateFulfillmentStatusInput!) {
    updateFulfillmentStatus(input: $input) {
      id
      status
      updatedAt
    }
  }
`;
