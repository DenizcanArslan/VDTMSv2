import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import MaintenanceView from '@/components/vehicle-maintenances/MaintenanceView';

const VehicleMaintenancesPage = async ({ searchParams }) => {
  const { userId, sessionClaims } = await auth();
  const role = sessionClaims?.metadata?.role;

  const p = parseInt(searchParams?.p) || 1;
  const q = searchParams?.q || "";
  const search = searchParams?.search || "";

  let query = {
    where: {
      OR: [
        {
          AND: [
            { truck: { isNot: null } },
            {
              truck: {
                OR: [
                  { licensePlate: { contains: search, mode: 'insensitive' } },
                  { nickName: { contains: search, mode: 'insensitive' } }
                ]
              }
            }
          ]
        },
        {
          AND: [
            { trailer: { isNot: null } },
            {
              trailer: {
                OR: [
                  { licensePlate: { contains: search, mode: 'insensitive' } },
                  { nickName: { contains: search, mode: 'insensitive' } }
                ]
              }
            }
          ]
        }
      ]
    },
    include: {
      truck: true,
      trailer: true
    },
    orderBy: {
      maintenanceDate: 'desc'
    }
  };

  const maintenances = await prisma.vehicleMaintenance.findMany(query);

  const serializedMaintenances = maintenances.map(maintenance => ({
    ...maintenance,
    cost: maintenance.cost ? maintenance.cost.toString() : null,
    truck: maintenance.truck ? {
      ...maintenance.truck,
    } : null,
    trailer: maintenance.trailer ? {
      ...maintenance.trailer,
    } : null,
  }));

  return <MaintenanceView maintenances={serializedMaintenances} role={role} />;
};

export default VehicleMaintenancesPage;