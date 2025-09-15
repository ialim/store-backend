import { gql } from '@apollo/client';

export const InvoiceImport = gql`
  query InvoiceImport($id: String!) {
    invoiceImport(id: $id) {
      id
      url
      supplierName
      storeId
      status
      message
      createdAt
      parsed
    }
  }
`;

export const StoresForImportDetail = gql`
  query StoresForImportDetail { listStores(take: 200) { id name } }
`;

export const ApproveInvoiceImport = gql`
  mutation ApproveInvoiceImport($input: ApproveInvoiceImportInput!) {
    adminApproveInvoiceImport(input: $input) {
      purchaseOrderId
      invoiceImport { id status message }
    }
  }
`;

export const ReprocessInvoiceImport = gql`
  mutation ReprocessInvoiceImport($id: String!) { adminReprocessInvoiceImport(id: $id) { id status message parsed } }
`;

export const UpdateInvoiceImport = gql`
  mutation UpdateInvoiceImport($input: UpdateInvoiceImportInput!) { adminUpdateInvoiceImport(input: $input) { id url supplierName storeId parsed } }
`;

