import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// WebSocket bildirim fonksiyonu
const sendWebSocketNotification = async (event, data) => {
  try {
    const socketServerUrl = process.env.WEBSOCKET_SERVER_URL || 'http://127.0.0.1:3001/api/notify';
    
    console.log(`WebSocket bildirimi gönderiliyor: ${event}`, {
      dataType: typeof data,
      slotId: data.id,
      driverId: data.driverId
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
      console.error(`WebSocket bildirim hatası: ${response.status} ${errorText}`);
      return;
    }
    
    console.log(`WebSocket bildirimi başarıyla gönderildi: ${event}`, {
      event,
      slotId: data.id,
      driverId: data.driverId
    });
  } catch (error) {
    console.error('WebSocket bildirim hatası:', error);
    console.error('Hata detayları:', error.stack);
  }
};

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { driverId } = await request.json();

    const updatedSlot = await prisma.planningSlot.update({
      where: { id: parseInt(id) },
      data: {
        driverId: driverId ? parseInt(driverId) : null
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

    // WebSocket bildirimi gönder - sadece tek bir bildirim gönder
    console.log('Driver atama bildirimi hazırlanıyor...');
    try {
      await sendWebSocketNotification('driver:assign', updatedSlot);
      console.log('Driver atama bildirimi başarıyla gönderildi');
      
      // Artık sadece tek bildirim gönderiyoruz - slot:update bildirimini kaldırdık
    } catch (wsError) {
      console.error('Driver atama bildirimi gönderilirken hata:', wsError);
      // WebSocket bildirimi başarısız olsa bile, API yanıtını döndürmeye devam et
    }

    return NextResponse.json(updatedSlot);
  } catch (error) {
    console.error('Driver atama hatası:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 