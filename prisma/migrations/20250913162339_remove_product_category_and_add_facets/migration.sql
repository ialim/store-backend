/*
  Warnings:

  - You are about to drop the column `categoryId` on the `Product` table. All the data in the column will be lost.
  - You are about to drop the `ProductCategory` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "public"."Product" DROP CONSTRAINT "Product_categoryId_fkey";

-- DropForeignKey
ALTER TABLE "public"."ProductVariant" DROP CONSTRAINT "ProductVariant_productId_fkey";

-- AlterTable
ALTER TABLE "public"."Product" DROP COLUMN "categoryId";

-- AlterTable
ALTER TABLE "public"."ProductVariant" ADD COLUMN     "name" TEXT,
ALTER COLUMN "productId" DROP NOT NULL;

-- DropTable
DROP TABLE "public"."ProductCategory";

-- CreateTable
CREATE TABLE "public"."Facet" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "code" TEXT NOT NULL,
    "isPrivate" BOOLEAN NOT NULL DEFAULT false,
    "values" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Facet_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ProductFacetValue" (
    "id" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "facetId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "ProductFacetValue_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."VariantFacetValue" (
    "id" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "facetId" TEXT NOT NULL,
    "value" TEXT NOT NULL,

    CONSTRAINT "VariantFacetValue_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Facet_code_key" ON "public"."Facet"("code");

-- CreateIndex
CREATE INDEX "ProductFacetValue_productId_idx" ON "public"."ProductFacetValue"("productId");

-- CreateIndex
CREATE INDEX "ProductFacetValue_facetId_idx" ON "public"."ProductFacetValue"("facetId");

-- CreateIndex
CREATE UNIQUE INDEX "ProductFacetValue_productId_facetId_value_key" ON "public"."ProductFacetValue"("productId", "facetId", "value");

-- CreateIndex
CREATE INDEX "VariantFacetValue_productVariantId_idx" ON "public"."VariantFacetValue"("productVariantId");

-- CreateIndex
CREATE INDEX "VariantFacetValue_facetId_idx" ON "public"."VariantFacetValue"("facetId");

-- CreateIndex
CREATE UNIQUE INDEX "VariantFacetValue_productVariantId_facetId_value_key" ON "public"."VariantFacetValue"("productVariantId", "facetId", "value");

-- AddForeignKey
ALTER TABLE "public"."ProductVariant" ADD CONSTRAINT "ProductVariant_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductFacetValue" ADD CONSTRAINT "ProductFacetValue_productId_fkey" FOREIGN KEY ("productId") REFERENCES "public"."Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ProductFacetValue" ADD CONSTRAINT "ProductFacetValue_facetId_fkey" FOREIGN KEY ("facetId") REFERENCES "public"."Facet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VariantFacetValue" ADD CONSTRAINT "VariantFacetValue_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "public"."ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."VariantFacetValue" ADD CONSTRAINT "VariantFacetValue_facetId_fkey" FOREIGN KEY ("facetId") REFERENCES "public"."Facet"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
