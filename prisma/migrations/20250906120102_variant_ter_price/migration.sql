-- CreateTable
CREATE TABLE "public"."ProductVariantTierPrice" (
    "id" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "tier" "public"."UserTier" NOT NULL,
    "price" DOUBLE PRECISION NOT NULL,

    CONSTRAINT "ProductVariantTierPrice_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ProductVariantTierPrice_productVariantId_tier_key" ON "public"."ProductVariantTierPrice"("productVariantId", "tier");

-- AddForeignKey
ALTER TABLE "public"."ProductVariantTierPrice" ADD CONSTRAINT "ProductVariantTierPrice_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "public"."ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
