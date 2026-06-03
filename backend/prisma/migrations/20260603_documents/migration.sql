CREATE TABLE "documents" (
  "id"                SERIAL PRIMARY KEY,
  "filename"          TEXT NOT NULL,
  "storedName"        TEXT NOT NULL,
  "mimeType"          TEXT NOT NULL,
  "size"              INTEGER NOT NULL,
  "url"               TEXT NOT NULL,
  "createdAt"         TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "uploadedById"      INTEGER NOT NULL,
  "projectId"         INTEGER,
  "invoiceId"         INTEGER,
  "invoiceLineItemId" INTEGER,
  "milestoneId"       INTEGER,

  CONSTRAINT "documents_uploadedById_fkey"      FOREIGN KEY ("uploadedById")      REFERENCES "users"("id")              ON DELETE RESTRICT ON UPDATE CASCADE,
  CONSTRAINT "documents_projectId_fkey"         FOREIGN KEY ("projectId")         REFERENCES "projects"("id")           ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "documents_invoiceId_fkey"         FOREIGN KEY ("invoiceId")         REFERENCES "invoices"("id")           ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "documents_invoiceLineItemId_fkey" FOREIGN KEY ("invoiceLineItemId") REFERENCES "invoice_line_items"("id") ON DELETE CASCADE  ON UPDATE CASCADE,
  CONSTRAINT "documents_milestoneId_fkey"       FOREIGN KEY ("milestoneId")       REFERENCES "milestones"("id")         ON DELETE CASCADE  ON UPDATE CASCADE
);
