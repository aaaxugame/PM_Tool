-- AddUniqueConstraint: each TimeEntry can appear on at most one InvoiceLineItem
ALTER TABLE "invoice_line_items" ADD CONSTRAINT "invoice_line_items_timeEntryId_key" UNIQUE ("timeEntryId");
