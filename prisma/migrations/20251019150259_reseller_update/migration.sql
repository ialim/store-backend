-- AlterTable
ALTER TABLE "public"."FulfillmentRiderInterest" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- AlterTable (guarded for environments without SystemSetting table)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.tables
    WHERE table_schema = 'public'
      AND table_name = 'SystemSetting'
  ) THEN
    ALTER TABLE "public"."SystemSetting"
      ALTER COLUMN "id" DROP DEFAULT,
      ALTER COLUMN "createdAt" SET DATA TYPE TIMESTAMP(3),
      ALTER COLUMN "updatedAt" DROP DEFAULT,
      ALTER COLUMN "updatedAt" SET DATA TYPE TIMESTAMP(3);
  END IF;
END
$$;
