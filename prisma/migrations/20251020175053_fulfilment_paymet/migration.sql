-- CreateEnum
CREATE TYPE "public"."FulfillmentCostStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "public"."FulfillmentPaymentStatus" AS ENUM ('UNPAID', 'PARTIAL', 'PAID');

-- AlterTable
ALTER TABLE "public"."Fulfillment" ADD COLUMN     "costAcceptedAt" TIMESTAMP(3),
ADD COLUMN     "costStatus" "public"."FulfillmentCostStatus" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "paymentStatus" "public"."FulfillmentPaymentStatus" NOT NULL DEFAULT 'UNPAID';

-- AlterTable
ALTER TABLE "public"."FulfillmentRiderInterest" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'SystemSetting'
  ) THEN
    ALTER TABLE "public"."SystemSetting"
      ALTER COLUMN "id" DROP DEFAULT,
      ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
      ALTER COLUMN "updatedAt" DROP DEFAULT,
      ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);
  END IF;
END
$$;

-- CreateTable
CREATE TABLE "public"."FulfillmentPayment" (
    "id" TEXT NOT NULL,
    "fulfillmentId" TEXT NOT NULL,
    "amount" DOUBLE PRECISION NOT NULL,
    "method" TEXT,
    "reference" TEXT,
    "receivedAt" TIMESTAMP(3),
    "receivedById" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FulfillmentPayment_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "public"."FulfillmentPayment" ADD CONSTRAINT "FulfillmentPayment_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "public"."Fulfillment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."FulfillmentPayment" ADD CONSTRAINT "FulfillmentPayment_receivedById_fkey" FOREIGN KEY ("receivedById") REFERENCES "public"."User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
