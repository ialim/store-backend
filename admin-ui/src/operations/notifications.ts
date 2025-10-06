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
