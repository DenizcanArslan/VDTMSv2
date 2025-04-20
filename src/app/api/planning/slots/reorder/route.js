import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { startOfDay, parseISO } from 'date-fns';
import { getSocketServerUrl, logSocketError } from '@/lib/websocket';

// Socket.IO bildirim fonksiyonu
const sendSocketNotification = async (params) => {
  try {
    // Socket.IO server URL'ini helper fonksiyonundan al
    const socketServerUrl = getSocketServerUrl();
    const { event, data } = params;
    
    console.log(`Socket.IO bildirimi gönderiliyor: ${event}`, {
      socketUrl: socketServerUrl,
      dataType: typeof data,
      hasSlots: !!data.slots,
      dateKeys: Array.isArray(data.slots) ? 'array' : (data.slots ? Object.keys(data.slots) : []),
      slotCount: Array.isArray(data.slots) ? data.slots.length : (data.slots ? Object.values(data.slots).flat().length : 0)
    });
    
    // Bağlantı zaman aşımını önlemek için timeout değerini azaltalım
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 saniye zaman aşımı
    
    // İlk deneme - Docker container adıyla
    try {
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
        throw new Error(`Socket.IO bildirim hatası: ${response.status} ${errorText}`);
      }
      
      console.log(`Socket.IO bildirimi başarıyla gönderildi: ${event}`, {
        url: socketServerUrl,
        event,
        dateStr: data.targetDate || data.date || data.affectedDate || 'unknown'
      });
      
      return; // Başarılı ise fonksiyondan çık
    } catch (primaryError) {
      // İlk URL başarısız olursa, alternatif URL'i dene
      console.warn(`İlk socket URL (${socketServerUrl}) başarısız oldu, alternatif URL deneniyor:`, primaryError.message);
      
      // Alternatif URL - localhost
      const alternativeUrl = 'http://localhost:3001/api/notify';
      
      try {
        const alternativeController = new AbortController();
        const alternativeTimeoutId = setTimeout(() => alternativeController.abort(), 5000);
        
        const alternativeResponse = await fetch(alternativeUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            event,
            data,
          }),
          signal: alternativeController.signal
        });
        
        clearTimeout(alternativeTimeoutId);
        
        if (!alternativeResponse.ok) {
          const errorText = await alternativeResponse.text();
          throw new Error(`Alternatif Socket.IO bildirim hatası: ${alternativeResponse.status} ${errorText}`);
        }
        
        console.log(`Alternatif URL ile Socket.IO bildirimi başarıyla gönderildi: ${event}`, {
          url: alternativeUrl
        });
        
        return; // Başarılı ise fonksiyondan çık
      } catch (alternativeError) {
        // Her iki URL de başarısız oldu, ana hatayı fırlat
        console.error('Hem birincil hem de alternatif socket URL başarısız oldu');
        throw new Error(`Socket.IO bildirimleri başarısız: ${primaryError.message}, Alternatif: ${alternativeError.message}`);
      }
    }
  } catch (error) {
    // AbortError kontrolü - zaman aşımı hatası için özel mesaj
    if (error.name === 'AbortError') {
      console.error('Socket.IO bildirimi zaman aşımına uğradı. Socket.IO sunucusu çalışıyor mu?');
    } else {
      // Detaylı hata günlüğü
      logSocketError(error, {
        event: params.event,
        url: getSocketServerUrl(),
        dataSize: JSON.stringify(params.data).length,
        timestamp: new Date().toISOString()
      });
    }
    
    // Hatayı yutuyoruz, uygulama çalışmaya devam etmeli
    console.log('Socket.IO bildirimi başarısız oldu ancak API işlemine devam ediliyor');
  }
};

