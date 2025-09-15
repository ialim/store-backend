import { gql } from '@apollo/client';

export const RfqDashboard = gql`
  query RfqDashboard($id: String!) {
    rfqDashboard(requisitionId: $id) {
      draft
      submitted
      selected
      rejected
      total
      pendingQuotes { id requisitionId supplierId status validUntil createdAt }
    }
    purchaseRequisitionSummary(id: $id) { id status createdAt }
  }
`;

export const QuotesByReq = gql`
  query QuotesByReq($id: String!) {
    supplierQuotesByRequisition(requisitionId: $id) {
      id
      requisitionId
      supplierId
      status
      validUntil
      createdAt
    }
  }
`;

export const IssueRFQPreferred = gql`
  mutation IssueRFQPreferred($id: String!) { issueRFQPreferred(requisitionId: $id) }
`;

export const SelectSupplierQuote = gql`
  mutation SelectSupplierQuote($quoteId: String!, $exclusive: Boolean) {
    selectSupplierQuote(input: { quoteId: $quoteId, exclusive: $exclusive })
  }
`;

export const RejectSupplierQuote = gql`
  mutation RejectSupplierQuote($quoteId: String!, $reason: String) {
    rejectSupplierQuote(input: { quoteId: $quoteId, reason: $reason })
  }
`;

export const SubmitPurchaseRequisition = gql`
  mutation SubmitPurchaseRequisition($id: String!) { submitPurchaseRequisition(input: { id: $id }) }
`;

export const ApprovePurchaseRequisition = gql`
  mutation ApprovePurchaseRequisition($id: String!) { approvePurchaseRequisition(input: { id: $id }) }
`;

export const RejectPurchaseRequisition = gql`
  mutation RejectPurchaseRequisition($id: String!, $reason: String) { rejectPurchaseRequisition(input: { id: $id, reason: $reason }) }
`;

// Listing + counts
export const RequisitionsByStatus = gql`
  query RequisitionsByStatus($status: String!, $storeId: String, $take: Int, $skip: Int) {
    requisitionsByStatus(status: $status, storeId: $storeId, take: $take, skip: $skip) { id storeId requestedById status createdAt }
  }
`;
export const RequisitionsCountByStatus = gql`
  query RequisitionsCountByStatus($status: String!, $storeId: String) { requisitionsCountByStatus(status: $status, storeId: $storeId) }
`;
export const RequisitionsByStore = gql`
  query RequisitionsByStore($storeId: String!, $status: String, $take: Int, $skip: Int) {
    requisitionsByStore(storeId: $storeId, status: $status, take: $take, skip: $skip) { id storeId requestedById status createdAt }
  }
`;
export const RequisitionsCountByStore = gql`
  query RequisitionsCountByStore($storeId: String!, $status: String) { requisitionsCountByStore(storeId: $storeId, status: $status) }
`;
