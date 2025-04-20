import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Socket.IO bildirim fonksiyonu
const sendSocketNotification = async (event, data) => {
  try {
    const socketServerUrl = process.env.SOCKET_SERVER_URL || 'http://127.0.0.1:3001/api/notify';
    
    console.log(`Socket.IO bildirimi gönderiliyor: ${event}`, { id: data.id, event });
    
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
    
    console.log(`Socket.IO bildirimi başarıyla gönderildi: ${event}, transportId: ${data.id}`);
  } catch (error) {
    console.error('Socket.IO bildirim hatası:', error);
  }
};

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { status, dates } = await request.json();
    console.log('Received request data:', { id, status, dates });

    // Transaction başlat
    const result = await prisma.$transaction(async (tx) => {
      // Önce mevcut transport'u çek
      const existingTransport = await tx.transport.findUnique({
        where: { id: parseInt(id) },
        include: {
          client: true,
          pickUpQuay: true,
          dropOffQuay: true,
          destinations: {
            include: {
              frequentLocation: true
            }
          },
          slotAssignments: true,
          truck: true,
          trailer: true,
          notes: true
        }
      });

      if (!existingTransport) {
        throw new Error("Transport not found");
      }

      console.log(`Mevcut transport durumu: ${existingTransport.status}, yeni durum: ${status}`);

      // Eğer ON_HOLD yapılıyorsa, önce slot atamalarını sil
      if (status === 'ON_HOLD') {
        await tx.transportSlot.deleteMany({
          where: {
            transportId: parseInt(id)
          }
        });
      }

      // Update için hazırlanan veri
      const updateData = {
        status,
        ...(dates ? {
          departureDate: dates.departureDate ? new Date(dates.departureDate) : null,
          returnDate: dates.returnDate ? new Date(dates.returnDate) : null,
          destinations: {
            updateMany: dates.destinations.map(dest => ({
              where: { id: dest.id },
              data: {
                destinationDate: dest.date ? new Date(dest.date) : null,
                destinationTime: dest.time ? 
                  `${dest.date}T${dest.time}:00.000Z` : 
                  null
              }
            }))
          }
        } : {})
      };

      // Önceki status için konsola yaz
      console.log(`Transport durumu değiştiriliyor - önceki: ${existingTransport.status}, yeni: ${status}`);

      const transport = await tx.transport.update({
        where: { id: parseInt(id) },
        data: updateData,
        include: {
          client: true,
          pickUpQuay: true,
          dropOffQuay: true,
          destinations: {
            include: {
              frequentLocation: true
            }
          },
          slotAssignments: true,
          truck: true,
          trailer: true,
          notes: true
        }
      });

      // Eğer ON_HOLD'dan ACTIVE'e geçiyorsa, önemli alanların korunduğundan emin ol
      if (existingTransport.status === 'ON_HOLD' && status === 'ACTIVE') {
        console.log("ON_HOLD'dan ACTIVE'e geçiş: Tüm alanları koruyoruz.");
        
        // Transport verisini tekrar alarak en güncel halini kullan
        const freshTransport = await tx.transport.findUnique({
          where: { id: parseInt(id) },
          include: {
            client: true,
            pickUpQuay: true,
            dropOffQuay: true,
            destinations: {
              include: {
                frequentLocation: true
              }
            },
            slotAssignments: true,
            truck: true,
            trailer: true,
            notes: true
          }
        });
        
        // Arama alanlarını önceki değerlerden al ve güncelle
        await tx.transport.update({
          where: { id: parseInt(id) },
          data: {
            transportOrderNumber: existingTransport.transportOrderNumber,
            containerNumber: existingTransport.containerNumber, 
            bookingReference: existingTransport.bookingReference,
            loadingReference: existingTransport.loadingReference,
            clientId: existingTransport.clientId,
            pickUpQuayId: existingTransport.pickUpQuayId,
            dropOffQuayId: existingTransport.dropOffQuayId
          }
        });
        
        // Güncellenmiş son halini al ve döndür
        const finalTransport = await tx.transport.findUnique({
          where: { id: parseInt(id) },
          include: {
            client: true,
            pickUpQuay: true,
            dropOffQuay: true,
            destinations: {
              include: {
                frequentLocation: true
              }
            },
            slotAssignments: true,
            truck: true,
            trailer: true,
            notes: true
          }
        });
        
        // Güncellenen transport verisini kullan
        return finalTransport;
      }

      return transport;
    });

    // Socket.IO bildirimi gönder
    await sendSocketNotification('transport:update', result);
    console.log('Transport status update notification sent via Socket.IO for transportId:', result.id);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating transport status:', error);
    return NextResponse.json(
      { error: "Failed to update transport status" },
      { status: 500 }
    );
  }
} 