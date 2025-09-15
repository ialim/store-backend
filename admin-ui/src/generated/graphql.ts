// Temporary generated hooks until GraphQL Codegen is wired in CI.
// These mirror the operation names used throughout the app.
// Replace this file with real codegen output when running `npm run codegen`.

import { gql, useQuery, useLazyQuery, useMutation } from '@apollo/client';

// Variants list
export const VariantsDocument = gql`
  query Variants($take: Int, $skip: Int, $where: ProductVariantWhereInput) {
    listProductVariants(take: $take, skip: $skip, where: $where) {
      id
      name
      size
      concentration
      packaging
      barcode
      price
      resellerPrice
      createdAt
      product {
        id
        name
      }
    }
  }
`;
export function useVariantsQuery(options: any) {
  return useQuery(VariantsDocument, options);
}

// Product detail
export const ProductDocument = gql`
  query Product($id: String!) {
    findUniqueProduct(where: { id: $id }) {
      id
      name
      description
      barcode
      createdAt
      variants {
        id
        size
        concentration
        packaging
        barcode
        price
        resellerPrice
        createdAt
        stockItems {
          quantity
          reserved
          store {
            id
            name
          }
        }
      }
    }
  }
`;
export function useProductQuery(options: any) {
  return useQuery(ProductDocument, options);
}

// Requisition RFQ dashboard
export const RfqDashboardDocument = gql`
  query RfqDashboard($id: String!) {
    rfqDashboard(requisitionId: $id) {
      draft
      submitted
      selected
      rejected
      total
      pendingQuotes {
        id
        requisitionId
        supplierId
        status
        validUntil
        createdAt
      }
    }
    purchaseRequisitionSummary(id: $id) {
      id
      status
      createdAt
    }
  }
`;
export function useRfqDashboardQuery(options: any) {
  return useQuery(RfqDashboardDocument, options);
}

// Quotes by requisition
export const QuotesByReqDocument = gql`
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
export function useQuotesByReqQuery(options: any) {
  return useQuery(QuotesByReqDocument, options);
}

// Purchase Orders lists + counts
export const PurchaseOrdersDocument = gql`
  query PurchaseOrders($take: Int, $skip: Int) {
    purchaseOrders(take: $take, skip: $skip) {
      id
      invoiceNumber
      status
      phase
      createdAt
      supplier {
        id
        name
      }
    }
  }
`;
export function usePurchaseOrdersQuery(options: any) {
  return useQuery(PurchaseOrdersDocument, options);
}

export const PurchaseOrdersByStatusDocument = gql`
  query PurchaseOrdersByStatus($status: String!, $take: Int, $skip: Int) {
    purchaseOrdersByStatus(status: $status, take: $take, skip: $skip) {
      id
      invoiceNumber
      status
      phase
      createdAt
      supplier {
        id
        name
      }
    }
  }
`;
export function usePurchaseOrdersByStatusLazyQuery(options?: any) {
  return useLazyQuery(PurchaseOrdersByStatusDocument, options);
}

export const PurchaseOrdersByPhaseDocument = gql`
  query PurchaseOrdersByPhase($phase: String!, $take: Int, $skip: Int) {
    purchaseOrdersByPhase(phase: $phase, take: $take, skip: $skip) {
      id
      invoiceNumber
      status
      phase
      createdAt
      supplier {
        id
        name
      }
    }
  }
`;
export function usePurchaseOrdersByPhaseLazyQuery(options?: any) {
  return useLazyQuery(PurchaseOrdersByPhaseDocument, options);
}

export const PurchaseOrdersCountDocument = gql`
  query PurchaseOrdersCount($status: String, $phase: String) {
    purchaseOrdersCount(status: $status, phase: $phase)
  }
`;
export function usePurchaseOrdersCountQuery(options: any) {
  return useQuery(PurchaseOrdersCountDocument, options);
}

export const PurchaseOrdersSearchDocument = gql`
  query PurchaseOrdersSearch($q: String!, $take: Int, $skip: Int) {
    purchaseOrdersSearch(q: $q, take: $take, skip: $skip) {
      id
      invoiceNumber
      status
      phase
      createdAt
      supplier {
        id
        name
      }
    }
  }
`;
export function usePurchaseOrdersSearchLazyQuery(options?: any) {
  return useLazyQuery(PurchaseOrdersSearchDocument, options);
}

export const PurchaseOrdersSearchCountDocument = gql`
  query PurchaseOrdersSearchCount($q: String!) {
    purchaseOrdersSearchCount(q: $q)
  }
`;
export function usePurchaseOrdersSearchCountLazyQuery(options?: any) {
  return useLazyQuery(PurchaseOrdersSearchCountDocument, options);
}

// Mutations (temporary typed hooks)
export const UpdatePoStatusDocument = gql`
  mutation UpdatePOStatus($input: UpdatePurchaseOrderStatusInput!) {
    updatePurchaseOrderStatus(input: $input) {
      id
      status
      phase
    }
  }
`;
export function useUpdatePoStatusMutation(options?: any) {
  return useMutation(UpdatePoStatusDocument, options);
}

export const IssueRfqPreferredDocument = gql`
  mutation IssueRFQPreferred($id: String!) {
    issueRFQPreferred(requisitionId: $id)
  }
`;
export function useIssueRfqPreferredMutation(options?: any) {
  return useMutation(IssueRfqPreferredDocument, options);
}

export const SelectSupplierQuoteDocument = gql`
  mutation SelectSupplierQuote($quoteId: String!, $exclusive: Boolean) {
    selectSupplierQuote(input: { quoteId: $quoteId, exclusive: $exclusive })
  }
