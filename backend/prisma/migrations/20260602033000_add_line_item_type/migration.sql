-- CreateEnum
CREATE TYPE "LineItemType" AS ENUM ('HOURLY', 'FIXED', 'EXPENSE', 'ADJUSTMENT');

-- AddColumn
ALTER TABLE "invoice_line_items" ADD COLUMN "lineItemType" "LineItemType" NOT NULL DEFAULT 'FIXED';
