/*
  Warnings:

  - You are about to drop the column `consumerSaleid` on the `SaleOrder` table. All the data in the column will be lost.
  - A unique constraint covering the columns `[saleOrderId]` on the table `ConsumerSale` will be added. If there are existing duplicate values, this will fail.
  - A unique constraint covering the columns `[SaleOrderid]` on the table `ResellerSale` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `saleOrderId` to the `ConsumerSale` table without a default value. This is not possible if the table is not empty.
  - Added the required column `SaleOrderid` to the `ResellerSale` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "SaleOrder" DROP CONSTRAINT "SaleOrder_consumerSaleid_fkey";

-- DropForeignKey
ALTER TABLE "SaleOrder" DROP CONSTRAINT "SaleOrder_resellerSaleid_fkey";

-- AlterTable
ALTER TABLE "ConsumerSale" ADD COLUMN     "saleOrderId" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "ResellerSale" ADD COLUMN     "SaleOrderid" TEXT NOT NULL;

-- AlterTable
ALTER TABLE "SaleOrder" DROP COLUMN "consumerSaleid";

-- CreateIndex
CREATE UNIQUE INDEX "ConsumerSale_saleOrderId_key" ON "ConsumerSale"("saleOrderId");

-- CreateIndex
CREATE UNIQUE INDEX "ResellerSale_SaleOrderid_key" ON "ResellerSale"("SaleOrderid");

-- AddForeignKey
ALTER TABLE "ResellerSale" ADD CONSTRAINT "ResellerSale_SaleOrderid_fkey" FOREIGN KEY ("SaleOrderid") REFERENCES "SaleOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerSale" ADD CONSTRAINT "ConsumerSale_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
