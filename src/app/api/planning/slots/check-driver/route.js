import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { startOfDay, endOfDay } from "date-fns";

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const date = searchParams.get('date');
  const driverId = searchParams.get('driverId');
  const excludeSlotId = searchParams.get('excludeSlotId');
  const excludeTransportId = searchParams.get('excludeTransportId');

  if (!date || date === 'undefined' || !driverId) {
    return NextResponse.json({ error: 'Date and driverId are required' }, { status: 400 });
  }

  // Sorgu koşullarını oluştur
  const whereCondition = {
    date: {
      gte: date ? startOfDay(new Date(date)) : startOfDay(new Date()),
      lt: date ? endOfDay(new Date(date)) : endOfDay(new Date())
    },
    driverId: parseInt(driverId)
  };

  // Eğer excludeSlotId parametresi varsa, bu slot'u hariç tut
  if (excludeSlotId) {
    whereCondition.id = {
      not: parseInt(excludeSlotId)
    };
  }

  // Eğer excludeTransportId parametresi varsa, bu transport'a ait tüm slotları hariç tut
  if (excludeTransportId) {
    // Önce bu transport'a ait tüm slot ID'lerini bul
    const transportSlots = await prisma.transportSlot.findMany({
      where: {
        transportId: parseInt(excludeTransportId),
        date: {
          gte: date ? startOfDay(new Date(date)) : startOfDay(new Date()),
          lt: date ? endOfDay(new Date(date)) : endOfDay(new Date())
        }
      },
      select: {
        slotId: true
      }
    });

    const slotIds = transportSlots.map(ts => ts.slotId).filter(id => id !== null);

    if (slotIds.length > 0) {
      whereCondition.id = {
        notIn: slotIds
      };
    }
  }

  // O tarihte driver'ın başka bir slot'ta atanmış olup olmadığını kontrol et
  const existingAssignment = await prisma.planningSlot.findFirst({
    where: whereCondition
  });

  return NextResponse.json({
    isAssigned: !!existingAssignment,
    existingSlot: existingAssignment
  });
} 