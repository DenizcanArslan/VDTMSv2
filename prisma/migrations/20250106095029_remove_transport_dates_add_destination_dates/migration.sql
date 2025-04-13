/*
  Warnings:

  - You are about to drop the column `transportDate` on the `Transport` table. All the data in the column will be lost.
  - You are about to drop the column `transportTime` on the `Transport` table. All the data in the column will be lost.
  - Added the required column `destinationDate` to the `TransportDestination` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Transport" DROP COLUMN "transportDate",
DROP COLUMN "transportTime";

-- AlterTable
ALTER TABLE "TransportDestination" ADD COLUMN     "destinationDate" TIMESTAMP(3) NOT NULL,
ADD COLUMN     "destinationTime" TIMESTAMP(3);
