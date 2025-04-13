import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET - Tüm transport lisanslarını getir
export async function GET() {
  try {
    const licenses = await prisma.transportLicense.findMany({
      include: {
        truck: true
      },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' }
      ]
    });
    return NextResponse.json(licenses);
  } catch (error) {
    console.error("Error fetching transport licenses:", error);
    return NextResponse.json(
      { error: "Error fetching transport licenses" },
      { status: 500 }
    );
  }
}

// POST - Yeni transport lisansı oluştur
export async function POST(request) {
  try {
    const data = await request.json();
    console.log("Received data in API:", data);

    // Lisans numarası benzersizlik kontrolü
    const existingLicense = await prisma.transportLicense.findFirst({
      where: { licenseNumber: data.licenseNumber }
    });

    if (existingLicense) {
      return NextResponse.json(
        { error: "A license with this number already exists" },
        { status: 400 }
      );
    }

    // Truck ID varsa geçerli olduğunu ve başka lisansa atanmadığını kontrol et
    if (data.truckId) {
      console.log("Processing truck ID:", data.truckId);
      const truck = await prisma.truck.findUnique({
        where: { id: parseInt(data.truckId) },
        include: { transportLicense: true }
      });

      console.log("Found truck:", truck);

      if (!truck) {
        return NextResponse.json(
          { error: "Invalid truck ID" },
          { status: 400 }
        );
      }

      if (truck.transportLicense) {
        return NextResponse.json(
          { error: "This truck already has a transport license assigned" },
          { status: 400 }
        );
      }
    }

    const newLicense = await prisma.transportLicense.create({
      data: {
        licenseNumber: data.licenseNumber,
        truckId: data.truckId ? parseInt(data.truckId) : null,
        isActive: true
      },
      include: {
        truck: true
      }
    });

    console.log("Created license:", newLicense);
    return NextResponse.json(newLicense);
  } catch (error) {
    console.error("Error creating transport license:", error);
    return NextResponse.json(
      { error: "Error creating transport license" },
      { status: 500 }
    );
  }
} 