`;
export function useSelectSupplierQuoteMutation(options?: any) {
  return useMutation(SelectSupplierQuoteDocument, options);
}

export const RejectSupplierQuoteDocument = gql`
  mutation RejectSupplierQuote($quoteId: String!, $reason: String) {
    rejectSupplierQuote(input: { quoteId: $quoteId, reason: $reason })
  }
`;
export function useRejectSupplierQuoteMutation(options?: any) {
  return useMutation(RejectSupplierQuoteDocument, options);
}

export const SubmitPurchaseRequisitionDocument = gql`
  mutation SubmitPurchaseRequisition($id: String!) {
    submitPurchaseRequisition(input: { id: $id })
  }
`;
export function useSubmitPurchaseRequisitionMutation(options?: any) {
  return useMutation(SubmitPurchaseRequisitionDocument, options);
}

export const ApprovePurchaseRequisitionDocument = gql`
  mutation ApprovePurchaseRequisition($id: String!) {
    approvePurchaseRequisition(input: { id: $id })
  }
`;
export function useApprovePurchaseRequisitionMutation(options?: any) {
  return useMutation(ApprovePurchaseRequisitionDocument, options);
}

export const RejectPurchaseRequisitionDocument = gql`
  mutation RejectPurchaseRequisition($id: String!, $reason: String) {
    rejectPurchaseRequisition(input: { id: $id, reason: $reason })
  }
`;
export function useRejectPurchaseRequisitionMutation(options?: any) {
  return useMutation(RejectPurchaseRequisitionDocument, options);
}

// Invoice Imports list and create
export const InvoiceImportsDocument = gql`
  query InvoiceImports {
    invoiceImports {
      id
      url
      supplierName
      storeId
      status
      createdAt
    }
  }
`;
export function useInvoiceImportsQuery(options: any) {
  return useQuery(InvoiceImportsDocument, options);
}

export const CreateInvoiceImportDocument = gql`
  mutation CreateInvoiceImport($input: CreateInvoiceImportInput!) {
    adminCreateInvoiceImport(input: $input) {
      id
    }
  }
`;
export function useCreateInvoiceImportMutation(options?: any) {
  return useMutation(CreateInvoiceImportDocument, options);
}

export const AdminProcessInvoiceUrlDocument = gql`
  mutation AdminProcessInvoiceUrl($input: ProcessInvoiceUrlInput!) {
    adminProcessInvoiceUrl(input: $input) {
      status
      supplierId
      supplierName
      invoiceNumber
      purchaseOrderId
      totalAmount
      message
      lines { description qty unitPrice discountPct discountedUnitPrice lineTotal variantId }
    }
  }
`;
export function useAdminProcessInvoiceUrlMutation(options?: any) { return useMutation(AdminProcessInvoiceUrlDocument, options); }

// Supplier payments by PO and create
export const SupplierPaymentsByPoDocument = gql`
  query SupplierPaymentsByPO($purchaseOrderId: String!) {
    supplierPaymentsByPO(purchaseOrderId: $purchaseOrderId) {
      id
      amount
      paymentDate
      method
      notes
    }
    purchaseOrder(id: $purchaseOrderId) {
      id
      totalAmount
      supplier {
        id
        name
      }
      createdAt
    }
  }
`;
export function useSupplierPaymentsByPoQuery(options: any) {
  return useQuery(SupplierPaymentsByPoDocument, options);
}

export const CreateSupplierPaymentDocument = gql`
  mutation CreateSupplierPayment($input: CreateSupplierPaymentInput!) {
    createSupplierPayment(input: $input) {
      id
      amount
      paymentDate
      method
    }
  }
`;
export function useCreateSupplierPaymentMutation(options?: any) {
  return useMutation(CreateSupplierPaymentDocument, options);
}

// Invoice Import Detail
export const InvoiceImportDocument = gql`
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
export function useInvoiceImportQuery(options: any) {
  return useQuery(InvoiceImportDocument, options);
}

export const StoresForImportDetailDocument = gql`
  query StoresForImportDetail {
    listStores(take: 200) {
      id
      name
    }
  }
`;
export function useStoresForImportDetailQuery(options?: any) {
  return useQuery(StoresForImportDetailDocument, options);
}

export const ApproveInvoiceImportDocument = gql`
  mutation ApproveInvoiceImport($input: ApproveInvoiceImportInput!) {
    adminApproveInvoiceImport(input: $input) {
      purchaseOrderId
      invoiceImport {
        id
        status
        message
      }
    }
  }
`;
export function useApproveInvoiceImportMutation(options?: any) {
  return useMutation(ApproveInvoiceImportDocument, options);
}

export const ReprocessInvoiceImportDocument = gql`
  mutation ReprocessInvoiceImport($id: String!) {
    adminReprocessInvoiceImport(id: $id) {
      id
      status
      message
      parsed
    }
  }
`;
export function useReprocessInvoiceImportMutation(options?: any) {
  return useMutation(ReprocessInvoiceImportDocument, options);
}

export const UpdateInvoiceImportDocument = gql`
  mutation UpdateInvoiceImport($input: UpdateInvoiceImportInput!) {
    adminUpdateInvoiceImport(input: $input) {
      id
      url
      supplierName
      storeId
      parsed
    }
  }
`;
export function useUpdateInvoiceImportMutation(options?: any) {
  return useMutation(UpdateInvoiceImportDocument, options);
}

// Outbox
export const OutboxStatusDocument = gql`
  query OutboxStatus {
    outboxStatus { pending failed published }
  }
`;
export function useOutboxStatusQuery(options?: any) { return useQuery(OutboxStatusDocument, options); }

export const LastFailedOutboxEventsDocument = gql`
  query LastFailed($limit: Int) {
    lastFailedOutboxEvents(limit: $limit) { id type lastError createdAt }
  }
`;
export function useLastFailedOutboxEventsQuery(options?: any) { return useQuery(LastFailedOutboxEventsDocument, options); }

