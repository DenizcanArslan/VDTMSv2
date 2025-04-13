-- AlterTable
ALTER TABLE "PlanningSlot" ADD COLUMN     "truckId" INTEGER;

-- AddForeignKey
ALTER TABLE "PlanningSlot" ADD CONSTRAINT "PlanningSlot_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;
