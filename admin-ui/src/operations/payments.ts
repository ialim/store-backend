import { gql } from '@apollo/client';

export const StoresForPayments = gql`query StoresForPayments { listStores(take: 200) { id name } }`;
export const StorePaymentsSummary = gql`
  query StorePaymentsSummary($storeId: String!, $month: String) {
    storePaymentsSummary(storeId: $storeId, month: $month) { storeId month consumerPaid resellerPaid totalPaid }
  }
`;
export const DailyPaymentsSeries = gql`
  query DailyPaymentsSeries($month: String, $storeId: String) {
    dailyPaymentsSeries(month: $month, storeId: $storeId) { date consumerPaid resellerPaid totalPaid }
  }
`;
export const StorePaymentsSummaryRange = gql`
  query StorePaymentsSummaryRange($storeId: String!, $start: DateTime!, $end: DateTime!) {
    storePaymentsSummaryRange(storeId: $storeId, start: $start, end: $end) { storeId month consumerPaid resellerPaid totalPaid }
  }
`;
export const DailyPaymentsSeriesRange = gql`
  query DailyPaymentsSeriesRange($start: DateTime!, $end: DateTime!, $storeId: String) {
    dailyPaymentsSeriesRange(start: $start, end: $end, storeId: $storeId) { date consumerPaid resellerPaid totalPaid }
  }
`;

