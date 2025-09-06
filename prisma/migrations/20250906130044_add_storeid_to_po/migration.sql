-- AlterTable
ALTER TABLE "public"."PurchaseOrder" ADD COLUMN     "storeId" TEXT;

-- AddForeignKey
ALTER TABLE "public"."PurchaseOrder" ADD CONSTRAINT "PurchaseOrder_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Backfill storeId from the first receipt's store for historical data
UPDATE "public"."PurchaseOrder" po
SET "storeId" = sub."storeId"
FROM (
  SELECT "purchaseOrderId", "storeId"
  FROM (
    SELECT "purchaseOrderId", "storeId",
           ROW_NUMBER() OVER (PARTITION BY "purchaseOrderId" ORDER BY "receivedAt" ASC) AS rn
    FROM "public"."StockReceiptBatch"
  ) t
  WHERE rn = 1
) sub
WHERE po."id" = sub."purchaseOrderId" AND po."storeId" IS NULL;
