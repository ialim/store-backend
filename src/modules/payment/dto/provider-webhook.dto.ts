export type ProviderConsumerPaymentPayload = {
  saleOrderId: string;
  consumerSaleId: string;
  amount: number;
  method: string;
  reference?: string;
  status: string;
};

export type ProviderResellerPaymentPayload = {
  saleOrderId: string;
  resellerId: string;
  resellerSaleId?: string;
  amount: number;
  method: string;
  reference?: string;
  status: string;
  receivedById?: string;
};
