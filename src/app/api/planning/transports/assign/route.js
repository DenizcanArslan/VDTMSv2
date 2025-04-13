import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { startOfDay, endOfDay } from "date-fns";
import { TransportCurrentStatus } from "@prisma/client";

// WebSocket bildirim fonksiyonu
const sendWebSocketNotification = async (event, data) => {
  try {
    const socketServerUrl = process.env.WEBSOCKET_SERVER_URL || 'http://127.0.0.1:3001/api/notify';
    
    console.log(`WebSocket bildirimi gönderiliyor: ${event}`, { id: data.id, event });
    
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
    
    console.log(`WebSocket bildirimi başarıyla gönderildi: ${event}, transportId: ${data.id}`);
  } catch (error) {
    console.error('WebSocket bildirim hatası:', error);
  }
};

export async function PUT(request) {
  try {
    const { transportId, slotId, date, forceMove } = await request.json();
    console.log('Assign/Unassign Request:', { transportId, slotId, date, forceMove });

    // Daha detaylı transport bilgilerini al, trailerId ve currentStatus dahil
    const transport = await prisma.transport.findUnique({
      where: { id: transportId },
      select: {
        id: true,
        trailerId: true,
        currentStatus: true,
        destinations: {
          orderBy: { order: 'asc' }
        },
        slotAssignments: true
      }
    });

    if (!transport) {
      return NextResponse.json(
        { error: 'Transport not found' },
        { status: 404 }
      );
    }

    const localDate = new Date(date);
    const utcDate = new Date(Date.UTC(
      localDate.getFullYear(),
      localDate.getMonth(),
      localDate.getDate(),
      0, 0, 0, 0
    ));
    console.log('UTC adjusted date:', utcDate);

    const existingSlots = await prisma.transportSlot.findMany({
      where: {
        transportId,
        date: {
          gte: startOfDay(utcDate),
          lt: endOfDay(utcDate)
        }
      }
    });

    console.log('Existing slots for this date:', existingSlots);

    const result = await prisma.$transaction(async (tx) => {
      if (slotId === null) {
        if (existingSlots.length > 0) {
          await tx.transportSlot.update({
            where: { id: existingSlots[0].id },
            data: { slotId: null }
          });
          console.log('Updated existing TransportSlot, set slotId to null:', existingSlots[0].id);
        } else {
          await tx.transportSlot.create({
            data: {
              transport: {
                connect: { id: transportId }
              },
              date: utcDate,
              slotOrder: 0
            }
          });
          console.log('Created new TransportSlot with null slotId');
        }
      } else {
        if (existingSlots.length > 0) {
          await tx.transportSlot.deleteMany({
            where: {
              transportId,
              date: {
                gte: startOfDay(utcDate),
                lt: endOfDay(utcDate)
              }
            }
          });
          console.log('Deleted existing TransportSlots for transportId:', transportId);
        }

        let slotOrder = 0;
        const maxOrder = await tx.transportSlot.findFirst({
          where: { slotId },
          orderBy: { slotOrder: 'desc' }
        });
        
        slotOrder = maxOrder ? (maxOrder.slotOrder + 1) : 0;

        const newSlot = await tx.transportSlot.create({
          data: {
            transport: {
              connect: { id: transportId }
            },
            date: utcDate,
            slot: {
              connect: { id: slotId }
            },
            slotOrder
          }
        });
        
        console.log('Created new TransportSlot:', newSlot.id);

        // Eğer transport'un bir trailer'ı varsa ve durumu ONGOING veya COMPLETED ise
        // trailer parking kaydını sil
        if (transport.trailerId && 
            (transport.currentStatus === TransportCurrentStatus.ONGOING || 
             transport.currentStatus === TransportCurrentStatus.COMPLETED)) {
          
          console.log(`Transport ${transportId} has status ${transport.currentStatus} and is assigned to slot ${slotId}. Deleting parking for trailer ${transport.trailerId}...`);
          
          try {
            await tx.trailerParking.delete({
              where: { trailerId: transport.trailerId }
            });
            console.log(`Successfully deleted parking record for trailer ${transport.trailerId}`);
          } catch (error) {
            if (error.code === 'P2025') {
              console.log(`No parking record found for trailer ${transport.trailerId} to delete.`);
            } else {
              console.error(`Error deleting parking record for trailer ${transport.trailerId} within transaction:`, error);
              throw error; 
            }
          }
        } else if (transport.trailerId) {
          console.log(`Transport ${transportId} has status ${transport.currentStatus}, not deleting parking record for trailer ${transport.trailerId}`);
        }
      }

      const updatedTransport = await tx.transport.findUnique({
        where: { id: transportId },
        include: {
          client: true,
          pickUpQuay: true,
          dropOffQuay: true,
          destinations: {
            include: {
              frequentLocation: true
            }
          },
          slotAssignments: {
            where: {
              date: {
                gte: startOfDay(utcDate),
                lt: endOfDay(utcDate)
              }
            },
            include: {
              slot: true
            }
          },
          truck: true,
          trailer: true
        }
      });

      console.log('Updated Transport:', updatedTransport);
      return updatedTransport;
    });

    await sendWebSocketNotification('transport:update', result);
    console.log('WebSocket transport:update notification sent for transportId:', result.id);

    if (slotId) {
      const updatedSlot = await prisma.planningSlot.findUnique({
        where: { id: slotId },
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
                  trailer: true,
                  destinations: true
                }
              }
            }
          }
        }
      });

      if (updatedSlot) {
        await sendWebSocketNotification('slot:update', updatedSlot);
        console.log('WebSocket slot:update notification sent for slotId:', slotId);
      }
    }

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error assigning transport:', error);
    let statusCode = 500;
    let message = 'Failed to assign transport';
    
    if (error.message.includes('parking record')) { 
        message = 'Failed to update parking status during transport assignment.';
    }
    
    return NextResponse.json(
      { error: message, details: error.message },
      { status: statusCode }
    );
  }
}

async function getNextSlotOrder(slotId) {
  const slot = await prisma.planningSlot.findUnique({
    where: { id: slotId },
    include: { transports: true }
  });

  if (!slot) return 0;
  
  return slot.transports.length > 0
    ? Math.max(...slot.transports.map(t => t.slotOrder || 0)) + 1
    : 0;
} 