export const OutboxStatusByTypeDocument = gql`
  query StatusByType($types: [String!]) { outboxStatusByType(types: $types) { type pending failed published } }
`;
export function useOutboxStatusByTypeQuery(options?: any) { return useQuery(OutboxStatusByTypeDocument, options); }

export const ProcessOutboxDocument = gql`
  mutation ProcessOutbox($limit: Int, $type: String, $status: String) { processOutbox(limit: $limit, type: $type, status: $status) }
`;
export function useProcessOutboxMutation(options?: any) { return useMutation(ProcessOutboxDocument, options); }

export const RetryOutboxFailedDocument = gql`
  mutation RetryFailed($limit: Int, $type: String) { retryOutboxFailed(limit: $limit, type: $type) }
`;
export function useRetryOutboxFailedMutation(options?: any) { return useMutation(RetryOutboxFailedDocument, options); }

// Payments
export const StoresForPaymentsDocument = gql`
  query StoresForPayments { listStores(take: 200) { id name } }
`;
export function useStoresForPaymentsQuery(options?: any) { return useQuery(StoresForPaymentsDocument, options); }

export const StorePaymentsSummaryDocument = gql`
  query StorePaymentsSummary($storeId: String!, $month: String) {
    storePaymentsSummary(storeId: $storeId, month: $month) { storeId month consumerPaid resellerPaid totalPaid }
  }
`;
export function useStorePaymentsSummaryQuery(options?: any) { return useQuery(StorePaymentsSummaryDocument, options); }

export const DailyPaymentsSeriesDocument = gql`
  query DailyPaymentsSeries($month: String, $storeId: String) {
    dailyPaymentsSeries(month: $month, storeId: $storeId) { date consumerPaid resellerPaid totalPaid }
  }
`;
export function useDailyPaymentsSeriesQuery(options?: any) { return useQuery(DailyPaymentsSeriesDocument, options); }

export const StorePaymentsSummaryRangeDocument = gql`
  query StorePaymentsSummaryRange($storeId: String!, $start: DateTime!, $end: DateTime!) {
    storePaymentsSummaryRange(storeId: $storeId, start: $start, end: $end) { storeId month consumerPaid resellerPaid totalPaid }
  }
`;
export function useStorePaymentsSummaryRangeQuery(options?: any) { return useQuery(StorePaymentsSummaryRangeDocument, options); }

export const DailyPaymentsSeriesRangeDocument = gql`
  query DailyPaymentsSeriesRange($start: DateTime!, $end: DateTime!, $storeId: String) {
    dailyPaymentsSeriesRange(start: $start, end: $end, storeId: $storeId) { date consumerPaid resellerPaid totalPaid }
  }
`;
export function useDailyPaymentsSeriesRangeQuery(options?: any) { return useQuery(DailyPaymentsSeriesRangeDocument, options); }

// Products list + create
export const ProductsDocument = gql`
  query Products($take: Int, $where: ProductWhereInput) { listProducts(take: $take, where: $where) { id name barcode } }
`;
export function useProductsQuery(options?: any) { return useQuery(ProductsDocument, options); }

export const CreateProductDocument = gql`
  mutation CreateProduct($data: ProductCreateInput!) { createProduct(data: $data) { id } }
`;
export function useCreateProductMutation(options?: any) { return useMutation(CreateProductDocument, options); }

// Users
export const UsersDocument = gql`
  query Users($take: Int) {
    listUsers(take: $take) { id email role { name } customerProfile { fullName } resellerProfile { tier } }
  }
`;
export function useUsersQuery(options?: any) { return useQuery(UsersDocument, options); }

// Customers
export const CustomersDocument = gql`
  query Customers($take: Int, $where: UserWhereInput) {
    listUsers(take: $take, where: $where) {
      id
      email
      customerProfile { fullName email phone profileStatus preferredStore { id name } }
    }
  }
`;
export function useCustomersQuery(options?: any) { return useQuery(CustomersDocument, options); }

export const StoresForCustomersDocument = gql`
  query StoresForCustomers { listStores(take: 200) { id name } }
`;
export function useStoresForCustomersQuery(options?: any) { return useQuery(StoresForCustomersDocument, options); }

export const AdminUpdateCustomerProfileDocument = gql`
  mutation AdminUpdateCustomerProfile($userId: String!, $input: AdminUpdateCustomerProfileInput!) { adminUpdateCustomerProfile(userId: $userId, input: $input) { userId profileStatus } }
`;
export function useAdminUpdateCustomerProfileMutation(options?: any) { return useMutation(AdminUpdateCustomerProfileDocument, options); }

export const AdminCreateCustomerDocument = gql`
  mutation AdminCreateCustomer($input: AdminCreateCustomerInput!) { adminCreateCustomer(input: $input) { id email customerProfile { fullName } } }
`;
export function useAdminCreateCustomerMutation(options?: any) { return useMutation(AdminCreateCustomerDocument, options); }

// Returns
export const SalesReturnsByStoreDocument = gql`
  query SalesReturnsByStore($storeId: String!) { salesReturnsByStore(storeId: $storeId) { id status createdAt consumerSaleId resellerSaleId } }
`;
export function useSalesReturnsByStoreLazyQuery(options?: any) { return useLazyQuery(SalesReturnsByStoreDocument, options); }

export const PurchaseReturnsBySupplierDocument = gql`
  query PurchaseReturnsBySupplier($supplierId: String!) { purchaseReturnsBySupplier(supplierId: $supplierId) { id status createdAt purchaseOrderId supplierId } }
`;
export function usePurchaseReturnsBySupplierLazyQuery(options?: any) { return useLazyQuery(PurchaseReturnsBySupplierDocument, options); }

