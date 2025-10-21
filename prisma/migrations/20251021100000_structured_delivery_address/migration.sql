-- Introduce structured delivery address linkage and contact details
ALTER TABLE "SaleOrder"
  ADD COLUMN "deliveryAddressId" TEXT,
  ADD COLUMN "receiverName" TEXT,
  ADD COLUMN "receiverPhone" TEXT,
  ADD COLUMN "deliveryNotes" TEXT;

ALTER TABLE "Fulfillment"
  ADD COLUMN "deliveryAddressId" TEXT,
  ADD COLUMN "receiverName" TEXT,
  ADD COLUMN "receiverPhone" TEXT,
  ADD COLUMN "deliveryNotes" TEXT;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'Address'
  ) THEN
    ALTER TABLE "SaleOrder"
      ADD CONSTRAINT "SaleOrder_deliveryAddressId_fkey"
        FOREIGN KEY ("deliveryAddressId") REFERENCES "Address"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;

    ALTER TABLE "Fulfillment"
      ADD CONSTRAINT "Fulfillment_deliveryAddressId_fkey"
        FOREIGN KEY ("deliveryAddressId") REFERENCES "Address"("id")
        ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END
$$;

CREATE INDEX "SaleOrder_deliveryAddressId_idx" ON "SaleOrder"("deliveryAddressId");
CREATE INDEX "Fulfillment_deliveryAddressId_idx" ON "Fulfillment"("deliveryAddressId");
