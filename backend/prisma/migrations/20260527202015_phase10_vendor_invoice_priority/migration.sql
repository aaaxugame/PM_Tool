-- CreateEnum
CREATE TYPE "InvoiceType" AS ENUM ('CLIENT', 'VENDOR');

-- CreateEnum
CREATE TYPE "PaymentMode" AS ENUM ('MILESTONE', 'TASK');

-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "InvoiceStatus" ADD VALUE 'SUBMITTED';
ALTER TYPE "InvoiceStatus" ADD VALUE 'APPROVED';
ALTER TYPE "InvoiceStatus" ADD VALUE 'REJECTED';

-- DropForeignKey
ALTER TABLE "invoices" DROP CONSTRAINT "invoices_clientId_fkey";

-- AlterTable
ALTER TABLE "invoices" ADD COLUMN     "approvedAt" TIMESTAMP(3),
ADD COLUMN     "approvedById" INTEGER,
ADD COLUMN     "invoiceType" "InvoiceType" NOT NULL DEFAULT 'CLIENT',
ADD COLUMN     "rejectionNote" TEXT,
ADD COLUMN     "vendorId" INTEGER,
ADD COLUMN     "vendorQuoteId" INTEGER,
ALTER COLUMN "triggerType" DROP NOT NULL,
ALTER COLUMN "clientId" DROP NOT NULL;

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "priority" "Priority" NOT NULL DEFAULT 'MEDIUM';

-- AlterTable
ALTER TABLE "users" ADD COLUMN     "jobTitle" TEXT;

-- AlterTable
ALTER TABLE "vendor_quotes" ADD COLUMN     "hourlyRate" DECIMAL(10,2),
ADD COLUMN     "milestoneId" INTEGER,
ADD COLUMN     "paymentMode" "PaymentMode" NOT NULL DEFAULT 'TASK';

-- AddForeignKey
ALTER TABLE "vendor_quotes" ADD CONSTRAINT "vendor_quotes_milestoneId_fkey" FOREIGN KEY ("milestoneId") REFERENCES "milestones"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "clients"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_vendorId_fkey" FOREIGN KEY ("vendorId") REFERENCES "vendors"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_vendorQuoteId_fkey" FOREIGN KEY ("vendorQuoteId") REFERENCES "vendor_quotes"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "invoices" ADD CONSTRAINT "invoices_approvedById_fkey" FOREIGN KEY ("approvedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;
