-- CreateEnum
CREATE TYPE "TarColor" AS ENUM ('RED', 'ORANGE', 'YELLOW', 'GREEN', 'BLUE', 'PURPLE', 'TEAL', 'GRAY');

-- AlterTable
ALTER TABLE "Quay" ADD COLUMN     "tarNegativeColor" "TarColor" DEFAULT 'RED',
ADD COLUMN     "tarPositiveColor" "TarColor" DEFAULT 'GREEN';

-- AlterTable
ALTER TABLE "Transport" ADD COLUMN     "dropOffTarPositive" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "pickUpTarPositive" BOOLEAN NOT NULL DEFAULT false;
