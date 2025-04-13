import { auth } from "@clerk/nextjs/server";
import prisma from "@/lib/prisma";
import InspectionView from '@/components/vehicle-inspections/InspectionView';

const VehicleInspectionsPage = async ({ searchParams }) => {
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
      inspectionDate: 'desc'
    }
  };

  const inspections = await prisma.vehicleInspection.findMany(query);

  const serializedInspections = inspections.map(inspection => ({
    ...inspection,
    cost: inspection.cost ? inspection.cost.toString() : null,
    truck: inspection.truck ? {
      ...inspection.truck,
    } : null,
    trailer: inspection.trailer ? {
      ...inspection.trailer,
    } : null,
  }));

  return <InspectionView inspections={serializedInspections} role={role} />;
};

export default VehicleInspectionsPage; 