import { gql } from '@apollo/client';

export const PendingResellerApplications = gql`
  query PendingResellerApplications($take: Int, $skip: Int, $q: String) {
    pendingResellerApplications(take: $take, skip: $skip, q: $q) {
      userId
      tier
      creditLimit
      requestedAt
      requestedBillerId
      biller {
        id
        email
      }
      requestedBiller {
        id
        email
      }
      user {
        id
        email
      }
    }
  }
`;

export const ListBillers = gql`
  query ListBillers {
    listBillers {
      id
      email
    }
  }
`;

export const ApproveReseller = gql`
  mutation ApproveReseller(
    $resellerId: String!
    $input: ApproveResellerInput!
  ) {
    approveReseller(resellerId: $resellerId, input: $input) {
      userId
      profileStatus
      biller {
        id
        email
      }
    }
  }
`;

export const ActivateReseller = gql`
  mutation ActivateReseller($resellerId: String!, $billerId: String) {
    activateReseller(resellerId: $resellerId, billerId: $billerId) {
      userId
      profileStatus
      biller {
        id
        email
      }
    }
  }
`;

export const RejectReseller = gql`
  mutation RejectReseller($resellerId: String!, $reason: String) {
    rejectReseller(resellerId: $resellerId, reason: $reason) {
      userId
      profileStatus
      rejectionReason
    }
  }
`;

export const Resellers = gql`
  query Resellers($status: String, $take: Int, $q: String) {
    resellers(status: $status, take: $take, q: $q) {
      userId
      profileStatus
      tier
      creditLimit
      requestedAt
      user {
        id
        email
      }
      biller {
        id
        email
      }
      requestedBiller {
        id
        email
      }
    }
  }
`;

export const ResellerProfile = gql`
  query ResellerProfile($userId: String!) {
    resellerProfile(userId: $userId) {
      userId
      profileStatus
      tier
      creditLimit
      outstandingBalance
      requestedAt
      activatedAt
      rejectedAt
      rejectionReason
      biller {
        id
        email
      }
      requestedBiller {
        id
        email
      }
      user {
        id
        email
      }
    }
  }
`;
