import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
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

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { trailerId } = await request.json();
    
    // Validate transport ID
    const transportId = parseInt(id);
    if (isNaN(transportId)) {
      return NextResponse.json(
        { error: 'Invalid transport ID' },
        { status: 400 }
      );
    }
    
    // Check if transport exists
    const transport = await prisma.transport.findUnique({
      where: { id: transportId },
      include: {
        destinations: true
      }
    });
    
    if (!transport) {
      return NextResponse.json(
        { error: 'Transport not found' },
        { status: 404 }
      );
    }
    
    // If a trailer is being assigned, check if it's already in use on overlapping dates
    if (trailerId) {
      // Get the dates of the current transport
      const transportDates = [];
      
      // Add departure date if it exists
      if (transport.departureDate) {
        transportDates.push(new Date(transport.departureDate).toISOString().split('T')[0]);
      }
      
      // Add return date if it exists
      if (transport.returnDate) {
        transportDates.push(new Date(transport.returnDate).toISOString().split('T')[0]);
      }
      
      // Add destination dates if they exist
      if (transport.destinations && transport.destinations.length > 0) {
        transport.destinations.forEach(dest => {
          if (dest.destinationDate) {
            transportDates.push(new Date(dest.destinationDate).toISOString().split('T')[0]);
          }
        });
      }
      
      // If no dates found, use today's date
      if (transportDates.length === 0) {
        transportDates.push(new Date().toISOString().split('T')[0]);
      }
      
      // Find ongoing transports with the same trailer
      const ongoingTransportsWithTrailer = await prisma.transport.findMany({
        where: {
          id: { not: transportId },
          currentStatus: 'ONGOING',
          trailerId: parseInt(trailerId)
        },
        include: {
          destinations: true
        }
      });
      
      // Check for date overlaps
      let conflictingDates = [];
      
      for (const t of ongoingTransportsWithTrailer) {
        // Get the dates of the other transport
        const otherTransportDates = [];
        
        if (t.departureDate) {
          otherTransportDates.push(new Date(t.departureDate).toISOString().split('T')[0]);
        }
        
        if (t.returnDate) {
          otherTransportDates.push(new Date(t.returnDate).toISOString().split('T')[0]);
        }
        
        if (t.destinations && t.destinations.length > 0) {
          t.destinations.forEach(dest => {
            if (dest.destinationDate) {
              otherTransportDates.push(new Date(dest.destinationDate).toISOString().split('T')[0]);
            }
          });
        }
        
        // If no dates found, use today's date
        if (otherTransportDates.length === 0) {
          otherTransportDates.push(new Date().toISOString().split('T')[0]);
        }
        
        // Check if there's any date overlap between the current transport's dates and the other transport's dates
        for (const date of transportDates) {
          if (otherTransportDates.includes(date)) {
            conflictingDates.push(date);
          }
        }
      }
      
      if (conflictingDates.length > 0) {
        // Format dates for display
        const formattedDates = conflictingDates.map(date => 
          new Date(date).toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' })
        ).join(', ');
        
        return NextResponse.json(
          { error: `This trailer is already assigned to another ongoing transport on the following date(s): ${formattedDates}` },
          { status: 400 }
        );
      }
    }
    
    // Transaction kullanarak hem transport güncelleme hem de park kaydını silme işlemini yapalım
    const result = await prisma.$transaction(async (tx) => {
      // Update the transport with the new trailer
      const updatedTransport = await tx.transport.update({
        where: { id: transportId },
        data: {
          trailer: trailerId ? {
            connect: { id: parseInt(trailerId) }
          } : {
            disconnect: true
          }
        },
        include: {
          client: true,
          pickUpQuay: true,
          dropOffQuay: true,
          destinations: {
            include: {
              frequentLocation: true
            },
            orderBy: {
              order: "asc"
            }
          },
          trailer: true,
          truck: true,
          slotAssignments: {
            include: {
              slot: true
            }
          },
          notes: true
        }
      });
      
      // Eğer trailer atanıyorsa VE transport durumu ONGOING veya COMPLETED ise
      // trailer park kaydını sil
      if (trailerId && 
          (transport.currentStatus === TransportCurrentStatus.ONGOING || 
           transport.currentStatus === TransportCurrentStatus.COMPLETED)) {
        
        console.log(`Transport ${transportId} already has status ${transport.currentStatus} and is now assigned trailer ${trailerId}. Deleting parking record...`);
        
        try {
          await tx.trailerParking.delete({
            where: { trailerId: parseInt(trailerId) }
          });
          console.log(`Successfully deleted parking record for trailer ${trailerId} during trailer assignment to ONGOING/COMPLETED transport`);
        } catch (error) {
          // P2025 hatası, kayıt bulunamadı demektir - bu normal bir durum olabilir
          if (error.code === 'P2025') {
            console.log(`No parking record found for trailer ${trailerId} to delete.`);
          } else {
            console.error(`Error deleting parking record for trailer ${trailerId}:`, error);
            throw error;
          }
        }
      }
      
      return updatedTransport;
    });
    
    // WebSocket bildirimi gönder
    await sendWebSocketNotification('transport:update', result);
    console.log('Trailer assignment notification sent via WebSocket for transportId:', result.id);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating transport trailer:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update transport trailer' },
      { status: 500 }
    );
  }
} 