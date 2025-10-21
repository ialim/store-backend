-- CreateEnum
CREATE TYPE "AddressSource" AS ENUM (
    'GOOGLE_PLACES',
    'LOCATIONIQ',
    'OPENCAGE',
    'MANUAL',
    'OTHER'
);

-- CreateTable
CREATE TABLE "Address" (
    "id" TEXT NOT NULL,
    "formattedAddress" TEXT NOT NULL,
    "streetLine1" TEXT,
    "streetLine2" TEXT,
    "city" TEXT,
    "state" TEXT,
    "postalCode" TEXT,
    "countryCode" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION,
    "longitude" DOUBLE PRECISION,
    "placeId" TEXT,
    "plusCode" TEXT,
    "provider" "AddressSource" NOT NULL,
    "externalRaw" JSONB,
    "confidence" DOUBLE PRECISION,
    "verifiedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Address_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AddressAssignment" (
    "id" TEXT NOT NULL,
    "addressId" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "label" TEXT,
    "isPrimary" BOOLEAN NOT NULL DEFAULT false,
    "metadata" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "archivedAt" TIMESTAMP(3),

    CONSTRAINT "AddressAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Address_placeId_key" ON "Address"("placeId");

-- CreateIndex
CREATE INDEX "Address_countryCode_state_city_idx" ON "Address"("countryCode", "state", "city");

-- CreateIndex
CREATE INDEX "AddressAssignment_ownerType_ownerId_idx" ON "AddressAssignment"("ownerType", "ownerId");

-- CreateIndex
CREATE UNIQUE INDEX "AddressAssignment_addressId_ownerType_ownerId_key" ON "AddressAssignment"("addressId", "ownerType", "ownerId");

-- AddForeignKey
ALTER TABLE "AddressAssignment" ADD CONSTRAINT "AddressAssignment_addressId_fkey" FOREIGN KEY ("addressId") REFERENCES "Address"("id") ON DELETE CASCADE ON UPDATE CASCADE;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'SaleOrder_deliveryAddressId_fkey'
  ) THEN
    ALTER TABLE "SaleOrder"
      ADD CONSTRAINT "SaleOrder_deliveryAddressId_fkey"
        FOREIGN KEY ("deliveryAddressId") REFERENCES "Address"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint
    WHERE conname = 'Fulfillment_deliveryAddressId_fkey'
  ) THEN
    ALTER TABLE "Fulfillment"
      ADD CONSTRAINT "Fulfillment_deliveryAddressId_fkey"
        FOREIGN KEY ("deliveryAddressId") REFERENCES "Address"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;
