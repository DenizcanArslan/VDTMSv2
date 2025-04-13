import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { parseISO, startOfDay, format } from 'date-fns';
import { getWebSocketServerUrl } from '@/lib/websocket';

// WebSocket bildirim fonksiyonu
const sendWebSocketNotification = async (params) => {
  try {
    // WebSocket server URL'ini helper fonksiyonundan al
    const socketServerUrl = getWebSocketServerUrl();
    const { event, data } = params;
    
    console.log(`WebSocket bildirimi gönderiliyor: ${event}`, {
      socketUrl: socketServerUrl,
      dataType: typeof data,
      date: data.date || data.affectedDate || 'unknown'
    });
    
    // Bağlantı zaman aşımını önlemek için timeout değerini ayarla
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);
    
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
      throw new Error(`WebSocket bildirim hatası: ${response.status} ${errorText}`);
    }
    
    console.log(`WebSocket bildirimi başarıyla gönderildi: ${event}`, {
      url: socketServerUrl,
      event,
      date: data.date || data.affectedDate || 'unknown'
    });
  } catch (error) {
    console.error('WebSocket bildirim hatası:', error);
    // WebSocket hataları API yanıtını engellememeli
  }
};

export async function POST(request) {
  try {
    const { date } = await request.json();
    
    if (!date) {
      return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }
    
    // Tarihi parse et ve sadece gün kısmını al (saat:00:00:00)
    const parsedDate = startOfDay(parseISO(date));
    const formattedDate = format(parsedDate, 'yyyy-MM-dd');
    
    console.log(`Starting slot sorting for date: ${formattedDate}`);
    
    // Verilen tarih için aktif planlanmış slotları bul
    const planningSlots = await prisma.planningSlot.findMany({
      where: {
        date: {
          gte: parsedDate,
          lt: new Date(parsedDate.getTime() + 24 * 60 * 60 * 1000) // Bir sonraki günün başlangıcı
        },
        isActive: true,
      },
      include: {
        transports: {
          include: {
            transport: {
              include: {
                destinations: {
                  orderBy: {
                    order: 'asc'
                  }
                }
              }
            }
          }
        }
      },
      orderBy: {
        order: 'asc'
      }
    });
    
    console.log(`Found ${planningSlots.length} slots for date ${formattedDate}`);

    if (planningSlots.length === 0) {
      return NextResponse.json({
        success: false,
        message: 'No active planning slots found for the specified date',
        slotsFound: 0,
      });
    }
    
    // Her slot için ilk transport ve ilk destinasyon zamanını bul
    const slotsWithDestinationTime = planningSlots.map(slot => {
      const firstTransportSlot = slot.transports[0];
      let firstDestinationTime = null;
      
      if (firstTransportSlot && firstTransportSlot.transport) {
        const firstDestination = firstTransportSlot.transport.destinations[0];
        if (firstDestination) {
          // destinationTime alanını kullan (loglarda doğrulandı)
          firstDestinationTime = firstDestination.destinationTime;
          console.log(`Slot ${slot.id} (${slot.slotNumber}) - Transport ${firstTransportSlot.transport.id} - First destination time: ${firstDestinationTime}`);
        } else {
          console.log(`Slot ${slot.id} (${slot.slotNumber}) - Transport ${firstTransportSlot.transport.id} - No destinations found`);
        }
      } else {
        console.log(`Slot ${slot.id} (${slot.slotNumber}) - No transport assigned`);
      }
      
      return {
        ...slot,
        firstDestinationTime
      };
    });
    
    // Destination zamanına göre slotları sırala
    const sortedSlots = [...slotsWithDestinationTime].sort((a, b) => {
      // Eğer destination zamanı yoksa, en sona koy
      if (!a.firstDestinationTime) return 1;
      if (!b.firstDestinationTime) return -1;
      
      // Varsa, zamana göre sırala
      return new Date(a.firstDestinationTime) - new Date(b.firstDestinationTime);
    });
    
    console.log('Sorted slots:');
    sortedSlots.forEach((slot, index) => {
      console.log(`${index + 1}. Slot ${slot.id} (${slot.slotNumber}) - Order: ${slot.order} -> New order: ${index + 1} - Destination time: ${slot.firstDestinationTime || 'N/A'}`);
    });
    
    // UNIQUE CONSTRAINT HATASINI ÇÖZME:
    // Önce tüm slotların order değerlerini geçici değerlerle güncelle (çakışma olmaması için negatif sayılar)
    console.log('Setting temporary order values to avoid conflicts...');
    for (let i = 0; i < sortedSlots.length; i++) {
      await prisma.planningSlot.update({
        where: { id: sortedSlots[i].id },
        data: { order: -1000 - i } // Geçici negatif değerler (-1000, -1001, -1002, ...)
      });
    }
    
    // Şimdi nihai sıralama değerlerini ayarla
    console.log('Setting final order values...');
    for (let i = 0; i < sortedSlots.length; i++) {
      await prisma.planningSlot.update({
        where: { id: sortedSlots[i].id },
        data: { order: i + 1 }
      });
    }
    
    console.log(`Updated ${sortedSlots.length} slots with new orders`);
    
    // Güncellenmiş slotları yanıta dönecek şekilde hazırla
    const updatedSlots = sortedSlots.map(slot => ({
      id: slot.id,
      slotNumber: slot.slotNumber,
      newOrder: sortedSlots.findIndex(s => s.id === slot.id) + 1,
      firstDestinationTime: slot.firstDestinationTime
    }));
    
    // WebSocket bildirimleri - farklı event tipleri ile birden fazla bildirim gönder
    // Bildirimleri asenkron olarak gönder ama hatalara karşı dayanıklı ol
    try {
      // 1. Özel slot sıralama bildirimi
      await sendWebSocketNotification({
        event: 'slots:sort-by-destination',
        data: {
          date: formattedDate,
          slots: updatedSlots,
          timestamp: new Date().toISOString()
        }
      });
      
      // 2. Genel slot güncelleme bildirimi 
      await sendWebSocketNotification({
        event: 'slot:update',
        data: {
          type: 'reorder',
          slotId: 'all', // Tüm slotları etkilediğini belirtmek için
          date: formattedDate,
          timestamp: new Date().toISOString()
        }
      });
      
      // 3. Genel planlama güncelleme bildirimi
      await sendWebSocketNotification({
        event: 'planning:update',
        data: {
          timestamp: new Date().toISOString(),
          type: 'sort-by-destination',
          affectedDate: formattedDate,
          slots: updatedSlots
        }
      });
    } catch (wsError) {
      console.error('WebSocket notifications failed:', wsError);
      // WebSocket hataları API yanıtını engellememeli
    }
    
    return NextResponse.json({
      success: true,
      message: `Updated ${sortedSlots.length} planning slots with new orders based on destination times`,
      slots: updatedSlots
    });
    
  } catch (error) {
    console.error('Error sorting slots by destination:', error);
    return NextResponse.json({
      error: 'Failed to sort slots',
      message: error.message
    }, { status: 500 });
  }
} 