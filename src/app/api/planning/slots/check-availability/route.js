import  prisma  from "@/lib/prisma";
import { NextResponse } from "next/server";
import { startOfDay } from "date-fns";

export async function POST(request) {
  try {
    const { dates, driverId, truckId, excludeTransportId } = await request.json();
    console.log('Checking dates:', dates);
    const conflicts = [];

    for (const date of dates) {
      // UTC dönüşümünü düzelt
      const localDate = new Date(date);
      const utcDate = new Date(Date.UTC(
        localDate.getFullYear(),
        localDate.getMonth(),
        localDate.getDate(),
        0, 0, 0, 0
      ));
      console.log('Checking slot date:', utcDate);

      // O tarihte driver veya truck'ın başka bir slot'ta kullanılıp kullanılmadığını kontrol et
      const existingSlots = await prisma.planningSlot.findMany({
        where: {
          date: utcDate,
          OR: [
            { driverId: parseInt(driverId) },
            { truckId: parseInt(truckId) }
          ],
          // Mevcut transport'un slot'ları hariç
          NOT: {
            transports: {
              some: {
                transportId: parseInt(excludeTransportId)
              }
            }
          }
        },
        include: {
          driver: true,
          truck: true,
          transports: {
            include: {
              transport: true
            }
          }
        }
      });
      console.log('Found slots:', existingSlots.map(s => ({
        date: s.date,
        slotNumber: s.slotNumber,
        driver: s.driver?.nickName,
        truck: s.truck?.nickName
      })));

      if (existingSlots.length > 0) {
        // Her slot için kontrol et
        for (const slot of existingSlots) {
          // Eğer slot'ta driver'a gönderilmiş transport varsa
          if (slot.transports.some(t => t.transport.sentToDriver)) {
            conflicts.push({
              date,
              assignments: [{
                slotNumber: slot.slotNumber,
                driverName: slot.driver?.nickName,
                truckName: slot.truck?.nickName,
                transportId: slot.transports[0]?.transportId
              }]
            });
            break; // Bu tarih için çakışma bulundu, diğer slot'lara bakmaya gerek yok
          }
        }
      }
    }

    return NextResponse.json({
      available: conflicts.length === 0,
      conflicts
    });
  } catch (error) {
    console.error('Error checking availability:', error);
    return NextResponse.json(
      { error: "Failed to check availability" },
      { status: 500 }
    );
  }
} 