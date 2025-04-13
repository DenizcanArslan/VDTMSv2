-- DropForeignKey
ALTER TABLE "TransportSlot" DROP CONSTRAINT "TransportSlot_slotId_fkey";

-- DropIndex
DROP INDEX "TransportSlot_transportId_date_key";

-- AlterTable
ALTER TABLE "TransportSlot" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ALTER COLUMN "slotId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "TransportSlot_transportId_idx" ON "TransportSlot"("transportId");

-- CreateIndex
CREATE INDEX "TransportSlot_slotId_idx" ON "TransportSlot"("slotId");

-- AddForeignKey
ALTER TABLE "TransportSlot" ADD CONSTRAINT "TransportSlot_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "PlanningSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;
