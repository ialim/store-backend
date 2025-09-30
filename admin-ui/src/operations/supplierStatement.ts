import { gql } from '@apollo/client';

export const SupplierStatementData = gql`
  query SupplierStatementData($supplierId: String!) {
    purchaseOrdersBySupplier(supplierId: $supplierId) { id totalAmount createdAt }
    supplierPaymentsBySupplier(supplierId: $supplierId) { id amount paymentDate method }
  }
`;

export const SupplierAgingData = gql`
  query SupplierAgingData($supplierId: String!) {
    purchaseOrdersBySupplier(supplierId: $supplierId) {
      id
      totalAmount
      createdAt
      dueDate
      payments { id amount }
    }
  }
`;
