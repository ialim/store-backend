/*
  Warnings:

  - A unique constraint covering the columns `[legacyArticleCode]` on the table `ProductVariant` will be added. If there are existing duplicate values, this will fail.

*/
-- DropForeignKey
ALTER TABLE "public"."LegacyStoreMapping" DROP CONSTRAINT "LegacyStoreMapping_storeId_fkey";

-- Alter Address table only if it exists (older databases may not have it yet)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'Address'
  ) THEN
    EXECUTE 'ALTER TABLE "public"."Address" ALTER COLUMN "updatedAt" DROP DEFAULT';
  END IF;
END
$$;

-- AlterTable
ALTER TABLE "public"."Fulfillment" ADD COLUMN     "workflowContext" JSONB,
ADD COLUMN     "workflowState" TEXT;

-- AlterTable
ALTER TABLE "public"."SaleOrder" ADD COLUMN     "workflowContext" JSONB,
ADD COLUMN     "workflowState" TEXT;

-- CreateTable
CREATE TABLE "public"."SaleOrderTransitionLog" (
    "id" TEXT NOT NULL,
    "saleOrderId" TEXT NOT NULL,
    "fromState" TEXT,
    "toState" TEXT NOT NULL,
    "event" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SaleOrderTransitionLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."FulfillmentTransitionLog" (
    "id" TEXT NOT NULL,
    "fulfillmentId" TEXT NOT NULL,
    "fromState" TEXT,
    "toState" TEXT NOT NULL,
    "event" TEXT,
    "metadata" JSONB,
    "occurredAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FulfillmentTransitionLog_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."SaleOrderTransitionLog" ADD CONSTRAINT "SaleOrderTransitionLog_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "public"."SaleOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FulfillmentTransitionLog" ADD CONSTRAINT "FulfillmentTransitionLog_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "public"."Fulfillment"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LegacyStoreMapping" ADD CONSTRAINT "LegacyStoreMapping_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
