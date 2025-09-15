import { gql } from '@apollo/client';

// Documents for GraphQL Codegen; hooks are consumed from src/generated/graphql
export const SupplierPaymentsByPO = gql`
  query SupplierPaymentsByPO($purchaseOrderId: String!) {
    supplierPaymentsByPO(purchaseOrderId: $purchaseOrderId) { id amount paymentDate method notes }
    purchaseOrder(id: $purchaseOrderId) { id totalAmount supplier { id name } createdAt }
  }
`;

export const CreateSupplierPayment = gql`
  mutation CreateSupplierPayment($input: CreateSupplierPaymentInput!) {
    createSupplierPayment(input: $input) { id amount paymentDate method }
  }
`;

