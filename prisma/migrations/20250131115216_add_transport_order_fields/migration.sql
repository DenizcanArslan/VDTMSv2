-- AlterTable
ALTER TABLE "Transport" ADD COLUMN     "hasTransportOrder" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "transportOrderReceivedAt" TIMESTAMP(3);
