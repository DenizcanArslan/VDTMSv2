import { PrismaClient  } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  // Admin
  await prisma.admin.createMany({
    data: [
      { id: 'admin-1', username: 'admin1' },
      { id: 'admin-2', username: 'admin2' },
      { id: 'admin-3', username: 'admin3' },
      { id: 'admin-4', username: 'admin4' },
    ],
  });

  // Driver
  await prisma.driver.createMany({
    data: [
      { name: 'Driver1', surname: 'Surname1', adr: 'YES' },
      { name: 'Driver2', surname: 'Surname2', adr: 'NO' },
      { name: 'Driver3', surname: 'Surname3', adr: 'YES' },
      { name: 'Driver4', surname: 'Surname4', adr: 'NO' },
    ],
  });

  // Truck
  await prisma.truck.createMany({
    data: [
      { licensePlate: 'TRUCK-001', model: 'Model A', modelYear: 2015, chasisNumber: 'CHS001', genset: 'YES' },
      { licensePlate: 'TRUCK-002', model: 'Model B', modelYear: 2018, chasisNumber: 'CHS002', genset: 'NO' },
      { licensePlate: 'TRUCK-003', model: 'Model C', modelYear: 2020, chasisNumber: 'CHS003', genset: 'YES' },
      { licensePlate: 'TRUCK-004', model: 'Model D', modelYear: 2017, chasisNumber: 'CHS004', genset: 'NO' },
    ],
  });

  // Trailer
  await prisma.trailer.createMany({
    data: [
      { licensePlate: 'TRAILER-001', model: 'Trailer A', modelYear: 2012, chasisNumber: 'TCH001', genset: 'YES' },
      { licensePlate: 'TRAILER-002', model: 'Trailer B', modelYear: 2015, chasisNumber: 'TCH002', genset: 'NO' },
      { licensePlate: 'TRAILER-003', model: 'Trailer C', modelYear: 2019, chasisNumber: 'TCH003', genset: 'YES' },
      { licensePlate: 'TRAILER-004', model: 'Trailer D', modelYear: 2021, chasisNumber: 'TCH004', genset: 'NO' },
    ],
  });

  // Client
  await prisma.client.createMany({
    data: [
      { name: 'Client A' },
      { name: 'Client B' },
      { name: 'Client C' },
      { name: 'Client D' },
    ],
  });

  // Quay
  await prisma.quay.createMany({
    data: [
      { name: 'Quay A', quayNumber: 1, isLoRo: 'LO' },
      { name: 'Quay B', quayNumber: 2, isLoRo: 'RO' },
      { name: 'Quay C', quayNumber: 3, isLoRo: 'LO' },
      { name: 'Quay D', quayNumber: 4, isLoRo: 'RO' },
    ],
  });

  // TransportAddress
  await prisma.transportAddress.createMany({
    data: [
      { street: 'Street 1', city: 'City A', country: 'Country A' },
      { street: 'Street 2', city: 'City B', country: 'Country B' },
      { street: 'Street 3', city: 'City C', country: 'Country C' },
      { street: 'Street 4', city: 'City D', country: 'Country D' },
    ],
  });

  // Destination (optional, but added based on your schema)
  await prisma.destination.createMany({
    data: [
      { city: 'City X', country: 'Country X', km: 100 },
      { city: 'City Y', country: 'Country Y', km: 200 },
      { city: 'City Z', country: 'Country Z', km: 300 },
      { city: 'City W', country: 'Country W', km: 400 },
    ],
  });

  // Transport
  await prisma.transport.createMany({
    data: [
      {
        clientId: 1,
        transportOrderNumber: 'ORD-001',
        bookingReference: 'BR-001',
        containerNumber: 'CNT-001',
        loadingUnloadingReference: 'LUR-001',
        containerType: '40HC',
        genset: 'YES',
        transportDate: new Date(),
        pickUpQuayId: 1,
        dropOffQuayId: 2,
      },
      {
        clientId: 2,
        transportOrderNumber: 'ORD-002',
        bookingReference: 'BR-002',
        containerNumber: 'CNT-002',
        loadingUnloadingReference: 'LUR-002',
        containerType: '20DV',
        genset: 'NO',
        transportDate: new Date(),
        pickUpQuayId: 2,
        dropOffQuayId: 3,
      },
      {
        clientId: 3,
        transportOrderNumber: 'ORD-003',
        bookingReference: 'BR-003',
        containerNumber: 'CNT-003',
        loadingUnloadingReference: 'LUR-003',
        containerType: '40HC',
        genset: 'YES',
        transportDate: new Date(),
        pickUpQuayId: 3,
        dropOffQuayId: 4,
      },
      {
        clientId: 4,
        transportOrderNumber: 'ORD-004',
        bookingReference: 'BR-004',
        containerNumber: 'CNT-004',
        loadingUnloadingReference: 'LUR-004',
        containerType: '20DV',
        genset: 'NO',
        transportDate: new Date(),
        pickUpQuayId: 4,
        dropOffQuayId: 1,
      },
    ],
  });

  // TransportDriver
  await prisma.transportDriver.createMany({
    data: [
      { transportId: 1, driverId: 1 },
      { transportId: 2, driverId: 2 },
      { transportId: 3, driverId: 3 },
      { transportId: 4, driverId: 4 },
    ],
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });
