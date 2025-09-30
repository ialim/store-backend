import { gql } from '@apollo/client';

export const Products = gql`query Products($take: Int, $where: ProductWhereInput) { listProducts(take: $take, where: $where) { id name barcode } }`;
export const CreateProduct = gql`mutation CreateProduct($data: ProductCreateInput!) { createProduct(data: $data) { id } }`;
export const Product = gql`
  query Product($id: String!) {
    findUniqueProduct(where: { id: $id }) {
      id
      name
      barcode
      description
      createdAt
      variants {
        id
        name
        barcode
        price
        resellerPrice
        createdAt
      }
    }
  }
`;
