/*
  Warnings:

  - You are about to drop the column `slotId` on the `Transport` table. All the data in the column will be lost.
  - You are about to drop the column `slotOrder` on the `Transport` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "Transport" DROP CONSTRAINT "Transport_slotId_fkey";

-- DropIndex
DROP INDEX "Transport_slotId_slotOrder_idx";

-- AlterTable
ALTER TABLE "Transport" DROP COLUMN "slotId",
DROP COLUMN "slotOrder";

-- CreateTable
CREATE TABLE "TransportSlot" (
    "id" SERIAL NOT NULL,
    "transportId" INTEGER NOT NULL,
    "slotId" INTEGER NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "slotOrder" INTEGER NOT NULL,

    CONSTRAINT "TransportSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TransportSlot_transportId_date_key" ON "TransportSlot"("transportId", "date");

-- AddForeignKey
ALTER TABLE "TransportSlot" ADD CONSTRAINT "TransportSlot_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "Transport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportSlot" ADD CONSTRAINT "TransportSlot_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "PlanningSlot"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
