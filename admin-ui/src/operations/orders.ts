import { gql } from '@apollo/client';

export const Orders = gql`
  query Orders {
    ordersQuery {
      id
      storeId
      billerId
      type
      status
      phase
      saleWorkflowState
      fulfillmentWorkflowState
      saleWorkflowSummary {
        saleOrderId
        outstanding
        canAdvanceByPayment
        canAdvanceByCredit
      }
      totalAmount
      createdAt
      updatedAt
      resellerSaleid
      quotation {
        id
        status
        type
        billerId
        resellerId
        totalAmount
        updatedAt
      }
      fulfillment {
        id
        status
        type
        createdAt
        updatedAt
      }
    }
  }
`;

export const Order = gql`
  query Order($id: String!) {
    order(id: $id) {
      id
      storeId
      billerId
      type
      status
      phase
      saleWorkflowState
      saleWorkflowContext
      saleWorkflowSummary {
        saleOrderId
        state
        grandTotal
        paid
        outstanding
        creditLimit
        creditExposure
        canAdvanceByPayment
        canAdvanceByCredit
        context
      }
      fulfillmentWorkflowState
      totalAmount
      createdAt
      updatedAt
      resellerSaleid
      quotation {
        id
        status
        type
        totalAmount
        billerId
        resellerId
        updatedAt
        saleOrderId
        items {
          productVariantId
          quantity
          unitPrice
        }
      }
      fulfillment {
        id
        status
        type
        deliveryPersonnelId
        deliveryAddress
        cost
        createdAt
        updatedAt
        fulfillmentWorkflowContext
        fulfillmentWorkflow {
          state
          context
        }
      }
    }
  }
`;

export const UpdateQuotationStatus = gql`
  mutation UpdateQuotationStatus($input: UpdateQuotationStatusInput!) {
    updateQuotationStatus(input: $input) {
      id
      status
      saleOrderId
      updatedAt
    }
  }
`;

export const Quotations = gql`
  query Quotations {
    quotations {
      id
      storeId
      billerId
      consumerId
      resellerId
      status
      type
      totalAmount
      createdAt
      updatedAt
      saleOrderId
      SaleOrder {
        id
        status
        phase
      }
    }
  }
`;

export const ConsumerSales = gql`
  query ConsumerSales {
    consumerSales {
      id
      saleOrderId
      customerId
      storeId
      billerId
      status
      channel
      totalAmount
      createdAt
      updatedAt
    }
  }
`;

export const ResellerSales = gql`
  query ResellerSales {
    resellerSales {
      id
      SaleOrderid
      resellerId
      billerId
      storeId
      status
      totalAmount
      createdAt
      updatedAt
    }
  }
`;

export const QuotationDetail = gql`
  query QuotationDetail($id: String!) {
    quotation(id: $id) {
      id
      type
      channel
      storeId
      consumerId
      resellerId
      billerId
      status
      totalAmount
      saleOrderId
      createdAt
      updatedAt
      items {
        productVariantId
        quantity
        unitPrice
      }
      SaleOrder {
        id
        status
        phase
        totalAmount
      }
    }
  }
`;

export const QuotationContext = gql`
  query QuotationContext($id: String!) {
    quotationContext(id: $id) {
      store {
        id
        name
        location
      }
      biller {
        id
        email
        fullName
      }
      reseller {
        id
        email
        fullName
      }
      consumer {
        id
        email
        fullName
      }
    }
  }
`;

export const ProductVariantsByIds = gql`
  query ProductVariantsByIds($ids: [String!]!, $take: Int) {
    listProductVariants(where: { id: { in: $ids } }, take: $take) {
      id
      name
      barcode
      product { id name }
    }
  }
`;

export const ConsumerSaleDetail = gql`
  query ConsumerSaleDetail($id: String!) {
    consumerSale(id: $id) {
      id
      saleOrderId
      customerId
      storeId
      billerId
      status
      channel
      totalAmount
      createdAt
      updatedAt
      items {
        productVariantId
        quantity
        unitPrice
      }
    }
  }
`;

export const ResellerSaleDetail = gql`
  query ResellerSaleDetail($id: String!) {
    resellerSale(id: $id) {
      id
      SaleOrderid
      resellerId
      billerId
      storeId
      status
      totalAmount
      createdAt
      updatedAt
      items {
        productVariantId
        quantity
        unitPrice
      }
    }
  }
`;

export const CreateQuotationDraft = gql`
  mutation CreateQuotationDraft($input: CreateQuotationDraftInput!) {
    createQuotationDraft(input: $input) {
      id
      status
      saleOrderId
    }
  }
`;

export const UpdateQuotation = gql`
  mutation UpdateQuotation($input: UpdateQuotationInput!) {
    updateQuotation(input: $input) {
      id
      status
      totalAmount
      updatedAt
    }
  }
`;

export const CreditCheck = gql`
  query CreditCheck($saleOrderId: String!) {
    creditCheck(saleOrderId: $saleOrderId) {
      saleOrderId
      state
      grandTotal
      paid
      outstanding
      creditLimit
      creditExposure
      canAdvanceByPayment
      canAdvanceByCredit
      context
    }
  }
`;

export const GrantAdminOverride = gql`
  mutation GrantAdminOverride($input: GrantAdminOverrideInput!) {
    grantAdminOverride(input: $input) {
      id
      saleWorkflowState
      saleWorkflowContext
      saleWorkflowSummary {
        saleOrderId
        outstanding
        canAdvanceByPayment
        canAdvanceByCredit
      }
    }
  }
`;

export const GrantCreditOverride = gql`
  mutation GrantCreditOverride($input: GrantCreditOverrideInput!) {
    grantCreditOverride(input: $input) {
      id
      saleWorkflowState
      saleWorkflowContext
      saleWorkflowSummary {
        outstanding
        canAdvanceByPayment
        canAdvanceByCredit
        creditLimit
        creditExposure
      }
    }
  }
`;

export const FulfilmentWorkflow = gql`
  query FulfilmentWorkflow($saleOrderId: String!) {
    fulfilmentWorkflow(saleOrderId: $saleOrderId) {
      saleOrderId
      state
      context
      transitionLogs {
        id
        fromState
        toState
        event
        occurredAt
      }
    }
  }
`;
