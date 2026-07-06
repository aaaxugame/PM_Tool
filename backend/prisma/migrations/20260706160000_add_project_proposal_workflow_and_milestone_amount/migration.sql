-- CreateEnum
CREATE TYPE "ProposalStatus" AS ENUM ('DRAFT', 'SENT', 'APPROVED', 'DECLINED', 'REVISION_REQUESTED');

-- AlterTable
ALTER TABLE "projects" ADD COLUMN     "proposalStatus" "ProposalStatus" NOT NULL DEFAULT 'DRAFT',
ADD COLUMN     "proposalVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "proposalSentAt" TIMESTAMP(3),
ADD COLUMN     "proposalRespondedAt" TIMESTAMP(3),
ADD COLUMN     "proposalRevisionNote" TEXT;

-- AlterTable
ALTER TABLE "milestones" ADD COLUMN     "amount" DECIMAL(12,2);
