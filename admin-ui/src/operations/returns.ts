import { gql } from '@apollo/client';

export const SalesReturnsByStore = gql`
  query SalesReturnsByStore($storeId: String!) { salesReturnsByStore(storeId: $storeId) { id status createdAt consumerSaleId resellerSaleId } }
`;

export const PurchaseReturnsBySupplier = gql`
  query PurchaseReturnsBySupplier($supplierId: String!) {
    purchaseReturnsBySupplier(supplierId: $supplierId) {
      id
      status
      createdAt
      supplierId
    }
  }
`;

export const UpdateSalesReturn = gql`mutation UpdateSalesReturn($input: UpdateSalesReturnStatusInput!) { updateSalesReturnStatus(input: $input) }`;
export const FulfillPurchaseReturn = gql`mutation FulfillPurchaseReturn($input: FulfillPurchaseReturnInput!) { fulfillPurchaseReturn(input: $input) }`;