export const UpdateSalesReturnStatusDocument = gql`
  mutation UpdateSalesReturn($input: UpdateSalesReturnStatusInput!) { updateSalesReturnStatus(input: $input) }
`;
export function useUpdateSalesReturnStatusMutation(options?: any) { return useMutation(UpdateSalesReturnStatusDocument, options); }

export const FulfillPurchaseReturnDocument = gql`
  mutation FulfillPurchaseReturn($input: FulfillPurchaseReturnInput!) { fulfillPurchaseReturn(input: $input) }
`;
export function useFulfillPurchaseReturnMutation(options?: any) { return useMutation(FulfillPurchaseReturnDocument, options); }

// Purchase Order detail + receive stock
export const PurchaseOrderDocument = gql`
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
export function usePurchaseOrderQuery(options: any) { return useQuery(PurchaseOrderDocument, options); }
export function usePurchaseOrderLazyQuery(options?: any) { return useLazyQuery(PurchaseOrderDocument, options); }

export const ReceiveStockBatchDocument = gql`
  mutation ReceiveStock($input: ReceiveStockBatchInput!) { receiveStockBatch(input: $input) { id storeId } }
`;
export function useReceiveStockBatchMutation(options?: any) { return useMutation(ReceiveStockBatchDocument, options); }

// Requisitions list + counts
export const RequisitionsByStatusDocument = gql`
  query RequisitionsByStatus($status: String!, $storeId: String, $take: Int, $skip: Int) {
    requisitionsByStatus(status: $status, storeId: $storeId, take: $take, skip: $skip) { id storeId requestedById status createdAt }
  }
`;
export function useRequisitionsByStatusQuery(options: any) { return useQuery(RequisitionsByStatusDocument, options); }

export const RequisitionsCountByStatusDocument = gql`
  query RequisitionsCountByStatus($status: String!, $storeId: String) { requisitionsCountByStatus(status: $status, storeId: $storeId) }
`;
export function useRequisitionsCountByStatusQuery(options: any) { return useQuery(RequisitionsCountByStatusDocument, options); }

export const RequisitionsByStoreDocument = gql`
  query RequisitionsByStore($storeId: String!, $status: String, $take: Int, $skip: Int) {
    requisitionsByStore(storeId: $storeId, status: $status, take: $take, skip: $skip) { id storeId requestedById status createdAt }
  }
`;
export function useRequisitionsByStoreQuery(options: any) { return useQuery(RequisitionsByStoreDocument, options); }

export const RequisitionsCountByStoreDocument = gql`
  query RequisitionsCountByStore($storeId: String!, $status: String) { requisitionsCountByStore(storeId: $storeId, status: $status) }
`;
export function useRequisitionsCountByStoreQuery(options: any) { return useQuery(RequisitionsCountByStoreDocument, options); }

// Reseller approvals
export const PendingResellerApplicationsDocument = gql`
  query PendingResellerApplications($take: Int, $skip: Int, $q: String) {
    pendingResellerApplications(take: $take, skip: $skip, q: $q) {
      userId
      tier
      creditLimit
      requestedAt
      requestedBillerId
      biller { id email }
      requestedBiller { id email }
      user { id email }
    }
  }
`;
export function usePendingResellerApplicationsQuery(options?: any) { return useQuery(PendingResellerApplicationsDocument, options); }

export const ListBillersDocument = gql`
  query ListBillers { listBillers { id email } }
`;
export function useListBillersQuery(options?: any) { return useQuery(ListBillersDocument, options); }

export const ApproveResellerDocument = gql`
  mutation ApproveReseller($resellerId: String!, $input: ApproveResellerInput!) {
    approveReseller(resellerId: $resellerId, input: $input) { userId profileStatus biller { id email } }
  }
`;
export function useApproveResellerMutation(options?: any) { return useMutation(ApproveResellerDocument, options); }

export const ActivateResellerDocument = gql`
  mutation ActivateReseller($resellerId: String!, $billerId: String) { activateReseller(resellerId: $resellerId, billerId: $billerId) { userId profileStatus biller { id email } } }
`;
export function useActivateResellerMutation(options?: any) { return useMutation(ActivateResellerDocument, options); }

export const RejectResellerDocument = gql`
  mutation RejectReseller($resellerId: String!, $reason: String) { rejectReseller(resellerId: $resellerId, reason: $reason) { userId profileStatus rejectionReason } }
`;
export function useRejectResellerMutation(options?: any) { return useMutation(RejectResellerDocument, options); }

// Resellers list
export const ResellersDocument = gql`
  query Resellers($status: String, $take: Int, $q: String) {
    resellers(status: $status, take: $take, q: $q) {
      userId
      profileStatus
      tier
      creditLimit
      requestedAt
      user { id email }
      biller { id email }
      requestedBiller { id email }
    }
  }
`;
export function useResellersQuery(options?: any) { return useQuery(ResellersDocument, options); }

// Stores
export const StoresDocument = gql`
  query Stores($take: Int, $where: StoreWhereInput) { listStores(take: $take, where: $where) { id name location isMain manager { id email } } }
`;
export function useStoresQuery(options?: any) { return useQuery(StoresDocument, options); }

export const StoresWithInvalidManagersDocument = gql`
  query StoresWithInvalidManagers { storesWithInvalidManagers { id name managerId managerEmail validManager } }
`;
export function useStoresWithInvalidManagersLazyQuery(options?: any) { return useLazyQuery(StoresWithInvalidManagersDocument, options); }

export const ListManagersDocument = gql`
  query ListManagers { listManagers { id email customerProfile { fullName } } }
`;
export function useListManagersQuery(options?: any) { return useQuery(ListManagersDocument, options); }

export const AssignStoreManagerDocument = gql`
  mutation AssignStoreManager($storeId: String!, $managerId: String!) { assignStoreManager(storeId: $storeId, managerId: $managerId) }
