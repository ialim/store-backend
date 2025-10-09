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
      totalAmount
      createdAt
      updatedAt
      resellerSaleid
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
      totalAmount
      createdAt
      updatedAt
      resellerSaleid
      fulfillment {
        id
        status
        type
        deliveryPersonnelId
        deliveryAddress
        cost
        createdAt
        updatedAt
      }
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

export const StoreSummary = gql`
  query StoreSummary($id: String!) {
    listStores(where: { id: { equals: $id } }, take: 1) {
      id
      name
      location
    }
  }
`;

export const UsersByIds = gql`
  query UsersByIds($ids: [String!]!, $take: Int) {
    listUsers(where: { id: { in: $ids } }, take: $take) {
      id
      email
      customerProfile { fullName email }
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
