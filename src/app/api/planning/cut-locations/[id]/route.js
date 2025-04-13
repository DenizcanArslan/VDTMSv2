import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/planning/cut-locations/[id]
// Belirli bir kesme lokasyonunu getirir
export async function GET(request, { params }) {
  try {
    const { id } = params;
    const locationId = parseInt(id);

    // Lokasyonu bul
    const location = await prisma.cutLocation.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(location, { status: 200 });
  } catch (error) {
    console.error("Error fetching cut location:", error);
    return NextResponse.json(
      { error: "Failed to fetch cut location", details: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/planning/cut-locations/[id]
// Belirli bir kesme lokasyonunu günceller
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const locationId = parseInt(id);
    const { name, isDefault } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Location name is required" },
        { status: 400 }
      );
    }

    // Lokasyonu bul
    const location = await prisma.cutLocation.findUnique({
      where: { id: locationId },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Eğer lokasyon varsayılan olarak işaretlendiyse, diğer varsayılan lokasyonları güncelle
    if (isDefault && !location.isDefault) {
      await prisma.cutLocation.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    // Lokasyonu güncelle
    const updatedLocation = await prisma.cutLocation.update({
      where: { id: locationId },
      data: {
        name,
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json(updatedLocation, { status: 200 });
  } catch (error) {
    console.error("Error updating cut location:", error);
    return NextResponse.json(
      { error: "Failed to update cut location", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/planning/cut-locations/[id]
// Belirli bir kesme lokasyonunu siler
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const locationId = parseInt(id);

    // Lokasyonu bul
    const location = await prisma.cutLocation.findUnique({
      where: { id: locationId },
      include: {
        cutInfos: true,
      },
    });

    if (!location) {
      return NextResponse.json(
        { error: "Location not found" },
        { status: 404 }
      );
    }

    // Eğer lokasyon kullanılıyorsa silme
    if (location.cutInfos.length > 0) {
      return NextResponse.json(
        { error: "Cannot delete location that is in use" },
        { status: 400 }
      );
    }

    // Lokasyonu sil
    await prisma.cutLocation.delete({
      where: { id: locationId },
    });

    return NextResponse.json({ success: true }, { status: 200 });
  } catch (error) {
    console.error("Error deleting cut location:", error);
    return NextResponse.json(
      { error: "Failed to delete cut location", details: error.message },
      { status: 500 }
    );
  }
} 