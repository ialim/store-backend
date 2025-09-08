-- Add PROCESSING to OutboxStatus enum for safer outbox claims
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'OutboxStatus' AND e.enumlabel = 'PROCESSING'
  ) THEN
    ALTER TYPE "OutboxStatus" ADD VALUE 'PROCESSING';
  END IF;
END$$;

