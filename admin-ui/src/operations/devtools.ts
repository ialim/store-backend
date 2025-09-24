import { gql } from '@apollo/client';

export const DevCounts = gql`
  query DevCounts {
    devCounts {
      invoiceImports
      purchaseOrders
      orphanVariants
    }
  }
`;

export const DevPurgeInvoiceImports = gql`
  mutation DevPurgeInvoiceImports($filter: DevPurgeFilter) {
    devPurgeInvoiceImports(filter: $filter)
  }
`;

export const DevPurgePurchaseOrders = gql`
  mutation DevPurgePurchaseOrders($filter: DevPurgeFilter) {
    devPurgePurchaseOrders(filter: $filter)
  }
`;

export const DevPurgeOrphanVariants = gql`
  mutation DevPurgeOrphanVariants($filter: DevPurgeFilter) {
    devPurgeOrphanVariants(filter: $filter)
  }
`;

export const DevPurgeProducts = gql`
  mutation DevPurgeProducts($filter: DevPurgeFilter) {
    devPurgeProducts(filter: $filter)
  }
`;
