-- CreateEnum
CREATE TYPE "public"."InvoiceImportStatus" AS ENUM ('PENDING', 'PROCESSING', 'READY', 'NEEDS_REVIEW', 'FAILED', 'COMPLETED');

-- CreateTable
CREATE TABLE "public"."InvoiceImport" (
    "id" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "supplierName" TEXT,
    "storeId" TEXT,
    "status" "public"."InvoiceImportStatus" NOT NULL DEFAULT 'PENDING',
    "parsed" JSONB,
    "message" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "InvoiceImport_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "InvoiceImport_status_idx" ON "public"."InvoiceImport"("status");

-- CreateIndex
CREATE INDEX "InvoiceImport_createdAt_idx" ON "public"."InvoiceImport"("createdAt");

-- AddForeignKey
ALTER TABLE "public"."InvoiceImport" ADD CONSTRAINT "InvoiceImport_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "public"."Store"("id") ON DELETE SET NULL ON UPDATE CASCADE;
