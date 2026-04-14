-- CreateEnum
CREATE TYPE "PlaySessionVisibility" AS ENUM ('PUBLIC', 'FRIENDS', 'INVITE_ONLY');

-- AlterTable
ALTER TABLE "PlaySession" ADD COLUMN     "visibility" "PlaySessionVisibility" NOT NULL DEFAULT 'PUBLIC';

-- CreateTable
CREATE TABLE "PlaySessionInvitation" (
    "id" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "invitedUserId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PlaySessionInvitation_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "PlaySessionInvitation_invitedUserId_idx" ON "PlaySessionInvitation"("invitedUserId");

-- CreateIndex
CREATE UNIQUE INDEX "PlaySessionInvitation_sessionId_invitedUserId_key" ON "PlaySessionInvitation"("sessionId", "invitedUserId");

-- AddForeignKey
ALTER TABLE "PlaySessionInvitation" ADD CONSTRAINT "PlaySessionInvitation_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "PlaySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PlaySessionInvitation" ADD CONSTRAINT "PlaySessionInvitation_invitedUserId_fkey" FOREIGN KEY ("invitedUserId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
