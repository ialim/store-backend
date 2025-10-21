-- Add branding fields to ResellerProfile
ALTER TABLE "ResellerProfile"
ADD COLUMN     "companyInitials" TEXT NOT NULL DEFAULT '',
ADD COLUMN     "companyLogoUrl" TEXT;

