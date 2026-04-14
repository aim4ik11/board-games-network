-- Free-text venue label (replaces PlaySessionLocationKind).
ALTER TABLE "PlaySession" ADD COLUMN "location" TEXT;

UPDATE "PlaySession" SET "location" = "locationKind"::text;

ALTER TABLE "PlaySession" DROP COLUMN "locationKind";

DROP TYPE "PlaySessionLocationKind";
