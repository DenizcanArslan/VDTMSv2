-- CreateEnum
CREATE TYPE "CutType" AS ENUM ('TRAILER', 'CONTAINER', 'BOTH');

-- AlterTable
ALTER TABLE "Transport" ADD COLUMN     "isCut" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "originalTransportId" INTEGER;

-- CreateTable
CREATE TABLE "CutLocation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "isDefault" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CutLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CutInfo" (
    "id" SERIAL NOT NULL,
    "transportId" INTEGER NOT NULL,
    "cutType" TEXT NOT NULL,
    "cutStartDate" TIMESTAMP(3) NOT NULL,
    "cutEndDate" TIMESTAMP(3),
    "locationId" INTEGER,
    "customLocation" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CutInfo_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "CutInfo_transportId_key" ON "CutInfo"("transportId");

-- AddForeignKey
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_originalTransportId_fkey" FOREIGN KEY ("originalTransportId") REFERENCES "Transport"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CutInfo" ADD CONSTRAINT "CutInfo_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "Transport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CutInfo" ADD CONSTRAINT "CutInfo_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "CutLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;