`;
export function useAssignStoreManagerMutation(options?: any) { return useMutation(AssignStoreManagerDocument, options); }

export const BulkAssignStoreManagerDocument = gql`
  mutation BulkAssignStoreManager($storeIds: [String!]!, $managerId: String!) { bulkAssignStoreManager(storeIds: $storeIds, managerId: $managerId) }
`;
export function useBulkAssignStoreManagerMutation(options?: any) { return useMutation(BulkAssignStoreManagerDocument, options); }

// Supplier Statement
export const SupplierStatementDataDocument = gql`
  query SupplierStatementData($supplierId: String!) {
    purchaseOrdersBySupplier(supplierId: $supplierId) { id totalAmount createdAt }
    supplierPaymentsBySupplier(supplierId: $supplierId) { id amount paymentDate method }
  }
`;
export function useSupplierStatementDataLazyQuery(options?: any) { return useLazyQuery(SupplierStatementDataDocument, options); }

// Facets and Variant Facets
export const ListFacetsDocument = gql`
  query ListFacets { listFacets { id name code values isPrivate } }
`;
export function useListFacetsQuery(options?: any) { return useQuery(ListFacetsDocument, options); }

export const VariantFacetsDocument = gql`
  query VariantFacets($productVariantId: String!) {
    variantFacets(productVariantId: $productVariantId) { facet { id name code values isPrivate } value }
  }
`;
export function useVariantFacetsQuery(options: any) { return useQuery(VariantFacetsDocument, options); }

export const AssignFacetToVariantDocument = gql`
  mutation AssignFacetToVariant($productVariantId: String!, $facetId: String!, $value: String!) { assignFacetToVariant(productVariantId: $productVariantId, facetId: $facetId, value: $value) }
`;
export function useAssignFacetToVariantMutation(options?: any) { return useMutation(AssignFacetToVariantDocument, options); }

export const RemoveFacetFromVariantDocument = gql`
  mutation RemoveFacetFromVariant($productVariantId: String!, $facetId: String!, $value: String!) { removeFacetFromVariant(productVariantId: $productVariantId, facetId: $facetId, value: $value) }
`;
export function useRemoveFacetFromVariantMutation(options?: any) { return useMutation(RemoveFacetFromVariantDocument, options); }

export const ProductVariantsCountDocument = gql`
  query VariantsCount($where: ProductVariantWhereInput) { productVariantsCount(where: $where) }
`;
export function useProductVariantsCountQuery(options?: any) { return useQuery(ProductVariantsCountDocument, options); }

// Variant detail
export const VariantDocument = gql`
  query Variant($id: String!) {
    findUniqueProductVariant(where: { id: $id }) {
      id
      name
      barcode
      size
      concentration
      packaging
      price
      resellerPrice
      createdAt
      product { id name }
    }
  }
`;
export function useVariantQuery(options: any) { return useQuery(VariantDocument, options); }

// Bulk facet assignment
export const BulkAssignFacetToVariantsDocument = gql`
  mutation BulkAssignFacetToVariants($variantIds: [String!]!, $facetId: String!, $value: String!) {
    bulkAssignFacetToVariants(variantIds: $variantIds, facetId: $facetId, value: $value)
  }
`;
export function useBulkAssignFacetToVariantsMutation(options?: any) { return useMutation(BulkAssignFacetToVariantsDocument, options); }

export const BulkAssignFacetToProductsDocument = gql`
  mutation BulkAssignFacetToProducts($productIds: [String!]!, $facetId: String!, $value: String!) {
    bulkAssignFacetToProducts(productIds: $productIds, facetId: $facetId, value: $value)
  }
`;
export function useBulkAssignFacetToProductsMutation(options?: any) { return useMutation(BulkAssignFacetToProductsDocument, options); }

// Bulk facet removal
export const BulkRemoveFacetFromVariantsDocument = gql`
  mutation BulkRemoveFacetFromVariants($variantIds: [String!]!, $facetId: String!, $value: String!) {
    bulkRemoveFacetFromVariants(variantIds: $variantIds, facetId: $facetId, value: $value)
  }
`;
export function useBulkRemoveFacetFromVariantsMutation(options?: any) { return useMutation(BulkRemoveFacetFromVariantsDocument, options); }

export const BulkRemoveFacetFromProductsDocument = gql`
  mutation BulkRemoveFacetFromProducts($productIds: [String!]!, $facetId: String!, $value: String!) {
    bulkRemoveFacetFromProducts(productIds: $productIds, facetId: $facetId, value: $value)
  }
`;
export function useBulkRemoveFacetFromProductsMutation(options?: any) { return useMutation(BulkRemoveFacetFromProductsDocument, options); }

// Product details: facets, variants, stock totals, mutations
export const ProductFacetsDocument = gql`
  query ProductFacets($productId: String!) {
    productFacets(productId: $productId) { facet { id name code values isPrivate } value }
  }
`;
export function useProductFacetsQuery(options: any) { return useQuery(ProductFacetsDocument, options); }

export const AssignFacetToProductDocument = gql`
  mutation AssignFacetToProduct($productId: String!, $facetId: String!, $value: String!) {
    assignFacetToProduct(productId: $productId, facetId: $facetId, value: $value)
  }
`;
export function useAssignFacetToProductMutation(options?: any) { return useMutation(AssignFacetToProductDocument, options); }

export const RemoveFacetFromProductDocument = gql`
  mutation RemoveFacetFromProduct($productId: String!, $facetId: String!, $value: String!) {
    removeFacetFromProduct(productId: $productId, facetId: $facetId, value: $value)
  }
`;
export function useRemoveFacetFromProductMutation(options?: any) { return useMutation(RemoveFacetFromProductDocument, options); }

export const CreateProductVariantDocument = gql`
  mutation CreateVariant($data: ProductVariantCreateInput!) { createProductVariant(data: $data) { id } }
