import { gql } from '@apollo/client';

export const OutboxStatus = gql`
  query OutboxStatus { outboxStatus { pending failed published } }
`;

export const LastFailed = gql`
  query LastFailed($limit: Int) { lastFailedOutboxEvents(limit: $limit) { id type lastError createdAt } }
`;

export const StatusByType = gql`
  query StatusByType($types: [String!]) { outboxStatusByType(types: $types) { type pending failed published } }
`;

export const ProcessOutbox = gql`
  mutation ProcessOutbox($limit: Int, $type: String, $status: String) { processOutbox(limit: $limit, type: $type, status: $status) }
`;

export const RetryFailed = gql`
  mutation RetryFailed($limit: Int, $type: String) { retryOutboxFailed(limit: $limit, type: $type) }
`;

