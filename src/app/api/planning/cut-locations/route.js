import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/planning/cut-locations
// Kesme lokasyonlarını listeler
export async function GET(request) {
  try {
    const locations = await prisma.cutLocation.findMany({
      orderBy: [
        { isDefault: 'desc' }, // Varsayılan olanlar üstte
        { name: 'asc' },       // Sonra alfabetik
      ]
    });
    return NextResponse.json(locations);
  } catch (error) {
    console.error("Error fetching cut locations:", error);
    return NextResponse.json({ message: "Failed to fetch cut locations", error: error.message }, { status: 500 });
  }
}

// POST /api/planning/cut-locations
// Yeni bir kesme lokasyonu oluşturur
export async function POST(request) {
  try {
    const { name, isDefault } = await request.json();

    if (!name) {
      return NextResponse.json(
        { error: "Location name is required" },
        { status: 400 }
      );
    }

    // Eğer yeni lokasyon varsayılan olarak işaretlendiyse, diğer varsayılan lokasyonları güncelle
    if (isDefault) {
      await prisma.cutLocation.updateMany({
        where: { isDefault: true },
        data: { isDefault: false },
      });
    }

    // Yeni lokasyonu oluştur
    const newLocation = await prisma.cutLocation.create({
      data: {
        name,
        isDefault: isDefault || false,
      },
    });

    return NextResponse.json(newLocation, { status: 201 });
  } catch (error) {
    console.error("Error creating cut location:", error);
    return NextResponse.json(
      { error: "Failed to create cut location", details: error.message },
      { status: 500 }
    );
  }
} 