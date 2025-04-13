import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const data = await request.json();

    const newInspection = await prisma.vehicleInspection.create({
      data: {
        inspectionDate: new Date(data.inspectionDate).toISOString(),
        notes: data.notes || null,
        cost: data.cost,
        ...(data.vehicleType === "truck" 
          ? { truckId: parseInt(data.vehicleId) }
          : { trailerId: parseInt(data.vehicleId) }
        ),
      },
    });

    return NextResponse.json(newInspection);
  } catch (error) {
    console.error("Error creating inspection:", error);
    return NextResponse.json(
      { error: "Error creating inspection" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const search = searchParams.get('search') || '';

    const inspections = await prisma.vehicleInspection.findMany({
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
        inspectionDate: 'desc',
      },
    });

    return NextResponse.json(inspections);
  } catch (error) {
    console.error("Error fetching inspections:", error);
    return NextResponse.json(
      { error: "Error fetching inspections" },
      { status: 500 }
    );
  }
} 