DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'LegacyProductVariantMapping'
  ) THEN
    EXECUTE 'ALTER TABLE "public"."LegacyProductVariantMapping" DROP CONSTRAINT IF EXISTS "LegacyProductVariantMapping_productVariantId_fkey"';
    EXECUTE 'ALTER TABLE "public"."LegacyProductVariantMapping" ADD CONSTRAINT "LegacyProductVariantMapping_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "public"."ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE';
  END IF;

  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'LegacyStoreMapping'
  ) THEN
    EXECUTE 'ALTER TABLE "public"."LegacyStoreMapping" DROP CONSTRAINT IF EXISTS "LegacyStoreMapping_storeId_fkey"';
    EXECUTE 'ALTER TABLE "public"."LegacyStoreMapping" ADD CONSTRAINT "LegacyStoreMapping_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE';
  END IF;
END
$$;
