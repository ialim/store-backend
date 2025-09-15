import { gql } from '@apollo/client';

export const ListFacets = gql`query ListFacets { listFacets { id name code values isPrivate } }`;
export const VariantFacets = gql`query VariantFacets($productVariantId: String!) { variantFacets(productVariantId: $productVariantId) { facet { id name code values isPrivate } value } }`;
export const AssignFacetToVariant = gql`mutation AssignFacetToVariant($productVariantId: String!, $facetId: String!, $value: String!) { assignFacetToVariant(productVariantId: $productVariantId, facetId: $facetId, value: $value) }`;
export const RemoveFacetFromVariant = gql`mutation RemoveFacetFromVariant($productVariantId: String!, $facetId: String!, $value: String!) { removeFacetFromVariant(productVariantId: $productVariantId, facetId: $facetId, value: $value) }`;
export const VariantsCount = gql`query VariantsCount($where: ProductVariantWhereInput) { productVariantsCount(where: $where) }`;
export const Variant = gql`query Variant($id: String!) { findUniqueProductVariant(where: { id: $id }) { id name barcode size concentration packaging price resellerPrice createdAt product { id name } } }`;

