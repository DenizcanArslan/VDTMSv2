-- AlterTable
ALTER TABLE "Transport" ADD COLUMN     "isDeleted" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "isRestored" BOOLEAN NOT NULL DEFAULT false;
