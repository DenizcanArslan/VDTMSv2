-- AlterTable
ALTER TABLE "Transport" ADD COLUMN     "requiresT1" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "t1Received" BOOLEAN NOT NULL DEFAULT false;
