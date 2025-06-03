import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// PUT - Lokasyon güncelle
export async function PUT(request, { params }) {
  try {
    const data = await request.json();
    // Eğer sadece isActive güncellenmişse
    if (Object.keys(data).length === 1 && 'isActive' in data) {
      const updatedLocation = await prisma.frequentLocation.update({
        where: { id: parseInt(params.id) },
        data: { isActive: data.isActive }
      });
      return NextResponse.json(updatedLocation);
    }

    // Normal form güncellemesi için
    const updatedLocation = await prisma.frequentLocation.update({
      where: { id: parseInt(params.id) },
      data: {
        name: data.name,
        country: data.country,
        postalCode: data.postalCode || null,
        km: parseInt(data.km),
      },
    });
    return NextResponse.json(updatedLocation);
  } catch (error) {
    console.error("Error details:", error);
    return NextResponse.json(
      { error: error.message || "Error updating location" },
      { status: 500 }
    );
  }
}

// PATCH - Durum değiştir (aktif/pasif)
export async function PATCH(request, { params }) {
  try {
    const { isActive } = await request.json();
    const updatedLocation = await prisma.frequentLocation.update({
      where: { id: parseInt(params.id) },
      data: { isActive },
    });
    return NextResponse.json(updatedLocation);
  } catch (error) {
    console.error("Error details:", error);
    return NextResponse.json(
      { error: "Error updating location status" },
      { status: 500 }
    );
  }
}

// DELETE - Lokasyonu sil
export async function DELETE(request, { params }) {
  try {
    await prisma.frequentLocation.delete({
      where: { id: parseInt(params.id) },
    });
    return NextResponse.json({ message: "Location deleted successfully" });
  } catch (error) {
    console.error("Error details:", error);
    return NextResponse.json(
      { error: "Error deleting location" },
      { status: 500 }
    );
  }
} 