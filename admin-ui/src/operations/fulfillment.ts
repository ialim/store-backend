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
      proposedCost
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
      proposedCost
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
      proposedCost
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
      proposedCost
      fulfillmentId
      updatedAt
    }
  }
`;

export const FulfillmentsInProgress = gql`
  query FulfillmentsInProgress(
    $statuses: [FulfillmentStatus!]
    $storeId: String
    $search: String
    $take: Int
  ) {
    fulfillmentsInProgress(
      statuses: $statuses
      storeId: $storeId
      search: $search
      take: $take
    ) {
      id
      saleOrderId
      type
      status
      deliveryAddress
      createdAt
      updatedAt
      deliveryPersonnel {
        id
        email
        customerProfile {
          fullName
        }
      }
      saleOrder {
        id
        storeId
        type
        status
        phase
        totalAmount
        biller {
          id
          email
          customerProfile {
            fullName
          }
        }
        consumerSale {
          id
          store {
            id
            name
          }
          customer {
            id
            fullName
            email
          }
        }
        resellerSale {
          id
          store {
            id
            name
          }
          reseller {
            id
            email
            customerProfile {
              fullName
            }
          }
        }
      }
      riderInterests {
        id
        status
        createdAt
        rider {
          id
          email
          customerProfile {
            fullName
          }
        }
      }
    }
  }
`;
