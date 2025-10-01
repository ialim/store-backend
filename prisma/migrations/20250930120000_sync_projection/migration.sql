-- Extend legacy sync tables with processing metadata
ALTER TABLE "public"."LegacyPriceSnapshot"
  ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "processingError" TEXT,
  ADD COLUMN IF NOT EXISTS "identity" TEXT;

ALTER TABLE "public"."LegacyTicket"
  ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "processingError" TEXT;

ALTER TABLE "public"."LegacyInvoice"
  ADD COLUMN IF NOT EXISTS "processedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "processingError" TEXT;

-- Ensure price snapshot identity is populated and unique
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname = 'public' AND indexname = 'LegacyPriceSnapshot_identity_key'
  ) THEN
    CREATE UNIQUE INDEX "LegacyPriceSnapshot_identity_key" ON "public"."LegacyPriceSnapshot"("identity");
  END IF;
END $$;

-- Product variant legacy mapping
CREATE TABLE IF NOT EXISTS "public"."LegacyProductVariantMapping" (
  "id" TEXT NOT NULL,
  "articleCode" TEXT NOT NULL,
  "sizeCode" TEXT,
  "colorCode" TEXT,
  "productVariantId" TEXT NOT NULL,
  CONSTRAINT "LegacyProductVariantMapping_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LegacyProductVariantMapping_productVariantId_fkey"
    FOREIGN KEY ("productVariantId") REFERENCES "public"."ProductVariant"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "legacy_product_variant_identity"
  ON "public"."LegacyProductVariantMapping"("articleCode", "sizeCode", "colorCode");

-- Store legacy mapping
CREATE TABLE IF NOT EXISTS "public"."LegacyStoreMapping" (
  "id" TEXT NOT NULL,
  "storeCode" TEXT NOT NULL,
  "storeId" TEXT NOT NULL,
  CONSTRAINT "LegacyStoreMapping_pkey" PRIMARY KEY ("id"),
  CONSTRAINT "LegacyStoreMapping_storeId_fkey"
    FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE UNIQUE INDEX IF NOT EXISTS "LegacyStoreMapping_storeCode_key"
  ON "public"."LegacyStoreMapping"("storeCode");
