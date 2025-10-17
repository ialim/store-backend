-- Add company/contact fields to ResellerProfile
ALTER TABLE "ResellerProfile"
    ADD COLUMN "companyName" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "contactPersonName" TEXT NOT NULL DEFAULT '',
    ADD COLUMN "contactPhone" TEXT NOT NULL DEFAULT '';
