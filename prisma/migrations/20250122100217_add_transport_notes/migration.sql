-- CreateTable
CREATE TABLE "TransportNote" (
    "id" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "color" TEXT NOT NULL,
    "transportId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransportNote_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransportNote_transportId_idx" ON "TransportNote"("transportId");

-- AddForeignKey
ALTER TABLE "TransportNote" ADD CONSTRAINT "TransportNote_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "Transport"("id") ON DELETE CASCADE ON UPDATE CASCADE;
