import { gql } from '@apollo/client';

export const PurchaseOrder = gql`
  query PurchaseOrder($id: String!) {
    purchaseOrder(id: $id) {
      id
      supplierId
      status
      phase
      totalAmount
      createdAt
      invoiceNumber
      supplier { id name }
      items {
        productVariantId
        quantity
        unitCost
        productVariant { id name barcode product { name } }
      }
    }
    purchaseOrderReceiptProgress(purchaseOrderId: $id) {
      productVariantId
      orderedQty
      receivedQty
    }
  }
`;

export const PurchaseOrders = gql`
  query PurchaseOrders($take: Int, $skip: Int) {
    purchaseOrders(take: $take, skip: $skip) {
      id
      invoiceNumber
      status
      phase
      createdAt
      supplier { id name }
    }
  }
`;

export const PurchaseOrdersByStatus = gql`
  query PurchaseOrdersByStatus($status: String!, $take: Int, $skip: Int) {
    purchaseOrdersByStatus(status: $status, take: $take, skip: $skip) {
      id
      invoiceNumber
      status
      phase
      createdAt
      supplier { id name }
    }
  }
`;

export const PurchaseOrdersByPhase = gql`
  query PurchaseOrdersByPhase($phase: String!, $take: Int, $skip: Int) {
    purchaseOrdersByPhase(phase: $phase, take: $take, skip: $skip) {
      id
      invoiceNumber
      status
      phase
      createdAt
      supplier { id name }
    }
  }
`;

export const PurchaseOrdersCount = gql`
  query PurchaseOrdersCount($status: String, $phase: String) {
    purchaseOrdersCount(status: $status, phase: $phase)
  }
`;

export const PurchaseOrdersSearch = gql`
  query PurchaseOrdersSearch($q: String!, $take: Int, $skip: Int) {
    purchaseOrdersSearch(q: $q, take: $take, skip: $skip) {
      id
      invoiceNumber
      status
      phase
      createdAt
      supplier { id name }
    }
  }
`;

export const PurchaseOrdersSearchCount = gql`
  query PurchaseOrdersSearchCount($q: String!) {
    purchaseOrdersSearchCount(q: $q)
  }
`;

export const UpdatePoStatus = gql`
  mutation UpdatePoStatus($input: UpdatePurchaseOrderStatusInput!) {
    updatePurchaseOrderStatus(input: $input) {
      id
      status
    }
  }
`;

export const ReceiveStock = gql`
  mutation ReceiveStock($input: ReceiveStockBatchInput!) {
    receiveStockBatch(input: $input) { id storeId }
  }
`;
