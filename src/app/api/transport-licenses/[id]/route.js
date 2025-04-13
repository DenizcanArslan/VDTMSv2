import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// PUT - Transport lisansını güncelle
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();

    // Status değişikliği kontrolü
    if (data.hasOwnProperty('isActive')) {
      console.log("Status update request:", { id, isActive: data.isActive });
      
      const updatedLicense = await prisma.transportLicense.update({
        where: { 
          id: parseInt(id) 
        },
        data: { 
          isActive: data.isActive 
        }
      });

      return NextResponse.json(updatedLicense);
    }

    // Lisans numarası benzersizlik kontrolü
    if (data.licenseNumber) {
      const existingLicense = await prisma.transportLicense.findFirst({
        where: {
          AND: [
            { licenseNumber: data.licenseNumber },
            { id: { not: parseInt(id) } }
          ]
        }
      });

      if (existingLicense) {
        return NextResponse.json(
          { error: "A license with this number already exists" },
          { status: 400 }
        );
      }
    }

    // Truck ID varsa geçerli olduğunu ve başka lisansa atanmadığını kontrol et
    if (data.truckId) {
      const truck = await prisma.truck.findUnique({
        where: { id: parseInt(data.truckId) },
        include: { transportLicense: true }
      });

      if (!truck) {
        return NextResponse.json(
          { error: "Invalid truck ID" },
          { status: 400 }
        );
      }

      // Eğer truck'ın mevcut lisansı varsa ve bu lisans güncellenen lisans değilse hata ver
      if (truck.transportLicense && truck.transportLicense.id !== parseInt(id)) {
        return NextResponse.json(
          { error: "This truck already has a transport license assigned" },
          { status: 400 }
        );
      }
    }

    const updatedLicense = await prisma.transportLicense.update({
      where: { id: parseInt(id) },
      data: {
        licenseNumber: data.licenseNumber,
        truckId: data.truckId ? parseInt(data.truckId) : null,
      },
      include: {
        truck: true
      }
    });

    return NextResponse.json(updatedLicense);
  } catch (error) {
    console.error("Error updating transport license:", error);
    return NextResponse.json(
      { error: "Error updating transport license" },
      { status: 500 }
    );
  }
}

// DELETE - Transport lisansını sil
export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    await prisma.transportLicense.delete({
      where: { id: parseInt(id) }
    });

    return NextResponse.json({ message: "Transport license successfully deleted" });
  } catch (error) {
    console.error("Error deleting transport license:", error);
    return NextResponse.json(
      { error: "Error deleting transport license" },
      { status: 500 }
    );
  }
} 