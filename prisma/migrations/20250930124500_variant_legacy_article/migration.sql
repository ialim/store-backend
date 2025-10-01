-- Add legacyArticleCode to product variants
ALTER TABLE "public"."ProductVariant"
  ADD COLUMN IF NOT EXISTS "legacyArticleCode" TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS "ProductVariant_legacyArticleCode_key"
  ON "public"."ProductVariant"("legacyArticleCode")
  WHERE "legacyArticleCode" IS NOT NULL;

-- Drop legacy mapping table (no longer needed)
DROP TABLE IF EXISTS "public"."LegacyProductVariantMapping" CASCADE;

-- Clean up any index remnants
DROP INDEX IF EXISTS "legacy_product_variant_identity";
