import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// DELETE: Belirli bir trailerId'ye ait park kaydını sil
export async function DELETE(request, { params }) {
  const trailerId = parseInt(params.trailerId, 10);

  if (isNaN(trailerId)) {
    return NextResponse.json({ message: "Invalid Trailer ID provided" }, { status: 400 });
  }

  try {
    await prisma.trailerParking.delete({
      where: {
        trailerId: trailerId,
      }
    });

    return NextResponse.json({ message: "Trailer parking record deleted successfully" });

  } catch (error) {
    console.error(`Error deleting trailer parking for trailerId ${trailerId}:`, error);
     if (error.code === 'P2025') {
       return NextResponse.json({ message: "Trailer parking record not found for the given trailer ID" }, { status: 404 });
     }
    return NextResponse.json({ message: "Failed to delete trailer parking record", error: error.message }, { status: 500 });
  }
}

// PUT: Belirli bir trailerId'ye ait park kaydını güncelle
export async function PUT(request, { params }) {
  const trailerId = parseInt(params.trailerId, 10);

  if (isNaN(trailerId)) {
    return NextResponse.json({ message: "Invalid Trailer ID provided" }, { status: 400 });
  }

  try {
    const data = await request.json();
    const { locationId, notes } = data;

    if (!locationId) {
      return NextResponse.json({ message: "Location ID is required" }, { status: 400 });
    }

    // Önce mevcut kaydı sil
    await prisma.trailerParking.deleteMany({
      where: {
        trailerId: trailerId,
      }
    });

    // Sonra yeni kayıt oluştur
    const parking = await prisma.trailerParking.create({
      data: {
        trailerId: trailerId,
        locationId: parseInt(locationId, 10),
        notes: notes || null, // null olarak kaydet boş string yerine
      },
      include: {
        trailer: true,
        location: true,
      }
    });

    return NextResponse.json(parking);
  } catch (error) {
    console.error(`Error updating trailer parking for trailerId ${trailerId}:`, error);
    return NextResponse.json({ message: "Failed to update trailer parking record", error: error.message }, { status: 500 });
  }
} 