export async function PUT(request) {
  try {
    const { date, oldIndex, newIndex } = await request.json();
    
    // Tarih formatını doğru işle - ISO string formatına çevir
    const parsedDate = new Date(date);
    const isoDate = parsedDate.toISOString();
    const dayStart = startOfDay(parsedDate);
    
    console.log('Reorder işlemi başlatılıyor:', {
      rawDate: date,
      parsedDate: parsedDate.toISOString(),
      dayStart: dayStart.toISOString()
    });

    const result = await prisma.$transaction(async (prisma) => {
      const slots = await prisma.planningSlot.findMany({
        where: {
          date: {
            gte: dayStart,
            lt: new Date(dayStart.getTime() + 24 * 60 * 60 * 1000),
          },
          isActive: true,
        },
        orderBy: {
          order: 'asc',
        },
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
      
      console.log(`${slots.length} slot bulundu:`, {
        dateStr: dayStart.toISOString(),
        firstSlotId: slots.length > 0 ? slots[0].id : 'none'
      });

      const [movedSlot] = slots.splice(oldIndex, 1);
      slots.splice(newIndex, 0, movedSlot);

      // İlk aşama: Tüm slot'ları yüksek değerlere taşı
      await Promise.all(
        slots.map((slot, index) => 
          prisma.planningSlot.update({
            where: { id: slot.id },
            data: { 
              order: 10000 + index,
              slotNumber: index + 1
            }
          })
        )
      );

      // İkinci aşama: Final değerleri ayarla
      const updates = await Promise.all(
        slots.map((slot, index) => 
          prisma.planningSlot.update({
            where: { id: slot.id },
            data: { 
              order: index,
              slotNumber: index + 1
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
          })
        )
      );

      // Güncellenmiş slot'ları tarih bazında grupla - burada dayStart ISO string'e çevrilmeli
      const slotsByDate = {
        [dayStart.toISOString()]: updates
      };
      
      console.log(`Slot yeniden sıralama tamamlandı. ${updates.length} slot güncellendi.`);

      return { slots: slotsByDate };
    });

    // Debug için result değerinin içeriğini yazdır
    console.log('Reorder result:', {
      hasSlots: !!result.slots,
      dateKeys: result.slots ? Object.keys(result.slots) : [],
      slotCount: result.slots ? Object.values(result.slots).flat().length : 0,
      originalDate: date
    });

    // Socket.IO bildirimi gönder
    console.log('Preparing Socket.IO notification with complete slot data...');

    // Debug için slot verilerini kontrol et
    const slotCount = result.slots ? Object.values(result.slots).flat().length : 0;
    console.log(`Sending ${slotCount} slots via Socket.IO`);

    try {
      // Tüm Socket.IO bildirimlerini try-catch içinde tutalım
      try {
        // Socket.IO bildirimini slot:update olayı olarak da gönder
        await sendSocketNotification({
          event: 'slot:update',
          data: {
            type: 'reorder',
            slotId: 'all', // Tüm slotları etkilediğini belirtmek için
            date: date,
            timestamp: new Date().toISOString()
          }
        });
        console.log('Slot update notification sent first');
      } catch (innerError) {
        console.error('Failed to send slot:update notification:', innerError);
        // Bu hata diğer bildirimleri etkilemesin
      }
      
      try {
        // Ayrıca slots:reorder özel olayını da gönder
        await sendSocketNotification({
          event: 'slots:reorder',
          data: {
            slots: result.slots,
            type: 'reorder',
            timestamp: new Date().toISOString(),
            date: date,
            operation: {
              oldIndex,
              newIndex,
              date
            }
          }
        });
        console.log('Slots reorder notification sent via Socket.IO successfully');
      } catch (innerError) {
        console.error('Failed to send slots:reorder notification:', innerError);
        // Bu hata diğer bildirimleri etkilemesin
      }
      
      try {
        // Tüm güncel veriyi çekmek için bir planning:update olayı da gönder
        await sendSocketNotification({
          event: 'planning:update',
          data: {
            timestamp: new Date().toISOString(),
            type: 'reorder',
            affectedDate: date,
            slots: result.slots  // Güncellenmiş slot verilerini ekle
          }
        });
        console.log('Planning update notification sent with updated slot data');
      } catch (innerError) {
        console.error('Failed to send planning:update notification:', innerError);
        // Bu hata diğer bildirimleri etkilemesin
      }
    } catch (wsError) {
      console.error('Failed to send Socket.IO notifications:', wsError);
      // Socket.IO bildirimi başarısız olsa bile, API yanıtını döndürmeye devam et
      console.log('Socket.IO notifications failed, but API will continue to respond');
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error reordering slots:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}