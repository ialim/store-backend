Order module (aggregate root)

- Aggregate root: `SaleOrder` with `phase` (`QUOTATION|SALE|FULFILLMENT`) and `status`.
- Phases: Quotation, Sale (Consumer/Reseller), Payments, Fulfillment.
- GraphQL: `OrderResolver` exposes queries `ordersQuery`, `order`, and lifecycle mutations.
- Existing `SalesResolver` endpoints remain for compatibility during migration.

