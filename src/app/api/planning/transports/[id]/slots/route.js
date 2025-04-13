import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

export async function GET(request, { params }) {
  try {
    const transportId = parseInt(params.id);

    // Transport'un tüm slot atamalarını bul
    const slots = await prisma.transportSlot.findMany({
      where: {
        transportId: transportId
      },
      include: {
        slot: {
          include: {
            driver: true,
            truck: true
          }
        }
      }
    });

    return NextResponse.json({ slots });
  } catch (error) {
    console.error('Error fetching transport slots:', error);
    return NextResponse.json(
      { error: 'Failed to fetch transport slots' },
      { status: 500 }
    );
  }
} 