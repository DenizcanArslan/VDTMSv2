import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import { NextResponse } from "next/server";
import { startOfDay, endOfDay, parseISO, addDays } from "date-fns";
import { getSocketServerUrl } from '@/lib/websocket';
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Socket.IO bildirim fonksiyonu
const sendSocketNotification = async (event, data) => {
  try {
    const socketServerUrl = getSocketServerUrl();
    
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

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { transportId, direction, date } = await request.json();

    console.log('Reorder request received:', { slotId: id, transportId, direction, date });

    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    // Tarihi parse et ve UTC'den local'e çevir
    const parsedDate = parseISO(date);
    // UTC tarihini local tarihe çevir (1 gün ekle)
    const localDate = addDays(parsedDate, 1);
    const startDate = startOfDay(localDate);
    const endDate = endOfDay(localDate);

    console.log('Date range:', {
      originalDate: date,
      parsedDate: parsedDate.toISOString(),
      localDate: localDate.toISOString(),
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString()
    });

    // Önce slot'u bul
    const slot = await prisma.planningSlot.findUnique({
      where: { id: parseInt(id) }
    });

    if (!slot) {
      return NextResponse.json(
        { error: 'Slot not found' },
        { status: 404 }
      );
    }

    // Slot'un transport'larını al
    const transports = await prisma.transportSlot.findMany({
      where: {
        slotId: parseInt(id),
        date: {
          gte: startDate,
          lt: endDate
        }
      },
      include: {
        transport: {
          include: {
            client: true,
            destinations: {
              include: {
                frequentLocation: true
              }
            },
            pickUpQuay: true,
            dropOffQuay: true
          }
        }
      },
      orderBy: {
        slotOrder: 'asc'
      }
    });

    console.log('Found transports:', {
      slotId: slot.id,
      transportCount: transports.length,
      transports: transports.map(t => ({
        id: t.id,
        transportId: t.transport.id,
        currentOrder: t.slotOrder,
        date: t.date
      }))
    });

    // Transport'un mevcut indeksini bul
    const currentIndex = transports.findIndex(t => t.transport.id === parseInt(transportId));
    console.log('Current transport index:', { currentIndex, transportId });

    if (currentIndex === -1) {
      return NextResponse.json(
        { error: 'Transport not found in slot' },
        { status: 404 }
      );
    }

    // Yeni indeksi hesapla
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    console.log('New index calculated:', { newIndex, direction });

    if (newIndex < 0 || newIndex >= transports.length) {
      return NextResponse.json(
        { error: 'Cannot move transport further' },
        { status: 400 }
      );
    }

    // Tüm transport'ları yeni sıralamaya göre güncelle
    const reorderedTransports = [...transports];
    const [movedTransport] = reorderedTransports.splice(currentIndex, 1);
    reorderedTransports.splice(newIndex, 0, movedTransport);

    console.log('Reordered transports:', reorderedTransports.map(t => ({
      id: t.id,
      transportId: t.transport.id,
      newOrder: reorderedTransports.indexOf(t),
      date: t.date
    })));

    try {
      // Her bir transport için slotOrder'ı güncelle
      await prisma.$transaction(
        reorderedTransports.map((ts, index) => 
          prisma.transportSlot.update({
            where: {
              id: ts.id
            },
            data: {
              slotOrder: index
            }
          })
        )
      );

      console.log('Database update completed successfully');
    } catch (updateError) {
      console.error('Error updating transport orders:', updateError);
      throw new Error(`Failed to update transport orders: ${updateError.message}`);
    }

    // Güncellenmiş transport'ları getir
    const updatedTransports = await prisma.transportSlot.findMany({
      where: {
        slotId: parseInt(id),
        date: {
          gte: startDate,
          lt: endDate
        }
      },
      include: {
        transport: {
          include: {
            client: true,
            destinations: {
              include: {
                frequentLocation: true
              }
            },
            pickUpQuay: true,
            dropOffQuay: true
          }
        }
      },
      orderBy: {
        slotOrder: 'asc'
      }
    });

    console.log('Final updated transports:', {
      slotId: slot.id,
      transportCount: updatedTransports.length,
      transports: updatedTransports.map(t => ({
        id: t.id,
        transportId: t.transport.id,
        finalOrder: t.slotOrder,
        date: t.date
      }))
    });

    // Socket.IO bildirimi gönder
    await sendSocketNotification('slot:update', {
      ...slot,
      transports: updatedTransports
    });

    return NextResponse.json({
      ...slot,
      transports: updatedTransports
    });
  } catch (error) {
    console.error('Error reordering transport:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to reorder transport' },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
} 