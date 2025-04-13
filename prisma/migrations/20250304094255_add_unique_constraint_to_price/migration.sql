/*
  Warnings:

  - A unique constraint covering the columns `[clientId,frequentLocationId]` on the table `Price` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "Price_clientId_frequentLocationId_key" ON "Price"("clientId", "frequentLocationId");
