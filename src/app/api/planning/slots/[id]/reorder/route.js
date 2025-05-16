import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

import { NextResponse } from "next/server";
import { startOfDay, endOfDay } from "date-fns";
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

    // Slot'taki transport'ları sıralı şekilde al
    const slot = await prisma.planningSlot.findUnique({
      where: { id: parseInt(id) },
      include: {
        transports: {
          where: {
            date: {
              gte: startOfDay(new Date(date)),
              lt: endOfDay(new Date(date))
            }
          },
          include: {
            transport: true
          },
          orderBy: {
            slotOrder: 'asc'
          }
        }
      }
    });

    if (!slot) {
      return NextResponse.json(
        { error: 'Slot not found' },
        { status: 404 }
      );
    }

    // Transport'un mevcut indeksini bul
    const currentIndex = slot.transports.findIndex(t => t.transport.id === parseInt(transportId));
    if (currentIndex === -1) {
      return NextResponse.json(
        { error: 'Transport not found in slot' },
        { status: 404 }
      );
    }

    // Yeni indeksi hesapla
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= slot.transports.length) {
      return NextResponse.json(
        { error: 'Cannot move transport further' },
        { status: 400 }
      );
    }

    // Takas edilecek transport'ları al
    const currentTransport = slot.transports[currentIndex];
    const targetTransport = slot.transports[newIndex];

    console.log('Slot:', {
      id: slot.id,
      transportsCount: slot.transports.length
    });

    console.log('Current transport:', {
      id: currentTransport.id,
      currentOrder: currentTransport.slotOrder,
      newOrder: targetTransport.slotOrder,
      transportId: currentTransport.transport.id
    });
    console.log('Target transport:', {
      id: targetTransport.id,
      currentOrder: targetTransport.slotOrder,
      newOrder: currentTransport.slotOrder,
      transportId: targetTransport.transport.id
    });

    // Sıraları değiştir
    const updates = [
      prisma.transportSlot.update({
        where: { id: currentTransport.id },
        data: { 
          slotOrder: targetTransport.slotOrder 
        }
      }),
      prisma.transportSlot.update({
        where: { id: targetTransport.id },
        data: { 
          slotOrder: currentTransport.slotOrder 
        }
      })
    ];

    console.log('Updates:', updates);

    await prisma.$transaction(updates);

    // Güncellenmiş slot'u getir
    const updatedSlot = await prisma.planningSlot.findUnique({
      where: { id: parseInt(id) },
      include: {
        transports: {
          where: {
            date: {
              gte: startOfDay(new Date(date)),
              lt: endOfDay(new Date(date))
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
        }
      }
    });

    // Socket.IO bildirimi gönder
    await sendSocketNotification('slot:update', updatedSlot);

    return NextResponse.json(updatedSlot);
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