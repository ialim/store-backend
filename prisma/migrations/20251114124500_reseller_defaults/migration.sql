-- Set defaults for reseller profile tier and credit limit
ALTER TABLE "ResellerProfile"
    ALTER COLUMN "tier" SET DEFAULT 'BRONZE',
    ALTER COLUMN "creditLimit" SET DEFAULT 0;
