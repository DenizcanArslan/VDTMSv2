/*
  Warnings:

  - You are about to drop the column `customLocation` on the `TransportDestination` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "Driver" ADD COLUMN     "adrExpireDate" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "TransportDestination" DROP COLUMN "customLocation";

-- CreateTable
CREATE TABLE "Price" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "basePrice" DOUBLE PRECISION NOT NULL,
    "dieselSurcharge" DOUBLE PRECISION,
    "roadTax" DOUBLE PRECISION,
    "gensetPrice" DOUBLE PRECISION,
    "frequentLocationId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Price_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Price" ADD CONSTRAINT "Price_frequentLocationId_fkey" FOREIGN KEY ("frequentLocationId") REFERENCES "FrequentLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
