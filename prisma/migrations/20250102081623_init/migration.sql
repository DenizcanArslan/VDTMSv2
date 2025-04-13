-- CreateEnum
CREATE TYPE "LoRo" AS ENUM ('LO', 'RO', 'TBN');

-- CreateEnum
CREATE TYPE "GENSET" AS ENUM ('NO', 'YES');

-- CreateEnum
CREATE TYPE "ADR" AS ENUM ('NO', 'YES');

-- CreateEnum
CREATE TYPE "CargoCard" AS ENUM ('NO', 'YES');

-- CreateEnum
CREATE TYPE "HolidayReason" AS ENUM ('ANNUAL_LEAVE', 'SICK_LEAVE', 'UNPAID_LEAVE', 'BEREAVEMENT_LEAVE', 'MARRIAGE_LEAVE', 'OTHER');

-- CreateEnum
CREATE TYPE "Status" AS ENUM ('COMPLETED', 'NOT_COMPLETED');

-- CreateTable
CREATE TABLE "Admin" (
    "id" TEXT NOT NULL,
    "username" TEXT NOT NULL,

    CONSTRAINT "Admin_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Driver" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "surname" TEXT NOT NULL,
    "birthday" TIMESTAMP(3),
    "phoneNumber" TEXT,
    "alphaPassNumber" TEXT,
    "alphaPassExpireDate" TIMESTAMP(3),
    "driverLicenseExpireDate" TIMESTAMP(3),
    "adr" "ADR" NOT NULL,
    "cargoCard" "CargoCard",
    "cargoCardNumber" TEXT,
    "tachographExpireDate" TIMESTAMP(3),
    "nickName" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Driver_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Truck" (
    "id" SERIAL NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "model" TEXT,
    "modelYear" INTEGER,
    "chasisNumber" TEXT,
    "genset" "GENSET" NOT NULL,
    "nickName" TEXT NOT NULL,
    "insuranceExpireDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Truck_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Trailer" (
    "id" SERIAL NOT NULL,
    "licensePlate" TEXT NOT NULL,
    "model" TEXT,
    "modelYear" INTEGER,
    "chasisNumber" TEXT,
    "genset" "GENSET" NOT NULL,
    "nickName" TEXT NOT NULL,
    "insuranceExpireDate" TIMESTAMP(3),
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Trailer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Client" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT,
    "vatNumber" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Client_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Quay" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "quayNumber" INTEGER,
    "isLoRo" "LoRo",
    "address" TEXT,
    "terminalFee" DECIMAL(10,2),
    "workingHoursStart" TEXT,
    "workingHoursEnd" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "Quay_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FrequentLocation" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT,
    "country" TEXT NOT NULL,
    "postalCode" TEXT,
    "km" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FrequentLocation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportDestination" (
    "id" SERIAL NOT NULL,
    "transportId" INTEGER NOT NULL,
    "frequentLocationId" INTEGER,
    "customLocation" TEXT,
    "order" INTEGER NOT NULL,

    CONSTRAINT "TransportDestination_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Transport" (
    "id" SERIAL NOT NULL,
    "clientId" INTEGER NOT NULL,
    "transportOrderNumber" TEXT NOT NULL,
    "bookingReference" TEXT,
    "containerNumber" TEXT,
    "loadingUnloadingReference" TEXT,
    "containerType" TEXT,
    "genset" "GENSET" NOT NULL,
    "adr" "ADR" NOT NULL DEFAULT 'NO',
    "transportDate" TIMESTAMP(3) NOT NULL,
    "transportTime" TIMESTAMP(3),
    "pickUpQuayId" INTEGER,
    "dropOffQuayId" INTEGER,
    "status" TEXT NOT NULL DEFAULT 'NOT_COMPLETED',
    "slotId" INTEGER,
    "slotOrder" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "order" INTEGER NOT NULL DEFAULT 0,
    "type" TEXT NOT NULL,
    "truckId" INTEGER,
    "trailerId" INTEGER,

    CONSTRAINT "Transport_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TransportLicense" (
    "id" SERIAL NOT NULL,
    "licenseNumber" TEXT NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "truckId" INTEGER,

    CONSTRAINT "TransportLicense_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmergencyContact" (
    "id" SERIAL NOT NULL,
    "phoneNumber" TEXT,
    "name" TEXT,
    "clientId" INTEGER NOT NULL,

    CONSTRAINT "EmergencyContact_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "InvoiceMail" (
    "id" SERIAL NOT NULL,
    "email" TEXT,
    "clientId" INTEGER NOT NULL,

    CONSTRAINT "InvoiceMail_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleInspection" (
    "id" SERIAL NOT NULL,
    "inspectionDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "cost" DECIMAL(10,2),
    "truckId" INTEGER,
    "trailerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" "Status" NOT NULL DEFAULT 'NOT_COMPLETED',

    CONSTRAINT "VehicleInspection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleMaintenance" (
    "id" SERIAL NOT NULL,
    "maintenanceDate" TIMESTAMP(3) NOT NULL,
    "notes" TEXT,
    "cost" DECIMAL(10,2),
    "truckId" INTEGER,
    "trailerId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "status" "Status" NOT NULL DEFAULT 'NOT_COMPLETED',

    CONSTRAINT "VehicleMaintenance_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DriverHoliday" (
    "id" SERIAL NOT NULL,
    "startDate" TIMESTAMP(3) NOT NULL,
    "endDate" TIMESTAMP(3) NOT NULL,
    "reason" "HolidayReason" NOT NULL,
    "notes" TEXT,
    "driverId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "DriverHoliday_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PlanningSlot" (
    "id" SERIAL NOT NULL,
    "date" TIMESTAMP(3) NOT NULL,
    "slotNumber" INTEGER NOT NULL,
    "order" INTEGER NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT true,

    CONSTRAINT "PlanningSlot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Admin_username_key" ON "Admin"("username");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_alphaPassNumber_key" ON "Driver"("alphaPassNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Driver_nickName_key" ON "Driver"("nickName");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_licensePlate_key" ON "Truck"("licensePlate");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_chasisNumber_key" ON "Truck"("chasisNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Truck_nickName_key" ON "Truck"("nickName");

-- CreateIndex
CREATE UNIQUE INDEX "Trailer_licensePlate_key" ON "Trailer"("licensePlate");

-- CreateIndex
CREATE UNIQUE INDEX "Trailer_chasisNumber_key" ON "Trailer"("chasisNumber");

-- CreateIndex
CREATE UNIQUE INDEX "Trailer_nickName_key" ON "Trailer"("nickName");

-- CreateIndex
CREATE UNIQUE INDEX "TransportDestination_transportId_order_key" ON "TransportDestination"("transportId", "order");

-- CreateIndex
CREATE INDEX "Transport_slotId_slotOrder_idx" ON "Transport"("slotId", "slotOrder");

-- CreateIndex
CREATE UNIQUE INDEX "TransportLicense_licenseNumber_key" ON "TransportLicense"("licenseNumber");

-- CreateIndex
CREATE UNIQUE INDEX "TransportLicense_truckId_key" ON "TransportLicense"("truckId");

-- CreateIndex
CREATE UNIQUE INDEX "PlanningSlot_date_order_key" ON "PlanningSlot"("date", "order");

-- AddForeignKey
ALTER TABLE "TransportDestination" ADD CONSTRAINT "TransportDestination_transportId_fkey" FOREIGN KEY ("transportId") REFERENCES "Transport"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportDestination" ADD CONSTRAINT "TransportDestination_frequentLocationId_fkey" FOREIGN KEY ("frequentLocationId") REFERENCES "FrequentLocation"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_pickUpQuayId_fkey" FOREIGN KEY ("pickUpQuayId") REFERENCES "Quay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_dropOffQuayId_fkey" FOREIGN KEY ("dropOffQuayId") REFERENCES "Quay"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_slotId_fkey" FOREIGN KEY ("slotId") REFERENCES "PlanningSlot"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Transport" ADD CONSTRAINT "Transport_trailerId_fkey" FOREIGN KEY ("trailerId") REFERENCES "Trailer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransportLicense" ADD CONSTRAINT "TransportLicense_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmergencyContact" ADD CONSTRAINT "EmergencyContact_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoiceMail" ADD CONSTRAINT "InvoiceMail_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleInspection" ADD CONSTRAINT "VehicleInspection_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleInspection" ADD CONSTRAINT "VehicleInspection_trailerId_fkey" FOREIGN KEY ("trailerId") REFERENCES "Trailer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMaintenance" ADD CONSTRAINT "VehicleMaintenance_truckId_fkey" FOREIGN KEY ("truckId") REFERENCES "Truck"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleMaintenance" ADD CONSTRAINT "VehicleMaintenance_trailerId_fkey" FOREIGN KEY ("trailerId") REFERENCES "Trailer"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DriverHoliday" ADD CONSTRAINT "DriverHoliday_driverId_fkey" FOREIGN KEY ("driverId") REFERENCES "Driver"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
