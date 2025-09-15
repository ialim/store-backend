import { gql } from '@apollo/client';

export const LowStock = gql`
  query LowStock($storeId: String, $limit: Int) {
    lowStockCandidates(storeId: $storeId, limit: $limit) {
      storeId storeName productVariantId productId productName size concentration packaging barcode
      quantity reorderPoint reorderQty supplierId supplierName supplierDefaultCost supplierLeadTimeDays supplierIsPreferred supplierCount
    }
  }
`;

export const RunScan = gql`mutation RunScan { runLowStockScanNow }`;
export const CreateLowStockReq = gql`mutation CreateLowStockReq($storeId: String!, $requestedById: String!) { createRequisitionFromLowStock(input: { storeId: $storeId, requestedById: $requestedById }) }`;
export const CreateAndIssuePreferred = gql`mutation CreateAndIssuePreferred($storeId: String!, $requestedById: String!) { createLowStockRequisitionAndIssuePreferred(input: { storeId: $storeId, requestedById: $requestedById }) }`;

