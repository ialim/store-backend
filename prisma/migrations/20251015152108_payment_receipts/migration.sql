-- Add receipt metadata columns to payment records
ALTER TABLE "ConsumerPayment"
  ADD COLUMN "receiptBucket" TEXT,
  ADD COLUMN "receiptKey" TEXT,
  ADD COLUMN "receiptUrl" TEXT;

ALTER TABLE "ResellerPayment"
  ADD COLUMN "receiptBucket" TEXT,
  ADD COLUMN "receiptKey" TEXT,
  ADD COLUMN "receiptUrl" TEXT;
