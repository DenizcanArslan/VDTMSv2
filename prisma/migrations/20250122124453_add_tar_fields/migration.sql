-- CreateEnum
CREATE TYPE "TarType" AS ENUM ('PICKUP', 'DROPOFF', 'BOTH', 'NONE');

-- AlterTable
ALTER TABLE "Quay" ADD COLUMN     "defaultTar" TEXT,
ADD COLUMN     "tarType" "TarType" DEFAULT 'NONE';

-- AlterTable
ALTER TABLE "Transport" ADD COLUMN     "dropOffTar" TEXT,
ADD COLUMN     "pickUpTar" TEXT;
