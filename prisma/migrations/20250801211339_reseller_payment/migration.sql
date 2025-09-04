/*
  Warnings:

  - Added the required column `saleOrderId` to the `ConsumerPayment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `saleOrderId` to the `ResellerPayment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ConsumerPayment" ADD COLUMN     "saleOrderId" TEXT NOT NULL,
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- AlterTable
ALTER TABLE "ConsumerSale" ALTER COLUMN "adjustmentType" DROP NOT NULL;

-- AlterTable
ALTER TABLE "ResellerPayment" ADD COLUMN     "saleOrderId" TEXT NOT NULL,
ADD COLUMN     "status" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

-- AddForeignKey
ALTER TABLE "ResellerPayment" ADD CONSTRAINT "ResellerPayment_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ConsumerPayment" ADD CONSTRAINT "ConsumerPayment_saleOrderId_fkey" FOREIGN KEY ("saleOrderId") REFERENCES "SaleOrder"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
