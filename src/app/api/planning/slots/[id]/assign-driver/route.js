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
      console.error(`Socket.IO bildirim hatası: ${response.status} ${errorText}`);
      return;
    }
    
    console.log(`Socket.IO bildirimi başarıyla gönderildi: ${event}`, {
      event,
      slotId: data.id,
      driverId: data.driverId
    });
  } catch (error) {
    console.error('Socket.IO bildirim hatası:', error);
    console.error('Hata detayları:', error.stack);
  }
};

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { driverId, date } = await request.json();

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

    // Socket.IO bildirimi gönder - tam veri ekleyelim
    console.log('Driver atama bildirimi hazırlanıyor...');
    try {
      // Veri hazırlama - eksik verileri ekleyelim
      const enrichedData = {
        ...updatedSlot,
        date: date, // Tarihi ekleyelim
        slotId: parseInt(id), // Slot ID'yi ekleyelim
        driverId: driverId ? parseInt(driverId) : null, // Driver ID'yi ekleyelim
        updateType: 'driver-assign' // Update tipini belirtelim
      };
      
      await sendSocketNotification('driver:assign', enrichedData);
      console.log('Driver atama bildirimi başarıyla gönderildi, tüm gerekli verilerle');
      
    } catch (wsError) {
      console.error('Driver atama bildirimi gönderilirken hata:', wsError);
      // Socket.IO bildirimi başarısız olsa bile, API yanıtını döndürmeye devam et
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