`;
export function useCreateProductVariantMutation(options?: any) { return useMutation(CreateProductVariantDocument, options); }

export const UpdateProductDocument = gql`
  mutation UpdateProduct($id: String!, $data: ProductUpdateInput!) { updateProduct(where: { id: $id }, data: $data) { id } }
`;
export function useUpdateProductMutation(options?: any) { return useMutation(UpdateProductDocument, options); }

export const UpdateProductVariantDocument = gql`
  mutation UpdateVariant($id: String!, $data: ProductVariantUpdateInput!) { updateProductVariant(where: { id: $id }, data: $data) { id } }
`;
export function useUpdateProductVariantMutation(options?: any) { return useMutation(UpdateProductVariantDocument, options); }

export const DeleteProductVariantDocument = gql`
  mutation DeleteVariant($id: String!) { deleteProductVariant(where: { id: $id }) { id } }
`;
export function useDeleteProductVariantMutation(options?: any) { return useMutation(DeleteProductVariantDocument, options); }

export const StockTotalsByProductDocument = gql`
  query StockTotalsByProduct($productId: String!) {
    stockTotalsByProduct(productId: $productId) { variantId onHand reserved available }
  }
`;
export function useStockTotalsByProductQuery(options: any) { return useQuery(StockTotalsByProductDocument, options); }

export const StockTotalsByProductStoreDocument = gql`
  query StockTotalsByProductStore($productId: String!, $storeId: String!) {
    stockTotalsByProductStore(productId: $productId, storeId: $storeId) { variantId onHand reserved available }
  }
`;
export function useStockTotalsByProductStoreQuery(options: any) { return useQuery(StockTotalsByProductStoreDocument, options); }

// Staff: create staff, assign biller
export const CreateStaffDocument = gql`
  mutation CreateStaff($input: CreateStaffInput!) { createStaff(input: $input) { id email } }
`;
export function useCreateStaffMutation(options?: any) { return useMutation(CreateStaffDocument, options); }

export const AssignBillerDocument = gql`
  mutation AssignBiller($input: AssignBillerInput!) { assignBiller(input: $input) { userId billerId } }
`;
export function useAssignBillerMutation(options?: any) { return useMutation(AssignBillerDocument, options); }

// Reseller detail
export const ResellerProfileDocument = gql`
  query ResellerProfile($userId: String!) {
    resellerProfile(userId: $userId) {
      userId
      profileStatus
      tier
      creditLimit
      outstandingBalance
      requestedAt
      activatedAt
      rejectedAt
      rejectionReason
      biller { id email }
      requestedBiller { id email }
      user { id email }
    }
  }
`;
export function useResellerProfileQuery(options: any) { return useQuery(ResellerProfileDocument, options); }

// Low stock
export const LowStockCandidatesDocument = gql`
  query LowStock($storeId: String, $limit: Int) {
    lowStockCandidates(storeId: $storeId, limit: $limit) {
      storeId storeName productVariantId productId productName size concentration packaging barcode
      quantity reorderPoint reorderQty supplierId supplierName supplierDefaultCost supplierLeadTimeDays supplierIsPreferred supplierCount
    }
  }
`;
export function useLowStockCandidatesQuery(options?: any) { return useQuery(LowStockCandidatesDocument, options); }

export const RunLowStockScanNowDocument = gql`
  mutation RunScan { runLowStockScanNow }
`;
export function useRunLowStockScanNowMutation(options?: any) { return useMutation(RunLowStockScanNowDocument, options); }

export const CreateRequisitionFromLowStockDocument = gql`
  mutation CreateLowStockReq($storeId: String!, $requestedById: String!) { createRequisitionFromLowStock(input: { storeId: $storeId, requestedById: $requestedById }) }
`;
export function useCreateRequisitionFromLowStockMutation(options?: any) { return useMutation(CreateRequisitionFromLowStockDocument, options); }

export const CreateLowStockRequisitionAndIssuePreferredDocument = gql`
  mutation CreateAndIssuePreferred($storeId: String!, $requestedById: String!) { createLowStockRequisitionAndIssuePreferred(input: { storeId: $storeId, requestedById: $requestedById }) }
`;
export function useCreateLowStockRequisitionAndIssuePreferredMutation(options?: any) { return useMutation(CreateLowStockRequisitionAndIssuePreferredDocument, options); }

// Stock by variant (for inventory dialog)
export const StockByVariantDocument = gql`
  query StockByVariant($productVariantId: ID!) {
    stock(input: { productVariantId: $productVariantId }) {
      quantity
      reserved
      store { id name }
    }
  }
`;
export function useStockByVariantQuery(options: any) { return useQuery(StockByVariantDocument, options); }

// Supplier Aging
export const SupplierAgingDataDocument = gql`
  query SupplierAgingData($supplierId: String!) {
    purchaseOrdersBySupplier(supplierId: $supplierId) { id totalAmount dueDate createdAt payments { amount paymentDate } }
  }
`;
export function useSupplierAgingDataLazyQuery(options?: any) { return useLazyQuery(SupplierAgingDataDocument, options); }

// Profile: me and change password
export const MeDocument = gql`
  query Me { me { id email role { name permissions { id name module action } } } }
`;
export function useMeQuery(options?: any) { return useQuery(MeDocument, options); }

export const ChangePasswordDocument = gql`
  mutation ChangePassword($input: ChangePasswordInput!) { changePassword(input: $input) }
`;
export function useChangePasswordMutation(options?: any) { return useMutation(ChangePasswordDocument, options); }

// Suppliers list
export const SuppliersDocument = gql`
  query Suppliers { suppliers { id name contactInfo creditLimit currentBalance isFrequent } }
