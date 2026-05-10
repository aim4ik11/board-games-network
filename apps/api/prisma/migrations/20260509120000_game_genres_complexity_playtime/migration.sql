-- CreateTable
CREATE TABLE "GameGenre" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,

    CONSTRAINT "GameGenre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BoardGameGenre" (
    "gameId" TEXT NOT NULL,
    "genreId" TEXT NOT NULL,

    CONSTRAINT "BoardGameGenre_pkey" PRIMARY KEY ("gameId","genreId")
);

-- CreateIndex
CREATE UNIQUE INDEX "GameGenre_slug_key" ON "GameGenre"("slug");

-- CreateIndex
CREATE INDEX "BoardGameGenre_genreId_idx" ON "BoardGameGenre"("genreId");

-- AddForeignKey
ALTER TABLE "BoardGameGenre" ADD CONSTRAINT "BoardGameGenre_gameId_fkey" FOREIGN KEY ("gameId") REFERENCES "BoardGame"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BoardGameGenre" ADD CONSTRAINT "BoardGameGenre_genreId_fkey" FOREIGN KEY ("genreId") REFERENCES "GameGenre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable
ALTER TABLE "BoardGame" ADD COLUMN "playTimeMax" INTEGER;
ALTER TABLE "BoardGame" ADD COLUMN "complexity" DOUBLE PRECISION;
