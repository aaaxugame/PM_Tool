-- Add REVISION_REQUESTED to InvoiceStatus
ALTER TYPE "InvoiceStatus" ADD VALUE 'REVISION_REQUESTED';

-- Rename LineItemType.HOURLY to TIME_AND_MATERIALS
ALTER TYPE "LineItemType" ADD VALUE 'TIME_AND_MATERIALS';
UPDATE "invoice_line_items" SET "lineItemType" = 'TIME_AND_MATERIALS' WHERE "lineItemType" = 'HOURLY';
ALTER TABLE "invoice_line_items" ALTER COLUMN "lineItemType" DROP DEFAULT;
ALTER TABLE "invoice_line_items" ALTER COLUMN "lineItemType" TYPE text;
DROP TYPE "LineItemType";
CREATE TYPE "LineItemType" AS ENUM ('TIME_AND_MATERIALS', 'FIXED', 'EXPENSE', 'ADJUSTMENT');
ALTER TABLE "invoice_line_items" ALTER COLUMN "lineItemType" TYPE "LineItemType" USING ("lineItemType"::"LineItemType");
ALTER TABLE "invoice_line_items" ALTER COLUMN "lineItemType" SET DEFAULT 'FIXED'::"LineItemType";

-- Add version and revisionNote to Invoice
ALTER TABLE "invoices" ADD COLUMN "version" INTEGER NOT NULL DEFAULT 1;
ALTER TABLE "invoices" ADD COLUMN "revisionNote" TEXT;
ALTER TABLE "invoices" ADD COLUMN "parentInvoiceId" INTEGER;
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_parentInvoiceId_fkey" FOREIGN KEY ("parentInvoiceId") REFERENCES "invoices"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Add receiptNote to InvoiceLineItem
ALTER TABLE "invoice_line_items" ADD COLUMN "receiptNote" TEXT;
