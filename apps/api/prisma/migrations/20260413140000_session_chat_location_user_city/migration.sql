-- CreateEnum
CREATE TYPE "PlaySessionLocationKind" AS ENUM ('CAFE', 'CLUB', 'HOME', 'ONLINE', 'OTHER');

-- AlterEnum
ALTER TYPE "ConversationType" ADD VALUE 'SESSION';

-- DropForeignKey
ALTER TABLE "UserPreference" DROP CONSTRAINT "UserPreference_userId_fkey";

-- AlterTable
ALTER TABLE "Conversation" ADD COLUMN "playSessionId" TEXT;

-- AlterTable
ALTER TABLE "PlaySession" DROP COLUMN "latitude",
DROP COLUMN "locationText",
DROP COLUMN "longitude",
ADD COLUMN "locationKind" "PlaySessionLocationKind" NOT NULL DEFAULT 'OTHER';

-- AlterTable
ALTER TABLE "User" ADD COLUMN "city" TEXT;

-- DropTable
DROP TABLE "UserPreference";

-- CreateIndex
CREATE UNIQUE INDEX "Conversation_playSessionId_key" ON "Conversation"("playSessionId");

-- AddForeignKey
ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_playSessionId_fkey" FOREIGN KEY ("playSessionId") REFERENCES "PlaySession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
