CREATE TYPE "FulfillmentRiderInterestStatus" AS ENUM ('ACTIVE', 'WITHDRAWN', 'ASSIGNED', 'REJECTED');

CREATE TABLE "FulfillmentRiderInterest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "fulfillmentId" TEXT NOT NULL,
    "riderId" TEXT NOT NULL,
    "status" "FulfillmentRiderInterestStatus" NOT NULL DEFAULT 'ACTIVE',
    "message" TEXT,
    "etaMinutes" INTEGER,
    "expiresAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX "FulfillmentRiderInterest_fulfillmentId_riderId_key" ON "FulfillmentRiderInterest"("fulfillmentId", "riderId");
CREATE INDEX "FulfillmentRiderInterest_riderId_status_idx" ON "FulfillmentRiderInterest"("riderId", "status");

ALTER TABLE "FulfillmentRiderInterest"
  ADD CONSTRAINT "FulfillmentRiderInterest_fulfillmentId_fkey" FOREIGN KEY ("fulfillmentId") REFERENCES "Fulfillment"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "FulfillmentRiderInterest"
  ADD CONSTRAINT "FulfillmentRiderInterest_riderId_fkey" FOREIGN KEY ("riderId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
