import { gql } from '@apollo/client';

export const ListFacets = gql`
  query ListFacets {
    listFacets {
      id
      name
      code
      values
      isPrivate
    }
  }
`;

export const ListFacetsAll = gql`
  query ListFacetsAll {
    listFacets {
      id
      name
      code
      values
      isPrivate
    }
  }
`;

export const CreateFacet = gql`
  mutation CreateFacet($input: CreateFacetInput!) {
    createFacet(input: $input) {
      id
      name
      code
      isPrivate
      values
    }
  }
`;

export const UpdateFacet = gql`
  mutation UpdateFacet($input: UpdateFacetInput!) {
    updateFacet(input: $input) {
      id
      name
      code
      isPrivate
      values
    }
  }
`;

export const DeleteFacet = gql`
  mutation DeleteFacet($id: String!) {
    deleteFacet(id: $id)
  }
`;
export const VariantFacets = gql`query VariantFacets($productVariantId: String!) { variantFacets(productVariantId: $productVariantId) { facet { id name code values isPrivate } value } }`;
export const AssignFacetToVariant = gql`mutation AssignFacetToVariant($productVariantId: String!, $facetId: String!, $value: String!) { assignFacetToVariant(productVariantId: $productVariantId, facetId: $facetId, value: $value) }`;
export const RemoveFacetFromVariant = gql`mutation RemoveFacetFromVariant($productVariantId: String!, $facetId: String!, $value: String!) { removeFacetFromVariant(productVariantId: $productVariantId, facetId: $facetId, value: $value) }`;
export const BulkAssignFacetToVariants = gql`
  mutation BulkAssignFacetToVariants($variantIds: [String!]!, $facetId: String!, $value: String!) {
    bulkAssignFacetToVariants(variantIds: $variantIds, facetId: $facetId, value: $value)
  }
`;

export const BulkRemoveFacetFromVariants = gql`
  mutation BulkRemoveFacetFromVariants($variantIds: [String!]!, $facetId: String!, $value: String!) {
    bulkRemoveFacetFromVariants(variantIds: $variantIds, facetId: $facetId, value: $value)
  }
`;

export const BulkAssignFacetToProducts = gql`
  mutation BulkAssignFacetToProducts($productIds: [String!]!, $facetId: String!, $value: String!) {
    bulkAssignFacetToProducts(productIds: $productIds, facetId: $facetId, value: $value)
  }
`;

export const BulkRemoveFacetFromProducts = gql`
  mutation BulkRemoveFacetFromProducts($productIds: [String!]!, $facetId: String!, $value: String!) {
    bulkRemoveFacetFromProducts(productIds: $productIds, facetId: $facetId, value: $value)
  }
`;

export const Variants = gql`
  query Variants($take: Int, $skip: Int, $where: ProductVariantWhereInput) {
    listProductVariants(take: $take, skip: $skip, where: $where) {
      id
      name
      barcode
      price
      resellerPrice
      createdAt
      product { id name }
      stockItems { quantity reserved }
    }
  }
`;

export const ProductVariantsCount = gql`
  query ProductVariantsCount($where: ProductVariantWhereInput) {
    productVariantsCount(where: $where)
  }
`;

export const Variant = gql`
  query Variant($id: String!) {
    findUniqueProductVariant(where: { id: $id }) {
      id
      name
      barcode
      price
      resellerPrice
      createdAt
      product { id name }
    }
  }
`;
