-- Add composite unique constraint on Stock(storeId, productVariantId)
CREATE UNIQUE INDEX IF NOT EXISTS "Stock_storeId_productVariantId_key"
ON "Stock"("storeId", "productVariantId");

