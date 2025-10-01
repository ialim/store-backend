-- DropForeignKey
ALTER TABLE "public"."LegacyProductVariantMapping" DROP CONSTRAINT "LegacyProductVariantMapping_productVariantId_fkey";

-- DropForeignKey
ALTER TABLE "public"."LegacyStoreMapping" DROP CONSTRAINT "LegacyStoreMapping_storeId_fkey";

-- AddForeignKey
ALTER TABLE "public"."LegacyProductVariantMapping" ADD CONSTRAINT "LegacyProductVariantMapping_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "public"."ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LegacyStoreMapping" ADD CONSTRAINT "LegacyStoreMapping_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
