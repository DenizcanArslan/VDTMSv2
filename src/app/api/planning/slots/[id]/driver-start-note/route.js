import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendSocketNotification } from '@/lib/websocket';

export const dynamic = 'force-dynamic';

export async function PUT(request, { params }) {
  try {
    const slotId = parseInt(params.id);
    const { driverStartNote, date } = await request.json();

    // Slot'u güncelle
    const updatedSlot = await prisma.planningSlot.update({
      where: { id: slotId },
      data: { driverStartNote },
      include: {
        driver: true,
        truck: true,
        transports: {
          include: {
            transport: {
              include: {
                client: true,
                pickUpQuay: true,
                dropOffQuay: true,
                destinations: true
              }
            }
          }
        }
      }
    });

    // Socket.IO bildirimi gönder
    console.log('Driver start note güncelleme bildirimi hazırlanıyor...');
    try {
      // Socket.IO bildirimi göndermeyi dene - shared implementation kullanarak
      await sendSocketNotification('slot:update', {
        ...updatedSlot,
        date: date,
        updateType: 'driver-start-note'
      });
      console.log('Driver start note güncelleme bildirimi başarıyla gönderildi');
    } catch (wsError) {
      console.error('Driver start note güncelleme bildirimi gönderilirken hata:', wsError);
      // Hata ayrıntılarını logla, ancak API'nin normal işleyişini engelleme
      console.log('Socket.IO bildirimi başarısız oldu, ancak API işlemine devam ediliyor');
    }

    // Socket.IO bildiriminin başarısız olmasından bağımsız olarak güncellenmiş veriyi dön
    return NextResponse.json(updatedSlot);
  } catch (error) {
    console.error('Error updating driver start note:', error);
    return NextResponse.json(
      { error: 'Failed to update driver start note' },
      { status: 500 }
    );
  }
} 