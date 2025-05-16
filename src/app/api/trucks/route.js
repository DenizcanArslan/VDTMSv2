import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request) {
  try {
    const data = await request.json();
    console.log("Raw data received with nickName:", {
      ...data,
      nickName: data.nickName
    });

    // nickName kontrolü
    if (!data.nickName) {
      return NextResponse.json(
        { error: "Nick name is required" },
        { status: 400 }
      );
    }

    // Plaka, şasi ve nickname kontrolü
    const existingTruck = await prisma.truck.findFirst({
      where: {
        OR: [
          { licensePlate: { equals: data.licensePlate, mode: 'insensitive' } },
          { chasisNumber: data.chasisNumber ? { equals: data.chasisNumber, mode: 'insensitive' } : undefined },
          { nickName: { equals: data.nickName, mode: 'insensitive' } }
        ]
      }
    });

    if (existingTruck) {
      if (existingTruck.licensePlate.toLowerCase() === data.licensePlate.toLowerCase()) {
        return NextResponse.json(
          { error: "A truck with this license plate already exists" },
          { status: 400 }
        );
      }
      if (existingTruck.chasisNumber?.toLowerCase() === data.chasisNumber?.toLowerCase()) {
        return NextResponse.json(
          { error: "A truck with this chasis number already exists" },
          { status: 400 }
        );
      }
      if (existingTruck.nickName.toLowerCase() === data.nickName.toLowerCase()) {
        return NextResponse.json(
          { error: "A truck with this nickname already exists" },
          { status: 400 }
        );
      }
    }

    const newTruck = await prisma.truck.create({
      data: {
        licensePlate: data.licensePlate,
        nickName: data.nickName,
        model: data.model || null,
        modelYear: data.modelYear ? parseInt(data.modelYear) : null,
        chasisNumber: data.chasisNumber || null,
        genset: data.genset || "NO",
        insuranceExpireDate: data.insuranceExpireDate ? new Date(data.insuranceExpireDate) : null,
      },
    });

    return NextResponse.json(newTruck);
  } catch (error) {
    console.error("Error creating truck:", error);
    return NextResponse.json(
      { error: "Error creating truck" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const trucks = await prisma.truck.findMany({
      include: {
        transportLicense: true
      },
      orderBy: [
        { isActive: 'desc' },
        { licensePlate: 'asc' }
      ]
    });
    return NextResponse.json(trucks);
  } catch (error) {
    console.error("Error fetching trucks:", error);
    return NextResponse.json(
      { error: "Error fetching trucks" },
      { status: 500 }
    );
  }
} 