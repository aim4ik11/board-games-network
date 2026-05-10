-- Add image URLs for game reviews
ALTER TABLE "Review"
ADD COLUMN "imageUrls" TEXT[] DEFAULT ARRAY[]::TEXT[] NOT NULL;
