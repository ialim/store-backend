import { gql } from '@apollo/client';

export const Stock = gql`
  query Stock($input: QueryStockInput) {
    stock(input: $input) {
      id
      productVariantId
      storeId
      quantity
      reserved
      store { id name }
    }
  }
`;
