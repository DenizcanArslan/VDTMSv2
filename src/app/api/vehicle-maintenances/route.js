import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const data = await request.json();

    const newMaintenance = await prisma.vehicleMaintenance.create({
      data: {
        maintenanceDate: new Date(data.maintenanceDate).toISOString(),
        notes: data.notes || null,
        cost: data.cost,
        isGensetMaintenance: data.isGensetMaintenance || false,
        ...(data.vehicleType === "truck" 
          ? { truckId: parseInt(data.vehicleId) }
          : { trailerId: parseInt(data.vehicleId) }
        ),
      },
    });

    return NextResponse.json(newMaintenance);
  } catch (error) {
    console.error("Error creating maintenance:", error);
    return NextResponse.json(
      { error: "Error creating maintenance" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const maintenances = await prisma.vehicleMaintenance.findMany({
      where: {
        OR: [
          {
            truck: {
              OR: [
                { licensePlate: { mode: 'insensitive', contains: search } },
                { nickName: { mode: 'insensitive', contains: search } }
              ]
            }
          },
          {
            trailer: {
              OR: [
                { licensePlate: { mode: 'insensitive', contains: search } },
                { nickName: { mode: 'insensitive', contains: search } }
              ]
            }
          }
        ]
      },
      include: {
        truck: true,
        trailer: true,
      },
      orderBy: {
        maintenanceDate: 'desc',
      },
    });

    return NextResponse.json(maintenances);
  } catch (error) {
    console.error("Error fetching maintenances:", error);
    return NextResponse.json(
      { error: "Error fetching maintenances" },
      { status: 500 }
    );
  }
} 