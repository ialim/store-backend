-- Safely drop legacy indexes if they are present.
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'fulfillment_deliveryaddressid_idx'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS "public"."Fulfillment_deliveryAddressId_idx"';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM pg_indexes
    WHERE schemaname = 'public'
      AND indexname = 'saleorder_deliveryaddressid_idx'
  ) THEN
    EXECUTE 'DROP INDEX IF EXISTS "public"."SaleOrder_deliveryAddressId_idx"';
  END IF;
END
$$;

-- AlterTable
ALTER TABLE "public"."FulfillmentRiderInterest" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
ALTER TABLE "public"."SystemSetting" ALTER COLUMN "id" DROP DEFAULT,
ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
ALTER COLUMN "updatedAt" DROP DEFAULT,
ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);
