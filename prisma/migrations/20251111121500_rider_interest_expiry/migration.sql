-- Add new rider interest status for expirations
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_enum
    WHERE enumlabel = 'EXPIRED'
      AND enumtypid = 'public."FulfillmentRiderInterestStatus"'::regtype
  ) THEN
    ALTER TYPE "FulfillmentRiderInterestStatus" ADD VALUE 'EXPIRED';
  END IF;
END $$;

-- Ensure updatedAt column keeps automatic timestamp updates
ALTER TABLE "FulfillmentRiderInterest"
  ALTER COLUMN "updatedAt" SET DEFAULT CURRENT_TIMESTAMP;

-- Create rider coverage mapping
CREATE TABLE "RiderCoverageArea" (
    "id" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "storeId" TEXT NOT NULL,
    "serviceRadiusKm" DOUBLE PRECISION,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RiderCoverageArea_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "RiderCoverageArea_riderId_storeId_key"
  ON "RiderCoverageArea"("riderId", "storeId");

CREATE INDEX "RiderCoverageArea_storeId_idx"
  ON "RiderCoverageArea"("storeId");

ALTER TABLE "RiderCoverageArea"
  ADD CONSTRAINT "RiderCoverageArea_riderId_fkey"
  FOREIGN KEY ("riderId") REFERENCES "User"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "RiderCoverageArea"
  ADD CONSTRAINT "RiderCoverageArea_storeId_fkey"
  FOREIGN KEY ("storeId") REFERENCES "Store"("id")
  ON DELETE CASCADE ON UPDATE CASCADE;
