-- CreateEnum
CREATE TYPE "SaleChannel" AS ENUM ('WEB', 'APP', 'IN_STORE');

-- CreateEnum
CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'CONFIRMED', 'FAILED');

-- CreateEnum
CREATE TYPE "FulfillmentType" AS ENUM ('PICKUP', 'DELIVERY');

-- CreateEnum
CREATE TYPE "FulfillmentStatus" AS ENUM ('PENDING', 'ASSIGNED', 'IN_TRANSIT', 'DELIVERED', 'CANCELLED');

-- CreateTable
CREATE TABLE "SaleOrder" (
    "id" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "billerId" TEXT NOT NULL,
    "type" "SaleType" NOT NULL,
    "status" "SaleStatus" NOT NULL DEFAULT 'PENDING',
    "totalAmount" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "consumerSaleid" TEXT,
    "resellerSaleid" TEXT,

    CONSTRAINT "SaleOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Fulfillment" (
    "id" TEXT NOT NULL,
    "saleOrderId" TEXT NOT NULL,
    "type" "FulfillmentType" NOT NULL,
    "deliveryPersonnelId" TEXT,
    "deliveryAddress" TEXT,
    "status" "FulfillmentStatus" NOT NULL DEFAULT 'PENDING',
    "cost" DOUBLE PRECISION,
    "confirmationPin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Fulfillment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Fulfillment_saleOrderId_key" ON "Fulfillment"("saleOrderId");

-- AddForeignKey
ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_consumerSaleid_fkey" FOREIGN KEY ("consumerSaleid") REFERENCES "ConsumerSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SaleOrder" ADD CONSTRAINT "SaleOrder_resellerSaleid_fkey" FOREIGN KEY ("resellerSaleid") REFERENCES "ResellerSale"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fulfillment" ADD CONSTRAINT "Fulfillment_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Fulfillment" ADD CONSTRAINT "Fulfillment_deliveryPersonnelId_fkey" FOREIGN KEY ("deliveryPersonnelId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
