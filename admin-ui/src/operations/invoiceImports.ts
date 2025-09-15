import { gql } from '@apollo/client';

// Documents for GraphQL Codegen; hooks are consumed from src/generated/graphql
export const InvoiceImports = gql`
  query InvoiceImports {
    invoiceImports { id url supplierName storeId status createdAt }
  }
`;

export const CreateInvoiceImport = gql`
  mutation CreateInvoiceImport($input: CreateInvoiceImportInput!) {
    adminCreateInvoiceImport(input: $input) { id }
  }
`;

