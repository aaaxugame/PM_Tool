-- CreateEnum
CREATE TYPE "ProjectApproval" AS ENUM ('PENDING', 'APPROVED', 'REJECTED');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "approvalStatus" "ProjectApproval" NOT NULL DEFAULT 'PENDING',
ADD COLUMN     "estimatedHours" DECIMAL(8,2),
ADD COLUMN     "hourlyRate" DECIMAL(10,2),
ADD COLUMN     "proposedCost" DECIMAL(12,2),
ADD COLUMN     "proposedWorkers" INTEGER;
