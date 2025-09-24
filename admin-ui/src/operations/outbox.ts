import { gql } from '@apollo/client';

export const OutboxStatus = gql`
  query OutboxStatus { outboxStatus { pending failed published } }
`;

export const LastFailedOutboxEvents = gql`
  query LastFailedOutboxEvents($limit: Int) {
    lastFailedOutboxEvents(limit: $limit) {
      id
      type
      lastError
      createdAt
    }
  }
`;

export const OutboxStatusByType = gql`
  query OutboxStatusByType($types: [String!]) {
    outboxStatusByType(types: $types) {
      type
      pending
      failed
      published
    }
  }
`;

export const ProcessOutbox = gql`
  mutation ProcessOutbox($limit: Int, $type: String, $status: OutboxStatus) { processOutbox(limit: $limit, type: $type, status: $status) }
`;

export const RetryOutboxFailed = gql`
  mutation RetryOutboxFailed($limit: Int, $type: String) {
    retryOutboxFailed(limit: $limit, type: $type)
  }
`;
