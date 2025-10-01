/*
  Warnings:

  - A unique constraint covering the columns `[identity]` on the table `LegacyPriceSnapshot` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `identity` to the `LegacyPriceSnapshot` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "public"."LegacyPriceSnapshot" ADD COLUMN     "identity" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "LegacyPriceSnapshot_identity_key" ON "public"."LegacyPriceSnapshot"("identity");

-- RenameIndex
ALTER INDEX "public"."legacy_price_snapshot_identity" RENAME TO "LegacyPriceSnapshot_storeCode_tariffId_articleCode_sizeCode_key";
