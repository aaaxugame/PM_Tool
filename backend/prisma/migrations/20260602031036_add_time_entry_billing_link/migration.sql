-- AlterTable
ALTER TABLE "invoice_line_items" ADD COLUMN     "timeEntryId" INTEGER;

-- AlterTable
ALTER TABLE "time_entries" ADD COLUMN     "isBilled" BOOLEAN NOT NULL DEFAULT false;

-- AddForeignKey
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_timeEntryId_fkey" FOREIGN KEY ("timeEntryId") REFERENCES "time_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;
