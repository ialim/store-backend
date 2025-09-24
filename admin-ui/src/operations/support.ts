import { gql } from '@apollo/client';

export const MySupportMessages = gql`
  query MySupportMessages {
    mySupportMessages {
      id
      message
      createdAt
      isAdmin
    }
  }
`;

export const RecentSupportThreads = gql`
  query RecentSupportThreads($limit: Int) {
    recentSupportThreads(limit: $limit) {
      id
      userId
      message
      createdAt
      isAdmin
    }
  }
`;

export const SupportConversation = gql`
  query SupportConversation($userId: String!) {
    supportConversation(userId: $userId) {
      id
      message
      createdAt
      isAdmin
    }
  }
`;

export const SendSupportMessage = gql`
  mutation SendSupportMessage($message: String!) {
    sendSupportMessage(input: { message: $message }) {
      id
      message
      createdAt
      isAdmin
    }
  }
`;

export const AdminSendSupportMessage = gql`
  mutation AdminSendSupportMessage($userId: String!, $message: String!) {
    adminSendSupportMessage(input: { userId: $userId, message: $message }) {
      id
      message
      createdAt
      isAdmin
    }
  }
`;
