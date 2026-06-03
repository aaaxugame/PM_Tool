-- Note: TIME_AND_MATERIALS and MILESTONE already added in previous attempt.
-- This migration only runs the rename/cleanup steps.

-- Migrate existing HOURLY data to TIME_AND_MATERIALS
UPDATE "projects" SET "billingMethod" = 'TIME_AND_MATERIALS' WHERE "billingMethod" = 'HOURLY';

-- Drop the default that depends on the enum, then convert column to text
ALTER TABLE "projects" ALTER COLUMN "billingMethod" DROP DEFAULT;
ALTER TABLE "projects" ALTER COLUMN "billingMethod" TYPE text;

-- Recreate the enum without HOURLY
DROP TYPE "BillingMethod";
CREATE TYPE "BillingMethod" AS ENUM ('FIXED', 'TIME_AND_MATERIALS', 'MILESTONE', 'MIXED');

-- Restore column type and default
ALTER TABLE "projects" ALTER COLUMN "billingMethod" TYPE "BillingMethod" USING ("billingMethod"::"BillingMethod");
ALTER TABLE "projects" ALTER COLUMN "billingMethod" SET DEFAULT 'TIME_AND_MATERIALS'::"BillingMethod";
