-- Add optional fields to capture delivery preferences on sale orders
ALTER TABLE "SaleOrder"
  ADD COLUMN "fulfillmentType" "FulfillmentType",
  ADD COLUMN "deliveryAddress" TEXT;
