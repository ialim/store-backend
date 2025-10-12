-- Replace the partial unique index on ProductVariant.legacyArticleCode with a standard
-- unique index so Prisma's @unique constraint matches the database structure.
DO $$
BEGIN
  IF to_regclass('public."ProductVariant_legacyArticleCode_key"') IS NOT NULL THEN
    EXECUTE 'DROP INDEX "public"."ProductVariant_legacyArticleCode_key"';
  END IF;
END
$$;

CREATE UNIQUE INDEX "ProductVariant_legacyArticleCode_key"
  ON "public"."ProductVariant"("legacyArticleCode");
