-- CreateEnum
CREATE TYPE "public"."PurchasePhase" AS ENUM ('REQUISITION', 'RFQ', 'NEGOTIATION', 'APPROVAL', 'ORDERED', 'RECEIVING', 'INVOICING', 'COMPLETED');

-- CreateEnum
CREATE TYPE "public"."PurchaseRequisitionStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."SupplierQuoteStatus" AS ENUM ('DRAFT', 'SUBMITTED', 'SELECTED', 'REJECTED');

-- AlterTable
ALTER TABLE "public"."PurchaseOrder" ADD COLUMN     "phase" "public"."PurchasePhase" NOT NULL DEFAULT 'ORDERED';

-- CreateTable
CREATE TABLE "public"."PurchaseRequisition" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "requestedById" TEXT NOT NULL,
    "status" "public"."PurchaseRequisitionStatus" NOT NULL DEFAULT 'DRAFT',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "PurchaseRequisition_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."PurchaseRequisitionItem" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "requestedQty" INTEGER NOT NULL,
    "notes" TEXT,

    CONSTRAINT "PurchaseRequisitionItem_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SupplierCatalog" (
    "id" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "defaultCost" DOUBLE PRECISION NOT NULL,
    "leadTimeDays" INTEGER,
    "isPreferred" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "SupplierCatalog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SupplierQuote" (
    "id" TEXT NOT NULL,
    "requisitionId" TEXT NOT NULL,
    "supplierId" TEXT NOT NULL,
    "status" "public"."SupplierQuoteStatus" NOT NULL DEFAULT 'DRAFT',
    "validUntil" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SupplierQuote_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."SupplierQuoteItem" (
    "id" TEXT NOT NULL,
    "quoteId" TEXT NOT NULL,
    "productVariantId" TEXT NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL,
    "minQty" INTEGER,
    "leadTimeDays" INTEGER,

    CONSTRAINT "SupplierQuoteItem_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SupplierCatalog_supplierId_productVariantId_key" ON "public"."SupplierCatalog"("supplierId", "productVariantId");

-- CreateIndex
CREATE UNIQUE INDEX "SupplierQuote_requisitionId_supplierId_key" ON "public"."SupplierQuote"("requisitionId", "supplierId");

-- AddForeignKey
ALTER TABLE "public"."PurchaseRequisition" ADD CONSTRAINT "PurchaseRequisition_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseRequisition" ADD CONSTRAINT "PurchaseRequisition_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "public"."User"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseRequisitionItem" ADD CONSTRAINT "PurchaseRequisitionItem_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "public"."PurchaseRequisition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."PurchaseRequisitionItem" ADD CONSTRAINT "PurchaseRequisitionItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "public"."ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupplierCatalog" ADD CONSTRAINT "SupplierCatalog_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupplierCatalog" ADD CONSTRAINT "SupplierCatalog_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "public"."ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupplierQuote" ADD CONSTRAINT "SupplierQuote_requisitionId_fkey" FOREIGN KEY ("requisitionId") REFERENCES "public"."PurchaseRequisition"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupplierQuote" ADD CONSTRAINT "SupplierQuote_supplierId_fkey" FOREIGN KEY ("supplierId") REFERENCES "public"."Supplier"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupplierQuoteItem" ADD CONSTRAINT "SupplierQuoteItem_quoteId_fkey" FOREIGN KEY ("quoteId") REFERENCES "public"."SupplierQuote"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."SupplierQuoteItem" ADD CONSTRAINT "SupplierQuoteItem_productVariantId_fkey" FOREIGN KEY ("productVariantId") REFERENCES "public"."ProductVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
