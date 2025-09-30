-- Drop legacy dimension fields now captured via variant facets
ALTER TABLE "ProductVariant"
  DROP COLUMN IF EXISTS "size",
  DROP COLUMN IF EXISTS "concentration",
  DROP COLUMN IF EXISTS "packaging";
