-- CreateTable
CREATE TABLE "TrailerParking" (
    "id" SERIAL NOT NULL,
    "trailerId" INTEGER NOT NULL,
    "locationId" INTEGER NOT NULL,
    "parkedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TrailerParking_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "TrailerParking_trailerId_key" ON "TrailerParking"("trailerId");

-- CreateIndex
CREATE INDEX "TrailerParking_trailerId_idx" ON "TrailerParking"("trailerId");

-- CreateIndex
CREATE INDEX "TrailerParking_locationId_idx" ON "TrailerParking"("locationId");

-- AddForeignKey
ALTER TABLE "TrailerParking" ADD CONSTRAINT "TrailerParking_trailerId_fkey" FOREIGN KEY ("trailerId") REFERENCES "Trailer"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TrailerParking" ADD CONSTRAINT "TrailerParking_locationId_fkey" FOREIGN KEY ("locationId") REFERENCES "CutLocation"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
