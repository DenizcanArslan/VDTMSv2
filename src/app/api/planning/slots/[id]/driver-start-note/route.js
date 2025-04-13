import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';

// WebSocket bildirim fonksiyonu
const sendWebSocketNotification = async (event, data) => {
  try {
    // WebSocket server URL'ini localhost olarak değiştirdik (güvenli fallback)
    const socketServerUrl = process.env.WEBSOCKET_SERVER_URL || 'http://127.0.0.1:3001/api/notify';
    
    console.log(`WebSocket bildirimi gönderiliyor: ${event}`, {
      dataType: typeof data,
      slotId: data.id,
      driverStartNote: data.driverStartNote
    });
    
    // Bağlantı zaman aşımını önlemek için timeout değerini azaltalım
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 saniye zaman aşımı
    
    const response = await fetch(socketServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        data,
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId); // Zaman aşımını temizle
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`WebSocket bildirim hatası: ${response.status} ${errorText}`);
      return;
    }
    
    console.log(`WebSocket bildirimi başarıyla gönderildi: ${event}`, {
      event,
      slotId: data.id,
      driverStartNote: data.driverStartNote
    });
  } catch (error) {
    // AbortError kontrolü - zaman aşımı hatası için özel mesaj
    if (error.name === 'AbortError') {
      console.error('WebSocket bildirimi zaman aşımına uğradı. WebSocket sunucusu çalışıyor mu?');
    } else {
      console.error('WebSocket bildirim hatası:', error);
      console.error('Hata detayları:', error.stack);
    }
    
    // Hatayı yutuyoruz, uygulama çalışmaya devam etmeli
    console.log('WebSocket bildirimi başarısız oldu ancak API işlemine devam ediliyor');
  }
};

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

    // WebSocket bildirimi gönder
    console.log('Driver start note güncelleme bildirimi hazırlanıyor...');
    try {
      // WebSocket bildirimi göndermeyi dene
      await sendWebSocketNotification('slot:update', {
        ...updatedSlot,
        date: date,
        updateType: 'driver-start-note'
      });
      console.log('Driver start note güncelleme bildirimi başarıyla gönderildi');
    } catch (wsError) {
      console.error('Driver start note güncelleme bildirimi gönderilirken hata:', wsError);
      // Hata ayrıntılarını logla, ancak API'nin normal işleyişini engelleme
      console.log('WebSocket bildirimi başarısız oldu, ancak API işlemine devam ediliyor');
    }

    // WebSocket bildiriminin başarısız olmasından bağımsız olarak güncellenmiş veriyi dön
    return NextResponse.json(updatedSlot);
  } catch (error) {
    console.error('Error updating driver start note:', error);
    return NextResponse.json(
      { error: 'Failed to update driver start note' },
      { status: 500 }
    );
  }
} 