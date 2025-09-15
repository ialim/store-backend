import { gql } from '@apollo/client';

export const ProductFacets = gql`query ProductFacets($productId: String!) { productFacets(productId: $productId) { facet { id name code values isPrivate } value } }`;
export const AssignFacetToProduct = gql`mutation AssignFacetToProduct($productId: String!, $facetId: String!, $value: String!) { assignFacetToProduct(productId: $productId, facetId: $facetId, value: $value) }`;
export const RemoveFacetFromProduct = gql`mutation RemoveFacetFromProduct($productId: String!, $facetId: String!, $value: String!) { removeFacetFromProduct(productId: $productId, facetId: $facetId, value: $value) }`;
export const CreateVariant = gql`mutation CreateVariant($data: ProductVariantCreateInput!) { createProductVariant(data: $data) { id } }`;
export const UpdateProduct = gql`mutation UpdateProduct($id: String!, $data: ProductUpdateInput!) { updateProduct(where: { id: $id }, data: $data) { id } }`;
export const UpdateVariant = gql`mutation UpdateVariant($id: String!, $data: ProductVariantUpdateInput!) { updateProductVariant(where: { id: $id }, data: $data) { id } }`;
export const DeleteVariant = gql`mutation DeleteVariant($id: String!) { deleteProductVariant(where: { id: $id }) { id } }`;
export const StockTotalsByProduct = gql`query StockTotalsByProduct($productId: String!) { stockTotalsByProduct(productId: $productId) { variantId onHand reserved available } }`;
export const StockTotalsByProductStore = gql`query StockTotalsByProductStore($productId: String!, $storeId: String!) { stockTotalsByProductStore(productId: $productId, storeId: $storeId) { variantId onHand reserved available } }`;

