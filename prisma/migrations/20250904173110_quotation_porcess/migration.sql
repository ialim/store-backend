/*
  Warnings:

  - A unique constraint covering the columns `[saleOrderId]` on the table `Quotation` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `channel` to the `Quotation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `storeId` to the `Quotation` table without a default value. This is not possible if the table is not empty.
  - Added the required column `type` to the `Quotation` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "QuotationStatus" ADD VALUE 'APPROVED';

-- DropForeignKey
ALTER TABLE "Quotation" DROP CONSTRAINT "Quotation_billerId_fkey";

-- DropForeignKey
ALTER TABLE "Quotation" DROP CONSTRAINT "Quotation_resellerId_fkey";

-- AlterTable
ALTER TABLE "ConsumerSale" ADD COLUMN     "quotationId" TEXT;

-- AlterTable
ALTER TABLE "Quotation" ADD COLUMN     "channel" "SaleChannel" NOT NULL,
ADD COLUMN     "consumerId" TEXT,
ADD COLUMN     "saleOrderId" TEXT,
ADD COLUMN     "storeId" TEXT NOT NULL,
ADD COLUMN     "type" "SaleType" NOT NULL,
ALTER COLUMN "resellerId" DROP NOT NULL,
ALTER COLUMN "billerId" DROP NOT NULL,
ALTER COLUMN "status" SET DEFAULT 'DRAFT';

-- CreateIndex
CREATE UNIQUE INDEX "Quotation_saleOrderId_key" ON "Quotation"("saleOrderId");

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_billerId_fkey" FOREIGN KEY ("billerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_consumerId_fkey" FOREIGN KEY ("consumerId") REFERENCES "Customer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_resellerId_fkey" FOREIGN KEY ("resellerId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Quotation" ADD CONSTRAINT "Quotation_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerSale" ADD CONSTRAINT "ConsumerSale_quotationId_fkey" FOREIGN KEY ("quotationId") REFERENCES "Quotation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
