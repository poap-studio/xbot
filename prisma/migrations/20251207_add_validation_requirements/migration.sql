-- AlterTable
ALTER TABLE "projects" ADD COLUMN "requireUniqueCode" BOOLEAN NOT NULL DEFAULT true;
ALTER TABLE "projects" ADD COLUMN "requireImage" BOOLEAN NOT NULL DEFAULT true;
