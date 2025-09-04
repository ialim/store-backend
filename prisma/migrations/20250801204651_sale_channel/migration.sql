/*
  Warnings:

  - Added the required column `channel` to the `ConsumerSale` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "ConsumerSale" ADD COLUMN     "channel" "SaleChannel" NOT NULL;
