import { gql } from '@apollo/client';

export const MonthlySalesSummary = gql`
  query MonthlySalesSummary($month: String) {
    monthlySalesSummary(month: $month) { month totalSold totalReturned }
  }
`;

export const MonthlySalesSummaryByStore = gql`
  query MonthlySalesSummaryByStore($storeId: String!, $month: String) {
    monthlySalesSummaryByStore(storeId: $storeId, month: $month) { month totalSold totalReturned }
  }
`;

export const TopSellingVariantsDetailed = gql`
  query TopSellingVariantsDetailed($month: String, $limit: Int) {
    topSellingVariantsDetailed(month: $month, limit: $limit) { productVariantId productName quantity }
  }
`;

export const TopSellingVariantsByStore = gql`
  query TopSellingVariantsByStore($storeId: String!, $month: String, $limit: Int) {
    topSellingVariantsByStore(storeId: $storeId, month: $month, limit: $limit) { productVariantId productName quantity }
  }
`;
