import { gql } from '@apollo/client';

export const PendingResellerApplications = gql`
  query PendingResellerApplications($take: Int, $skip: Int, $q: String) {
    pendingResellerApplications(take: $take, skip: $skip, q: $q) {
      userId
      tier
      creditLimit
      requestedAt
      requestedBillerId
      companyName
      contactPersonName
      contactPhone
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
      customerProfile {
        fullName
      }
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
      activatedAt
      tier
      creditLimit
      requestedAt
      companyName
      contactPersonName
      contactPhone
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
      activatedAt
      tier
      creditLimit
      outstandingBalance
      requestedAt
      activatedAt
      rejectedAt
      rejectionReason
      companyName
      companyInitials
      companyLogoUrl
      contactPersonName
      contactPhone
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

export const MyResellerProfile = gql`
  query MyResellerProfile {
    myResellerProfile {
      userId
      billerId
      profileStatus
      activatedAt
      tier
      creditLimit
      outstandingBalance
      companyName
      companyInitials
      companyLogoUrl
      contactPersonName
      contactPhone
      biller {
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

export const ApplyReseller = gql`
  mutation ApplyReseller($input: ApplyResellerInput!) {
    applyReseller(input: $input) { userId profileStatus }
  }
`;

export const UpdateResellerBranding = gql`
  mutation UpdateResellerBranding($resellerId: String!, $input: UpdateResellerBrandingInput!) {
    updateResellerBranding(resellerId: $resellerId, input: $input) {
      userId
      companyInitials
      companyLogoUrl
      companyName
      tier
      creditLimit
      outstandingBalance
    }
  }
`;

export const UpdateMyResellerBranding = gql`
  mutation UpdateMyResellerBranding($input: UpdateResellerBrandingInput!) {
    updateMyResellerBranding(input: $input) {
      userId
      companyInitials
      companyLogoUrl
      companyName
      contactPersonName
      contactPhone
      tier
      creditLimit
      outstandingBalance
    }
  }
`;
