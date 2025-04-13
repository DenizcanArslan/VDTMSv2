/*
  Warnings:

  - Changed the type of `type` on the `Transport` table. No cast exists, the column would be dropped and recreated, which cannot be done if there is data, since the column is required.

*/
-- CreateEnum
CREATE TYPE "TransportType" AS ENUM ('IMPORT', 'EXPORT', 'SHUNT');

-- Safely convert the existing data
-- First, add a temporary column with the new type
ALTER TABLE "Transport" ADD COLUMN "typeEnum" "TransportType";

-- Update the temporary column based on the existing values
UPDATE "Transport" SET "typeEnum" = 'IMPORT'::"TransportType" WHERE "type" = 'IMPORT';
UPDATE "Transport" SET "typeEnum" = 'EXPORT'::"TransportType" WHERE "type" = 'EXPORT';
-- If there are any other values, you might want to set them to a default
UPDATE "Transport" SET "typeEnum" = 'IMPORT'::"TransportType" WHERE "typeEnum" IS NULL;

-- Make the temporary column NOT NULL
ALTER TABLE "Transport" ALTER COLUMN "typeEnum" SET NOT NULL;

-- Drop the original column and rename the temporary one
ALTER TABLE "Transport" DROP COLUMN "type";
ALTER TABLE "Transport" RENAME COLUMN "typeEnum" TO "type";
