import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Socket.IO bildirim fonksiyonu
const sendSocketNotification = async (event, data) => {
  try {
    const socketServerUrl = process.env.SOCKET_SERVER_URL || 'http://127.0.0.1:3001/api/notify';
    
    console.log(`Socket.IO bildirimi gönderiliyor: ${event}`, {
      dataType: typeof data,
      slotId: data.id,
      truckId: data.truckId
    });
    
    const response = await fetch(socketServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        data,
      }),
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Socket.IO bildirim hatası: ${response.status} ${errorText}`);
      return;
    }
    
    console.log(`Socket.IO bildirimi başarıyla gönderildi: ${event}`, {
      event,
      slotId: data.id,
      truckId: data.truckId
    });
  } catch (error) {
    console.error('Socket.IO bildirim hatası:', error);
    console.error('Hata detayları:', error.stack);
  }
};

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { truckId } = await request.json();

    const updatedSlot = await prisma.planningSlot.update({
      where: { id: parseInt(id) },
      data: {
        truckId: truckId ? parseInt(truckId) : null
      },
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

    // Socket.IO bildirimi gönder - sadece tek bir bildirim gönder
    console.log('Truck atama bildirimi hazırlanıyor...');
    try {
      await sendSocketNotification('truck:assign', updatedSlot);
      console.log('Truck atama bildirimi başarıyla gönderildi');
      
      // Artık sadece tek bildirim gönderiyoruz - slot:update bildirimini kaldırdık
    } catch (wsError) {
      console.error('Truck atama bildirimi gönderilirken hata:', wsError);
      // Socket.IO bildirimi başarısız olsa bile, API yanıtını döndürmeye devam et
    }

    return NextResponse.json(updatedSlot);
  } catch (error) {
    console.error('Truck atama hatası:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 