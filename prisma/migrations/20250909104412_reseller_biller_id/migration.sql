-- DropForeignKey
ALTER TABLE "public"."ResellerProfile" DROP CONSTRAINT "ResellerProfile_billerId_fkey";

-- AlterTable
ALTER TABLE "public"."ResellerProfile" ADD COLUMN     "requestedBillerId" TEXT,
ALTER COLUMN "billerId" DROP NOT NULL;

-- AddForeignKey
ALTER TABLE "public"."ResellerProfile" ADD CONSTRAINT "ResellerProfile_billerId_fkey" FOREIGN KEY ("billerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ResellerProfile" ADD CONSTRAINT "ResellerProfile_requestedBillerId_fkey" FOREIGN KEY ("requestedBillerId") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
