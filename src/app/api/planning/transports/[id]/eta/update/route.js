import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// WebSocket bildirim fonksiyonu
const sendWebSocketNotification = async (event, data) => {
  try {
    const socketServerUrl = process.env.WEBSOCKET_SERVER_URL || 'http://127.0.0.1:3001/api/notify';
    
    console.log(`WebSocket bildirimi gönderiliyor: ${event}`, {
      dataType: typeof data,
      transportId: data.id,
      hasPickUpEta: !!data.pickUpEta,
      hasDropOffEta: !!data.dropOffEta,
      destinationCount: data.destinations?.length || 0
    });
    
    // Log specific ETA details for debugging
    console.log('Transport ETA details:', {
      pickUpEta: data.pickUpEta,
      dropOffEta: data.dropOffEta,
      destinations: data.destinations?.map(d => ({
        id: d.id,
        eta: d.eta
      }))
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
    
    console.log(`WebSocket bildirimi başarıyla gönderildi: ${event} için transport ID: ${data.id}`);
  } catch (error) {
    console.error('WebSocket bildirim hatası:', error);
    console.error('Hata detayları:', error.stack);
  }
};

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { pickUpEta, dropOffEta, destinationEtas } = await request.json();

    // Get the transport to check its type
    const transport = await prisma.transport.findUnique({
      where: { id: parseInt(id) },
      select: { type: true }
    });

    // Prepare update data
    const updateData = {};

    // Only include pickUpEta and dropOffEta if they are provided in the request
    if (pickUpEta !== undefined) {
      updateData.pickUpEta = pickUpEta && pickUpEta.trim && pickUpEta.trim() !== "" 
        ? new Date(pickUpEta).toISOString()
        : null;
    }

    if (dropOffEta !== undefined) {
      updateData.dropOffEta = dropOffEta && dropOffEta.trim && dropOffEta.trim() !== "" 
        ? new Date(dropOffEta).toISOString()
        : null;
    }

    // Only update destinations if they are provided
    if (destinationEtas && destinationEtas.length > 0) {
      updateData.destinations = {
        updateMany: destinationEtas.map(({ destinationId, eta }) => ({
          where: { id: destinationId },
          data: { 
            eta: eta && eta.trim && eta.trim() !== "" 
              ? new Date(eta).toISOString()
              : null
          }
        }))
      };
    }

    // Update the transport with all includes for websocket notification
    const updatedTransport = await prisma.transport.update({
      where: { id: parseInt(id) },
      data: updateData,
      include: {
        client: true,
        pickUpQuay: true,
        dropOffQuay: true,
        destinations: {
          include: {
            frequentLocation: true
          },
          orderBy: {
            order: 'asc'
          }
        },
        truck: true,
        trailer: true,
        slotAssignments: {
          include: {
            slot: true
          }
        }
      }
    });

    // Send WebSocket notification for ETA update - dedicated event
    await sendWebSocketNotification('transport:eta-update', updatedTransport);
    
    // Small delay to ensure clients process events in order
    await new Promise(resolve => setTimeout(resolve, 100));
    
    return NextResponse.json(updatedTransport);
  } catch (error) {
    console.error('Error updating transport ETAs:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 