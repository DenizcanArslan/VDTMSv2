/*
  Warnings:

  - You are about to drop the column `createdAt` on the `DriverHoliday` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `FrequentLocation` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `FrequentLocation` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `Transport` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `Transport` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `TransportLicense` table. All the data in the column will be lost.
  - You are about to drop the column `updatedAt` on the `TransportLicense` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `TransportSlot` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `VehicleInspection` table. All the data in the column will be lost.
  - You are about to drop the column `createdAt` on the `VehicleMaintenance` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "DriverHoliday" DROP COLUMN "createdAt";

-- AlterTable
ALTER TABLE "FrequentLocation" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "PlanningSlot" ADD COLUMN     "driverId" INTEGER,
ALTER COLUMN "order" SET DEFAULT 0;

-- AlterTable
ALTER TABLE "Transport" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "TransportLicense" DROP COLUMN "createdAt",
DROP COLUMN "updatedAt";

-- AlterTable
ALTER TABLE "TransportSlot" DROP COLUMN "createdAt";

-- AlterTable
ALTER TABLE "VehicleInspection" DROP COLUMN "createdAt";

-- AlterTable
ALTER TABLE "VehicleMaintenance" DROP COLUMN "createdAt";

-- AddForeignKey
ALTER TABLE "PlanningSlot" ADD CONSTRAINT "PlanningSlot_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE SET NULL ON UPDATE CASCADE;
