import { gql } from '@apollo/client';

export const HeaderNotifications = gql`
  query HeaderNotifications {
    notifications {
      id
      isRead
      type
      message
      createdAt
    }
  }
`;

export const MarkNotificationAsRead = gql`
  mutation MarkNotificationAsRead($id: String!) {
    markAsRead(id: $id) {
      id
      isRead
    }
  }
`;
