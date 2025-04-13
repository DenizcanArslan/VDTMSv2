import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// GET: Park edilmiş tüm trailer'ları getir
export async function GET(request) {
  try {
    const parkedTrailers = await prisma.trailerParking.findMany({
      include: {
        trailer: { // İlişkili trailer bilgilerini de getir
          select: {
            id: true,
            nickName: true,
            licensePlate: true,
          }
        },
        location: { // İlişkili lokasyon bilgilerini de getir
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: {
        parkedAt: 'desc', // En son park edilenler üstte
      }
    });
    return NextResponse.json(parkedTrailers);
  } catch (error) {
    console.error("Error fetching parked trailers:", error);
    return NextResponse.json({ message: "Failed to fetch parked trailers", error: error.message }, { status: 500 });
  }
}

// POST: Yeni trailer park kaydı ekle
export async function POST(request) {
  try {
    const { trailerId, locationId, notes } = await request.json();

    if (!trailerId || !locationId) {
      return NextResponse.json({ message: "trailerId and locationId are required" }, { status: 400 });
    }

    const newParking = await prisma.trailerParking.create({
      data: {
        trailerId: parseInt(trailerId, 10),
        locationId: parseInt(locationId, 10),
        notes: notes || null, // null olarak kaydet boş string yerine
      },
       include: { // Oluşturulan kaydı ilişkili verilerle döndür
        trailer: { select: { id: true, nickName: true, licensePlate: true } },
        location: { select: { id: true, name: true } }
      }
    });

    return NextResponse.json(newParking, { status: 201 });

  } catch (error) {
     console.error("Error creating trailer parking:", error);
     if (error.code === 'P2002' && error.meta?.target?.includes('trailerId')) {
       return NextResponse.json({ message: "This trailer is already parked." }, { status: 409 });
     }
     if (error.code === 'P2003') {
        let field = 'unknown field';
        if (error.meta?.field_name?.includes('trailerId')) field = 'Trailer';
        if (error.meta?.field_name?.includes('locationId')) field = 'Location';
         return NextResponse.json({ message: `Invalid ${field} ID provided.` }, { status: 400 });
     }
     return NextResponse.json({ message: "Failed to create trailer parking", error: error.message }, { status: 500 });
  }
} 