`;
export function useSuppliersQuery(options?: any) { return useQuery(SuppliersDocument, options); }

// Auth + onboarding flows
export const ApplyResellerDocument = gql`
  mutation ApplyReseller($input: ApplyResellerInput!) { applyReseller(input: $input) { userId profileStatus tier } }
`;
export function useApplyResellerMutation(options?: any) { return useMutation(ApplyResellerDocument, options); }

export const SignupCustomerDocument = gql`
  mutation SignupCustomer($input: CreateUserInput!) { signupCustomer(input: $input) { accessToken } }
`;
export function useSignupCustomerMutation(options?: any) { return useMutation(SignupCustomerDocument, options); }

export const LoginDocument = gql`
  mutation Login($input: LoginInput!) { login(input: $input) { accessToken } }
`;
export function useLoginMutation(options?: any) { return useMutation(LoginDocument, options); }

export const CompleteCustomerProfileDocument = gql`
  mutation CompleteCustomerProfile($input: UpdateCustomerProfileInput!) { completeCustomerProfile(input: $input) { userId profileStatus } }
`;
export function useCompleteCustomerProfileMutation(options?: any) { return useMutation(CompleteCustomerProfileDocument, options); }

// Facets management
export const ListFacetsAllDocument = gql`query { listFacets { id name code isPrivate values } }`;
export function useListFacetsAllQuery(options?: any) { return useQuery(ListFacetsAllDocument, options); }

export const CreateFacetDocument = gql`mutation($input: CreateFacetInput!) { createFacet(input: $input) { id } }`;
export function useCreateFacetMutation(options?: any) { return useMutation(CreateFacetDocument, options); }

export const UpdateFacetDocument = gql`mutation($input: UpdateFacetInput!) { updateFacet(input: $input) { id } }`;
export function useUpdateFacetMutation(options?: any) { return useMutation(UpdateFacetDocument, options); }

export const DeleteFacetDocument = gql`mutation($id: String!) { deleteFacet(id: $id) }`;
export function useDeleteFacetMutation(options?: any) { return useMutation(DeleteFacetDocument, options); }

// Analytics
export const MonthlySalesSummaryDocument = gql`
  query MonthlySalesSummary($month: String) { monthlySalesSummary(month: $month) { month totalSold totalReturned } }
`;
export function useMonthlySalesSummaryQuery(options?: any) { return useQuery(MonthlySalesSummaryDocument, options); }

export const MonthlySalesSummaryByStoreDocument = gql`
  query MonthlySalesSummaryByStore($storeId: String!, $month: String) { monthlySalesSummaryByStore(storeId: $storeId, month: $month) { month totalSold totalReturned } }
`;
export function useMonthlySalesSummaryByStoreQuery(options?: any) { return useQuery(MonthlySalesSummaryByStoreDocument, options); }

export const TopSellingVariantsDetailedDocument = gql`
  query TopVariants($month: String, $limit: Int) { topSellingVariantsDetailed(month: $month, limit: $limit) { productVariantId productName size concentration packaging quantity barcode } }
`;
export function useTopSellingVariantsDetailedQuery(options?: any) { return useQuery(TopSellingVariantsDetailedDocument, options); }

export const TopSellingVariantsByStoreDocument = gql`
  query TopVariantsByStore($storeId: String!, $month: String, $limit: Int) { topSellingVariantsByStore(storeId: $storeId, month: $month, limit: $limit) { productVariantId productName size concentration packaging quantity barcode } }
`;
export function useTopSellingVariantsByStoreQuery(options?: any) { return useQuery(TopSellingVariantsByStoreDocument, options); }

// Dev DB tools
export const DevCountsDocument = gql`query { devCounts { invoiceImports purchaseOrders orphanVariants } }`;
export function useDevCountsQuery(options?: any) { return useQuery(DevCountsDocument, options); }

export const DevPurgeInvoiceImportsDocument = gql`mutation($beforeDate: String, $dryRun: Boolean) { devPurgeInvoiceImports(filter: { beforeDate: $beforeDate, dryRun: $dryRun }) }`;
export function useDevPurgeInvoiceImportsMutation(options?: any) { return useMutation(DevPurgeInvoiceImportsDocument, options); }

export const DevPurgePurchaseOrdersDocument = gql`mutation($beforeDate: String, $status: String, $dryRun: Boolean) { devPurgePurchaseOrders(filter: { beforeDate: $beforeDate, status: $status, dryRun: $dryRun }) }`;
export function useDevPurgePurchaseOrdersMutation(options?: any) { return useMutation(DevPurgePurchaseOrdersDocument, options); }

export const DevPurgeOrphanVariantsDocument = gql`mutation($dryRun: Boolean) { devPurgeOrphanVariants(filter: { dryRun: $dryRun }) }`;
export function useDevPurgeOrphanVariantsMutation(options?: any) { return useMutation(DevPurgeOrphanVariantsDocument, options); }

// Support
export const MySupportMessagesDocument = gql`query MySupportMessages { mySupportMessages { id message isAdmin createdAt } }`;
export function useMySupportMessagesQuery(options?: any) { return useQuery(MySupportMessagesDocument, options); }

export const RecentSupportThreadsDocument = gql`query RecentSupportThreads($limit: Int) { recentSupportThreads(limit: $limit) { id userId isAdmin message createdAt } }`;
export function useRecentSupportThreadsQuery(options?: any) { return useQuery(RecentSupportThreadsDocument, options); }

export const SupportConversationDocument = gql`query SupportConversation($userId: String!) { supportConversation(userId: $userId) { id isAdmin message createdAt } }`;
export function useSupportConversationLazyQuery(options?: any) { return useLazyQuery(SupportConversationDocument, options); }

export const SendSupportMessageDocument = gql`mutation SendSupport($message: String!) { sendSupportMessage(input: { message: $message }) { id } }`;
export function useSendSupportMessageMutation(options?: any) { return useMutation(SendSupportMessageDocument, options); }

export const AdminSendSupportMessageDocument = gql`mutation AdminSendSupport($userId: String!, $message: String!) { adminSendSupportMessage(input: { userId: $userId, message: $message }) { id } }`;
export function useAdminSendSupportMessageMutation(options?: any) { return useMutation(AdminSendSupportMessageDocument, options); }

// Stock list
export const StockDocument = gql`
  query Stock($input: QueryStockInput) {
    stock(input: $input) {
      storeId
      quantity
      reserved
      store { id name }
      productVariant { id barcode size concentration packaging product { name } }
    }
  }
