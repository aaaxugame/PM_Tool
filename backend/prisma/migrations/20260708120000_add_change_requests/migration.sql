-- CreateEnum
CREATE TYPE "ChangeRequestStatus" AS ENUM ('SENT', 'APPROVED', 'DECLINED', 'REVISION_REQUESTED');

-- CreateTable
CREATE TABLE "change_requests" (
    "id" SERIAL NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "costDelta" DECIMAL(12,2) NOT NULL,
    "milestones" JSONB NOT NULL,
    "status" "ChangeRequestStatus" NOT NULL DEFAULT 'SENT',
    "sentAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "responseNote" TEXT,
    "projectId" INTEGER NOT NULL,
    "requestedById" INTEGER NOT NULL,
    "respondedById" INTEGER,
    "supersedesId" INTEGER,

    CONSTRAINT "change_requests_pkey" PRIMARY KEY ("id")
);

-- AlterTable
ALTER TABLE "milestones" ADD COLUMN "changeRequestId" INTEGER;

-- CreateIndex
CREATE UNIQUE INDEX "change_requests_supersedesId_key" ON "change_requests"("supersedesId");

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_requestedById_fkey" FOREIGN KEY ("requestedById") REFERENCES "users"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_respondedById_fkey" FOREIGN KEY ("respondedById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "change_requests" ADD CONSTRAINT "change_requests_supersedesId_fkey" FOREIGN KEY ("supersedesId") REFERENCES "change_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "milestones" ADD CONSTRAINT "milestones_changeRequestId_fkey" FOREIGN KEY ("changeRequestId") REFERENCES "change_requests"("id") ON DELETE SET NULL ON UPDATE CASCADE;
