ALTER TABLE "Conversation"
ADD COLUMN "title" TEXT;

UPDATE "Conversation" AS c
SET "title" = ps."title"
FROM "PlaySession" AS ps
WHERE c."playSessionId" = ps."id"
  AND c."type" = 'SESSION';
