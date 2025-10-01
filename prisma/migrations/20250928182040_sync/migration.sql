-- CreateEnum
CREATE TYPE "public"."LegacySyncEntity" AS ENUM ('PRICES', 'SALES_TICKET', 'SALES_INVOICE');

-- CreateTable
CREATE TABLE "public"."LegacySyncCursor" (
    "id" TEXT NOT NULL,
    "entity" "public"."LegacySyncEntity" NOT NULL,
    "storeCode" TEXT NOT NULL,
    "cursor" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LegacySyncCursor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LegacyPriceSnapshot" (
    "id" TEXT NOT NULL,
    "storeCode" TEXT NOT NULL,
    "tariffId" INTEGER NOT NULL,
    "articleCode" TEXT NOT NULL,
    "sizeCode" TEXT,
    "colorCode" TEXT,
    "formatCode" INTEGER,
    "priceGross" DOUBLE PRECISION,
    "discount" DOUBLE PRECISION,
    "priceNet" DOUBLE PRECISION,
    "priceGrossAlt" DOUBLE PRECISION,
    "discountAlt" DOUBLE PRECISION,
    "priceNetAlt" DOUBLE PRECISION,
    "priceDate" TIMESTAMP(3) NOT NULL,
    "warehouseCode" TEXT NOT NULL,
    "stockQuantity" DOUBLE PRECISION,
    "stockDate" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegacyPriceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LegacyTicket" (
    "id" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "storeCode" TEXT NOT NULL,
    "warehouseCode" TEXT,
    "fo" INTEGER,
    "serie" TEXT,
    "ticketNumber" INTEGER,
    "suffix" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "openedAt" TIMESTAMP(3),
    "closedAt" TIMESTAMP(3),
    "totalNet" DOUBLE PRECISION,
    "customerCode" INTEGER,
    "vendorCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegacyTicket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LegacyTicketLine" (
    "id" TEXT NOT NULL,
    "ticketId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "articleCode" TEXT NOT NULL,
    "sizeCode" TEXT,
    "colorCode" TEXT,
    "quantity" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,
    "priceVat" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,
    "vendorCode" INTEGER,

    CONSTRAINT "LegacyTicketLine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LegacyInvoice" (
    "id" TEXT NOT NULL,
    "identity" TEXT NOT NULL,
    "storeCode" TEXT NOT NULL,
    "warehouseCode" TEXT,
    "serie" TEXT,
    "invoiceNumber" INTEGER,
    "suffix" TEXT,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "totalNet" DOUBLE PRECISION,
    "customerCode" INTEGER,
    "vendorCode" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "LegacyInvoice_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."LegacyInvoiceLine" (
    "id" TEXT NOT NULL,
    "invoiceId" TEXT NOT NULL,
    "lineNumber" INTEGER NOT NULL,
    "articleCode" TEXT NOT NULL,
    "sizeCode" TEXT,
    "colorCode" TEXT,
    "quantity" DOUBLE PRECISION,
    "price" DOUBLE PRECISION,
    "priceVat" DOUBLE PRECISION,
    "total" DOUBLE PRECISION,

    CONSTRAINT "LegacyInvoiceLine_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "LegacySyncCursor_entity_storeCode_key" ON "public"."LegacySyncCursor"("entity", "storeCode");

-- CreateIndex
CREATE UNIQUE INDEX "legacy_price_snapshot_identity" ON "public"."LegacyPriceSnapshot"("storeCode", "tariffId", "articleCode", "sizeCode", "colorCode", "formatCode", "priceDate", "warehouseCode");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyTicket_identity_key" ON "public"."LegacyTicket"("identity");

-- CreateIndex
CREATE UNIQUE INDEX "legacy_ticket_line_identity" ON "public"."LegacyTicketLine"("ticketId", "lineNumber");

-- CreateIndex
CREATE UNIQUE INDEX "LegacyInvoice_identity_key" ON "public"."LegacyInvoice"("identity");

-- CreateIndex
CREATE UNIQUE INDEX "legacy_invoice_line_identity" ON "public"."LegacyInvoiceLine"("invoiceId", "lineNumber");

-- AddForeignKey
ALTER TABLE "public"."LegacyTicketLine" ADD CONSTRAINT "LegacyTicketLine_ticketId_fkey" FOREIGN KEY ("ticketId") REFERENCES "public"."LegacyTicket"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."LegacyInvoiceLine" ADD CONSTRAINT "LegacyInvoiceLine_invoiceId_fkey" FOREIGN KEY ("invoiceId") REFERENCES "public"."LegacyInvoice"("id") ON DELETE CASCADE ON UPDATE CASCADE;
