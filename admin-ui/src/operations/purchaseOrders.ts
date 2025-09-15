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
      supplier { id name }
      items {
        productVariantId
        quantity
        unitCost
        productVariant { id name barcode size concentration packaging product { name } }
      }
    }
    purchaseOrderReceiptProgress(purchaseOrderId: $id) {
      productVariantId
      orderedQty
      receivedQty
    }
  }
`;

export const ReceiveStock = gql`
  mutation ReceiveStock($input: ReceiveStockBatchInput!) { receiveStockBatch(input: $input) { id storeId } }
`;