`;
export function useStockQuery(options?: any) { return useQuery(StockDocument, options); }

// Dev purge products
export const DevPurgeProductsDocument = gql`mutation($beforeDate: String, $dryRun: Boolean) { devPurgeProducts(filter: { beforeDate: $beforeDate, dryRun: $dryRun }) }`;
export function useDevPurgeProductsMutation(options?: any) { return useMutation(DevPurgeProductsDocument, options); }

// Fulfillment
export const AssignFulfillmentPersonnelDocument = gql`
  mutation AssignFulfillmentPersonnel($input: AssignFulfillmentPersonnelInput!) {
    assignFulfillmentPersonnel(input: $input) { saleOrderId status deliveryPersonnelId }
  }
`;
export function useAssignFulfillmentPersonnelMutation(options?: any) { return useMutation(AssignFulfillmentPersonnelDocument, options); }

export const UpdateFulfillmentStatusDocument = gql`
  mutation UpdateFulfillmentStatus($input: UpdateFulfillmentStatusInput!) {
    updateFulfillmentStatus(input: $input) { saleOrderId status }
  }
`;
export function useUpdateFulfillmentStatusMutation(options?: any) { return useMutation(UpdateFulfillmentStatusDocument, options); }

// Customer detail
export const CustomerDocument = gql`
  query Customer($id: String!) {
    findUniqueUser(where: { id: $id }) {
      id
      email
      customerProfile {
        fullName
        email
        phone
        profileStatus
        preferredStore { id name }
        sales { id status totalAmount createdAt store { id name } receipt { id issuedAt consumerSaleId } }
      }
    }
  }
`;
export function useCustomerQuery(options: any) { return useQuery(CustomerDocument, options); }

export const ConsumerSalesByCustomerDocument = gql`
  query ConsumerSalesByCustomer($customerId: String!, $take: Int, $skip: Int, $order: String) {
    consumerSalesByCustomer(customerId: $customerId, take: $take, skip: $skip, order: $order) { id status totalAmount createdAt store { id name } }
  }
`;
export function useConsumerSalesByCustomerQuery(options: any) { return useQuery(ConsumerSalesByCustomerDocument, options); }

export const ConsumerReceiptsByCustomerDocument = gql`
  query ConsumerReceiptsByCustomer($customerId: String!, $take: Int, $skip: Int, $order: String) {
    consumerReceiptsByCustomer(customerId: $customerId, take: $take, skip: $skip, order: $order) { id issuedAt consumerSaleId }
  }
`;
export function useConsumerReceiptsByCustomerQuery(options: any) { return useQuery(ConsumerReceiptsByCustomerDocument, options); }

export const StoresForCustomerDocument = gql`query StoresForCustomer { listStores(take: 200) { id name } }`;
export function useStoresForCustomerQuery(options?: any) { return useQuery(StoresForCustomerDocument, options); }

// Duplicate avoided: AdminUpdateCustomerProfile defined earlier for Customers

// Suppliers search
export const ListSuppliersDocument = gql`
  query ListSuppliers($where: SupplierWhereInput, $take: Int) {
    listSuppliers(where: $where, take: $take) { id name }
  }
`;
export function useListSuppliersLazyQuery(options?: any) { return useLazyQuery(ListSuppliersDocument, options); }

// Collections
export const CollectionsDocument = gql`
  query Collections { collections { id name code target filters createdAt } }
`;
export function useCollectionsQuery(options?: any) { return useQuery(CollectionsDocument, options); }

export const CreateCollectionDocument = gql`
  mutation CreateCollection($input: CreateCollectionInput!) { createCollection(input: $input) { id } }
`;
export function useCreateCollectionMutation(options?: any) { return useMutation(CreateCollectionDocument, options); }

export const UpdateCollectionDocument = gql`
  mutation UpdateCollection($input: UpdateCollectionInput!) { updateCollection(input: $input) { id } }
`;
export function useUpdateCollectionMutation(options?: any) { return useMutation(UpdateCollectionDocument, options); }

export const DeleteCollectionDocument = gql`
  mutation DeleteCollection($id: String!) { deleteCollection(id: $id) }
`;
export function useDeleteCollectionMutation(options?: any) { return useMutation(DeleteCollectionDocument, options); }

export const CollectionMembersCountDocument = gql`
  query CollectionMembersCount($id: String!) { collectionMembersCount(id: $id) }
`;
export function useCollectionMembersCountLazyQuery(options?: any) { return useLazyQuery(CollectionMembersCountDocument, options); }

export const CollectionVariantsDocument = gql`
  query CollectionVariants($id: String!, $take: Int, $skip: Int) {
    collectionVariants(id: $id, take: $take, skip: $skip) {
      id
      name
      barcode
      size
      concentration
      packaging
      product { id name }
    }
  }
`;
export function useCollectionVariantsLazyQuery(options?: any) { return useLazyQuery(CollectionVariantsDocument, options); }

export const CollectionProductsDocument = gql`
  query CollectionProducts($id: String!, $take: Int, $skip: Int) { collectionProducts(id: $id, take: $take, skip: $skip) { id name barcode } }
`;
export function useCollectionProductsLazyQuery(options?: any) { return useLazyQuery(CollectionProductsDocument, options); }
