import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { TransportCurrentStatus } from "@prisma/client";

// WebSocket bildirim fonksiyonu
const sendWebSocketNotification = async (event, data) => {
  try {
    const socketServerUrl = process.env.WEBSOCKET_SERVER_URL || 'http://127.0.0.1:3001/api/notify';
    
    console.log(`WebSocket bildirimi gönderiliyor: ${event}`, {
      dataType: typeof data,
      transportId: data.id,
      currentStatus: data.currentStatus,
      sentToDriver: data.sentToDriver
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
      transportId: data.id
    });
  } catch (error) {
    console.error('WebSocket bildirim hatası:', error);
    console.error('Hata detayları:', error.stack);
  }
};

export async function PUT(request, { params }) {
  try {
    const transportId = parseInt(params.id);
    const { currentStatus, sentToDriver, sourceSlotId } = await request.json();
    console.log('Received data:', { transportId, currentStatus, sentToDriver, sourceSlotId });

    // Transaction başlat
    const result = await prisma.$transaction(async (tx) => {
      // Transport bilgilerini al (trailer ID'ye ihtiyacımız var)
      const transport = await tx.transport.findUnique({
        where: { id: transportId },
        select: { trailerId: true }
      });

      if (!transport) {
        throw new Error('Transport not found');
      }

      // Transport'u güncelle
      const updatedTransport = await tx.transport.update({
        where: { id: transportId },
        data: {
          currentStatus,
          sentToDriver
        },
        include: {
          slotAssignments: true,
          destinations: {
            include: {
              frequentLocation: true
            }
          },
          client: true,
          pickUpQuay: true,
          dropOffQuay: true,
          truck: true,
          trailer: true
        }
      });

      // Eğer durumu ONGOING veya COMPLETED olarak güncelleniyorsa ve trailer atanmışsa,
      // trailer park kaydını sil
      if (
        transport.trailerId && 
        (currentStatus === TransportCurrentStatus.ONGOING || 
         currentStatus === TransportCurrentStatus.COMPLETED)
      ) {
        console.log(`Transport ${transportId} status changed to ${currentStatus}. Deleting parking record for trailer ${transport.trailerId}...`);
        
        try {
          await tx.trailerParking.delete({
            where: { trailerId: transport.trailerId }
          });
          console.log(`Successfully deleted parking record for trailer ${transport.trailerId} during status update`);
        } catch (error) {
          // P2025 hatası, kayıt bulunamadı demektir - bu normal bir durum olabilir
          if (error.code === 'P2025') {
            console.log(`No parking record found for trailer ${transport.trailerId} to delete.`);
          } else {
            console.error(`Error deleting parking record for trailer ${transport.trailerId}:`, error);
            throw error;
          }
        }
      }

      // Eğer sent to driver yapılıyorsa
      if (sentToDriver && currentStatus !== 'COMPLETED') {
        // Tüm slot atamalarını kontrol et
        const hasUnassignedSlots = updatedTransport.slotAssignments.some(
          assignment => !assignment.slotId
        );
        
        if (hasUnassignedSlots) {
          throw new Error('Please assign all transport dates to slots before sending to driver');
        }

        if (!sourceSlotId) {
          // Transport'un ilk slot'unu bul
          const transportSlot = await tx.transportSlot.findFirst({
            where: {
              transportId
            },
            include: {
              slot: {
                include: {
                  driver: true,
                  truck: true
                }
              }
            }
          });

          if (!transportSlot) {
            throw new Error('Transport must be assigned to a slot');
          }

          // Bu slot'u source slot olarak kullan
          const sourceSlot = transportSlot.slot;
          
          // Transport'un tüm slotAssignments'ları için planningSlot'ları güncelle
          for (const assignment of updatedTransport.slotAssignments) {
            if (assignment.slotId !== sourceSlot.id) {
              await tx.planningSlot.update({
                where: {
                  id: assignment.slotId
                },
                data: {
                  driver: {
                    connect: { id: sourceSlot.driverId }
                  },
                  truck: {
                    connect: { id: sourceSlot.truckId }
                  }
                }
              });
            }
          }
        } else {
          // Source slot'u ID ile bul
          const sourceSlot = await tx.planningSlot.findUnique({
            where: {
              id: sourceSlotId
            },
            include: {
              driver: true,
              truck: true
            }
          });

          if (sourceSlot) {
            // Transport'un tüm slotAssignments'ları için planningSlot'ları güncelle
            for (const assignment of updatedTransport.slotAssignments) {
              if (assignment.slotId !== sourceSlot.id) {
                await tx.planningSlot.update({
                  where: {
                    id: assignment.slotId
                  },
                  data: {
                    driver: {
                      connect: { id: sourceSlot.driverId }
                    },
                    truck: {
                      connect: { id: sourceSlot.truckId }
                    }
                  }
                });
              }
            }
          }
        }
      } else if (currentStatus === 'COMPLETED') {
        // Transport completed yapılıyorsa başka bir işlem yapmaya gerek yok
        // Sadece transport'un status'ü güncellendi
      }

      return updatedTransport;
    });

    // Send WebSocket notification for transport status update
    await sendWebSocketNotification('transport:status-update', result);
    
    // Also send a general transport update to ensure all clients refresh their view
    await sendWebSocketNotification('transport:update', result);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating transport current status:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update transport current status' },
      { status: 500 }
    );
  }
} 