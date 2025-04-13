/*
  Warnings:

  - The `status` column on the `Transport` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- CreateEnum
CREATE TYPE "TransportStatus" AS ENUM ('ACTIVE', 'ON_HOLD');

-- AlterTable
ALTER TABLE "Transport" DROP COLUMN "status",
ADD COLUMN     "status" "TransportStatus" NOT NULL DEFAULT 'ACTIVE';
