import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { startOfDay, endOfDay } from "date-fns";

// Socket.IO bildirim fonksiyonu
const sendSocketNotification = async (event, data) => {
  try {
    const socketServerUrl = process.env.SOCKET_SERVER_URL || 'http://127.0.0.1:3001/api/notify';
    
    await fetch(socketServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        data,
      }),
    });
    
    console.log(`Socket.IO bildirimi gönderildi: ${event}`);
  } catch (error) {
    console.error('Socket.IO bildirim hatası:', error);
  }
};

export async function PUT(request) {
  try {
    const { slotId, transportId, newOrder, date } = await request.json();

    // Önce transport slot'u bul
    const transportSlot = await prisma.transportSlot.findFirst({
      where: {
        transportId,
        slotId,
        date: {
          gte: startOfDay(new Date(date)),
          lt: endOfDay(new Date(date))
        }
      }
    });

    if (!transportSlot) {
      throw new Error('Transport slot not found');
    }

    // Transport slot'un sırasını güncelle
    const updatedTransportSlot = await prisma.transportSlot.update({
      where: { id: transportSlot.id },
      data: { slotOrder: newOrder }
    });

    // Slot'taki tüm transport'ları al ve sırala
    const slot = await prisma.planningSlot.findUnique({
      where: { id: slotId },
      include: {
        transports: {
          include: {
            transport: {
              include: {
                client: true,
                pickUpQuay: true,
                dropOffQuay: true,
                truck: true,
                trailer: true,
                destinations: {
                  include: {
                    frequentLocation: true
                  }
                }
              }
            }
          },
          orderBy: {
            slotOrder: 'asc'
          }
        }
      }
    });

    if (!slot) {
      throw new Error('Slot not found');
    }

    // Socket.IO bildirimi gönder
    await sendSocketNotification('slot:update', slot);

    return NextResponse.json({
      transportSlot: updatedTransportSlot,
      slot: slot
    });

  } catch (error) {
    console.error('Error reordering transports:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 