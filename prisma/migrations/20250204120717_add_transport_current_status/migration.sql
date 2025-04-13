/*
  Warnings:

  - You are about to drop the column `isActive` on the `Transport` table. All the data in the column will be lost.

*/
-- CreateEnum
CREATE TYPE "TransportCurrentStatus" AS ENUM ('PLANNED', 'ONGOING', 'COMPLETED');

-- AlterTable
ALTER TABLE "Transport" DROP COLUMN "isActive",
ADD COLUMN     "currentStatus" "TransportCurrentStatus" NOT NULL DEFAULT 'PLANNED',
ADD COLUMN     "dropOffEta" TIMESTAMP(3),
ADD COLUMN     "pickUpEta" TIMESTAMP(3),
ADD COLUMN     "sentToDriver" BOOLEAN NOT NULL DEFAULT false;

-- AlterTable
ALTER TABLE "TransportDestination" ADD COLUMN     "eta" TIMESTAMP(3);
