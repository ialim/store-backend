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

export const DeliverableFulfillments = gql`
  query DeliverableFulfillments {
    deliverableFulfillments {
      id
      saleOrderId
      deliveryAddress
      status
      createdAt
    }
  }
`;

export const MyFulfillmentInterests = gql`
  query MyFulfillmentInterests {
    myFulfillmentInterests {
      id
      status
      etaMinutes
      message
      createdAt
      fulfillment {
        id
        saleOrderId
        deliveryAddress
        status
      }
    }
  }
`;

export const RegisterFulfillmentInterest = gql`
  mutation RegisterFulfillmentInterest($input: RegisterFulfillmentInterestInput!) {
    registerFulfillmentInterest(input: $input) {
      id
      status
      etaMinutes
      message
      fulfillmentId
      updatedAt
    }
  }
`;

export const WithdrawFulfillmentInterest = gql`
  mutation WithdrawFulfillmentInterest($fulfillmentId: String!) {
    withdrawFulfillmentInterest(fulfillmentId: $fulfillmentId) {
      id
      status
      updatedAt
    }
  }
`;

export const FulfillmentRiderInterests = gql`
  query FulfillmentRiderInterests($saleOrderId: String!) {
    fulfillmentRiderInterests(saleOrderId: $saleOrderId) {
      id
      riderId
      fulfillmentId
      status
      etaMinutes
      message
      createdAt
      rider {
        id
        email
        customerProfile {
          fullName
        }
        resellerProfile {
          userId
        }
      }
    }
  }
`;

export const AssignFulfillmentRider = gql`
  mutation AssignFulfillmentRider($input: AssignFulfillmentRiderInput!) {
    assignFulfillmentRider(input: $input) {
      id
      status
      riderId
      fulfillmentId
      updatedAt
    }
  }
`;
