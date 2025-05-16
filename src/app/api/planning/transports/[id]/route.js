import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isGensetRequired } from '@/lib/constants/containerTypes';
import { startOfDay, endOfDay } from "date-fns";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

// Socket.IO bildirim fonksiyonu
const sendSocketNotification = async (event, data) => {
  try {
    const socketServerUrl = process.env.SOCKET_SERVER_URL || 'http://127.0.0.1:3001/api/notify';
    
    await fetch(socketServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        data,
      }),
    });
    
    console.log(`Socket.IO bildirimi gönderildi: ${event}`);
  } catch (error) {
    console.error('Socket.IO bildirim hatası:', error);
  }
};

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();
    
    // Gelen verileri kontrol et ve null değerleri temizle
    if (data.destinations) {
      data.destinations = data.destinations.filter(d => d !== null && d !== undefined);
    } else {
      data.destinations = [];
    }
    
    console.log('API received data:', {
      destinations: data.destinations.map(d => ({
        id: d.id,
        eta: d.eta,
      }))
    });

    // Mevcut transport'u al
    const existingTransport = await prisma.transport.findUnique({
      where: { id: parseInt(id) },
      include: { destinations: true }
    });

    if (!existingTransport) {
      return NextResponse.json(
        { error: 'Transport not found' },
        { status: 404 }
      );
    }

    // Loading reference kontrolü - eğer değiştiyse ve yeni bir değer girilmişse benzersiz olmalı
    if (data.loadingUnloadingReference && data.loadingUnloadingReference !== existingTransport.loadingUnloadingReference) {
      // Loading reference'ı küçük harfe dönüştür
      data.loadingUnloadingReference = data.loadingUnloadingReference.toLowerCase();
      
      // Silinmemiş ve aynı loading reference'a sahip başka bir transport var mı kontrol et
      const existingWithSameRef = await prisma.transport.findFirst({
        where: {
          loadingUnloadingReference: {
            equals: data.loadingUnloadingReference,
            mode: 'insensitive'  // Büyük/küçük harf duyarsız arama
          },
          isDeleted: false,
          id: { not: parseInt(id) }
        },
        include: {
          cutInfo: true
        }
      });
      
      if (existingWithSameRef) {
        // Önce orijinal transport ID'lerini toplayalım
        let currentOriginalId = existingTransport.originalTransportId || existingTransport.id;
        let foundOriginalId = existingWithSameRef.originalTransportId || existingWithSameRef.id;
        
        console.log('Cut relationship check:', {
          currentTransportId: existingTransport.id,
          currentOriginalId,
          foundTransportId: existingWithSameRef.id,
          foundOriginalId,
          currentCutInfo: existingTransport.cutInfo !== null,
          foundCutInfo: existingWithSameRef.cutInfo !== null
        });
        
        // Aynı kökten gelen transportlar (aynı orijinal ID'ye sahipler) veya
        // biri diğerinin kökü olan transportlar aynı referansı kullanabilmeli
        const isCutRelated = 
          // Aynı orijinal ID'ye sahipler
          currentOriginalId === foundOriginalId ||
          // Bulunan transport, mevcut transport'un orijinali
          existingWithSameRef.id === currentOriginalId ||
          // Mevcut transport, bulunan transport'un orijinali
          existingTransport.id === foundOriginalId;
                               
        if (!isCutRelated) {
          // Eğer ilişki yoksa, daha detaylı bakalım
          // Transport grubu içerisinde ilişki kontrolü - daha kapsamlı
          
          // Mevcut transportun cut ilişkilerini kontrol et
          const relatedTransportsForCurrent = await prisma.transport.findMany({
            where: {
              OR: [
                { id: currentOriginalId },
                { originalTransportId: currentOriginalId }
              ],
              isDeleted: false
            },
            select: { id: true }
          });
          
          // Bulunan transportun cut ilişkilerini kontrol et
          const relatedTransportsForFound = await prisma.transport.findMany({
            where: {
              OR: [
                { id: foundOriginalId },
                { originalTransportId: foundOriginalId }
              ],
              isDeleted: false
            },
            select: { id: true }
          });
          
          // İki grubun ID'lerini karşılaştır - kesişim olup olmadığına bak
          const currentIds = relatedTransportsForCurrent.map(t => t.id);
          const foundIds = relatedTransportsForFound.map(t => t.id);
          
          // İki grup arasında ortak ID var mı kontrol et
          const hasCommonIds = currentIds.some(id => foundIds.includes(id));
          
          console.log('Cut relationship extended check:', {
            currentIds,
            foundIds,
            hasCommonIds
          });
          
          if (!hasCommonIds) {
            return NextResponse.json(
              { error: "Loading/Unloading Reference must be unique. Another transport with this reference already exists." },
              { status: 400 }
            );
          }
        }
      }
    }
    
    // Container Number kontrolü - belirli formatta olmalı
    if (data.containerNumber) {
      // Önce container number'ı büyük harfe çevir
      data.containerNumber = data.containerNumber.toUpperCase();
      
      // Toplam 11 karakter olmalı
      if (data.containerNumber.length !== 11) {
        return NextResponse.json(
          { error: "Container number must be exactly 11 characters (e.g., CMAU1234567)" },
          { status: 400 }
        );
      }
      
      // İlk 4 karakteri harf olmalı
      const firstFourChars = data.containerNumber.substring(0, 4);
      if (!/^[A-Z]{4}$/.test(firstFourChars)) {
        return NextResponse.json(
          { error: "Container number must start with 4 uppercase letters (e.g., CMAU1234567)" },
          { status: 400 }
        );
      }
      
      // Kalan karakterler rakam olmalı
      const remainingChars = data.containerNumber.substring(4);
      if (!/^\d+$/.test(remainingChars)) {
        return NextResponse.json(
          { error: "Container number must have 7 digits after the first 4 letters (e.g., CMAU1234567)" },
          { status: 400 }
        );
      }
    }

    console.log('Existing transport destinations:', existingTransport.destinations.map(d => ({
      id: d.id,
      eta: d.eta,
    })));

    // Update öncesi mevcut transport'u al ve logla
    console.log('Before Update:', {
      pickUpQuayId: existingTransport.pickUpQuayId,
      dropOffQuayId: existingTransport.dropOffQuayId,
      pickUpTar: existingTransport.pickUpTar,
      dropOffTar: existingTransport.dropOffTar
    });

    console.log('Update Request Data:', {
      pickUpQuayId: data.pickUpQuayId,
      dropOffQuayId: data.dropOffQuayId,
      pickUpTar: data.pickUpTar,
      dropOffTar: data.dropOffTar
    });

    // TBN quay'i bul
    const tbnQuay = await prisma.quay.findFirst({
      where: { name: 'TBN' }
    });

    // For IMPORT or EXPORT transports, if no quay is selected, use TBN quay
    if ((data.type === 'IMPORT' || data.type === 'EXPORT') && tbnQuay) {
      // If no pickup quay is selected, use TBN
      if (!data.pickUpQuayId) {
        data.pickUpQuayId = tbnQuay.id;
      }
      
      // If no dropoff quay is selected, use TBN
      if (!data.dropOffQuayId) {
        data.dropOffQuayId = tbnQuay.id;
      }
    }
    // For SHUNT transports, if no quay is selected, leave it as null
    // No automatic TBN assignment for SHUNT

    const transportData = {
      transportOrderNumber: data.transportOrderNumber,
      clientId: parseInt(data.clientId),
      pickUpQuayId: data.pickUpQuayId ? parseInt(data.pickUpQuayId) : null,
      dropOffQuayId: data.dropOffQuayId ? parseInt(data.dropOffQuayId) : null,
      bookingReference: data.containerBookingReference,
      containerNumber: data.containerNumber,
      containerType: data.containerType,
      genset: data.genset,
      adr: data.adr,
      type: data.type,
      departureDate: data.departureDate ? new Date(data.departureDate).toISOString() : null,
      returnDate: data.returnDate ? new Date(data.returnDate).toISOString() : null,
    };

    // Önce transport'un tüm slot atamalarını al
    const currentAssignments = await prisma.transportSlot.findMany({
      where: { transportId: parseInt(id) }
    });
    
    // Mevcut transport'un destinasyonlarını al
    const currentTransport = await prisma.transport.findUnique({
      where: { id: parseInt(id) },
      include: {
        destinations: true
      }
    });

    // Mevcut destinasyon tarihlerini al
    const currentDates = currentTransport.destinations.map(dest => 
      startOfDay(new Date(dest.destinationDate)).toISOString()
    );

    // Yeni destinasyon tarihlerini al
    const destinationDates = data.destinations.map(dest => {
      const date = new Date(dest.destinationDate);
      // Tarihi UTC 00:00'a ayarla
      date.setUTCHours(0, 0, 0, 0);
      return date.toISOString();
    });

    // Tarihler değişmiş mi kontrol et
    const datesChanged = JSON.stringify(currentDates.sort()) !== JSON.stringify(destinationDates.sort());

    // Transaction ile tüm işlemleri yap
    const result = await prisma.$transaction(async (tx) => {
      // Aynı gün için birden fazla destinasyon varsa, tek bir TransportSlot yeterli
      const uniqueDates = [...new Set(destinationDates)];
      
      // Mevcut tüm slot atamalarını al
      const existingSlots = await tx.transportSlot.findMany({
        where: { transportId: parseInt(id) },
        include: { slot: true }
      });
      
      // Slot bilgilerini tarih bazında map'le
      const slotInfoByDate = {};
      existingSlots.forEach(slot => {
        if (slot && slot.date) {
          const dateStr = slot.date.toISOString().split('T')[0];
          slotInfoByDate[dateStr] = {
            slotId: slot.slotId,
            slotOrder: slot.slotOrder || 0
          };
        }
      });
      
      console.log('Existing slot info by date:', slotInfoByDate);
      
      // Sadece tarihler değiştiyse slot atamalarını sil
      if (datesChanged) {
        await tx.transportSlot.deleteMany({
          where: {
            transportId: parseInt(id),
            date: {
              notIn: uniqueDates.map(date => new Date(date))
            }
          }
        });
      }

      // Advanced planning aktif ise ve tarihler girilmişse
      if (data.departureDate && data.returnDate) {
        // Departure ve return tarihleri arasındaki tüm günler için slot oluştur
        const startDate = new Date(data.departureDate);
        const endDate = new Date(data.returnDate);
        
        console.log('Creating slots for date range:', { startDate, endDate });
        
        let currentDate = new Date(startDate);
        
        // Tarih aralığındaki her gün için slot oluştur
        while (currentDate <= endDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          const existingSlot = await tx.transportSlot.findFirst({
            where: {
              transportId: parseInt(id),
              date: {
                gte: startOfDay(new Date(dateStr)),
                lt: endOfDay(new Date(dateStr))
              }
            }
          });
          
          // O tarihte TransportSlot yoksa oluştur
          if (!existingSlot) {
            // Eğer bu tarih için önceden bir slot bilgisi varsa, o bilgileri kullan
            const slotInfo = slotInfoByDate[dateStr] || { slotId: null, slotOrder: 0 };
            
            await tx.transportSlot.create({
              data: {
                transportId: parseInt(id),
                date: new Date(dateStr),
                slotId: slotInfo.slotId,
                slotOrder: slotInfo.slotOrder
              }
            });
          }
          
          // Bir sonraki güne geç
          const nextDate = new Date(currentDate);
          nextDate.setDate(nextDate.getDate() + 1);
          currentDate = nextDate;
        }
      } else {
        // Her benzersiz tarih için bir TransportSlot olduğundan emin ol
        for (const date of uniqueDates) {
          const dateStr = new Date(date).toISOString().split('T')[0];
          const existingSlot = await tx.transportSlot.findFirst({
            where: {
              transportId: parseInt(id),
              date: new Date(date)
            }
          });

          // O tarihte TransportSlot yoksa oluştur
          if (!existingSlot) {
            // Eğer bu tarih için önceden bir slot bilgisi varsa, o bilgileri kullan
            const slotInfo = slotInfoByDate[dateStr] || { slotId: null, slotOrder: 0 };
            
            await tx.transportSlot.create({
              data: {
                transportId: parseInt(id),
                date: new Date(date),
                slotId: slotInfo.slotId,
                slotOrder: slotInfo.slotOrder
              }
            });
          }
        }
      }

      // Destinations için tarih ve saat bilgilerini ekle
      const updatedData = {
        client: {
          connect: { id: parseInt(data.clientId) }
        },
        transportOrderNumber: data.transportOrderNumber,
        bookingReference: data.bookingReference || null,
        containerNumber: data.containerNumber || null,
        containerType: data.containerType || null,
        loadingUnloadingReference: data.loadingUnloadingReference || null,
        genset: data.genset,
        adr: data.adr || "NO",
        type: data.type,
        departureDate: data.departureDate ? new Date(data.departureDate).toISOString() : null,
        returnDate: data.returnDate ? new Date(data.returnDate).toISOString() : null,
        hasTransportOrder: data.hasTransportOrder,
        transportOrderReceivedAt: data.hasTransportOrder ? 
          new Date(new Date().setHours(new Date().getHours() + 1)).toISOString() : null,
      };

      // Handle pickUpQuay based on transport type
      if (data.pickUpQuayId) {
        updatedData.pickUpQuay = {
          connect: { id: parseInt(data.pickUpQuayId) }
        };
      } else if (data.type === 'SHUNT') {
        // For SHUNT, if no quay is selected, disconnect any existing quay
        updatedData.pickUpQuay = { disconnect: true };
      } else if (tbnQuay) {
        // For non-SHUNT, use TBN
        updatedData.pickUpQuay = {
          connect: { id: tbnQuay.id }
        };
      }

      // Handle dropOffQuay based on transport type
      if (data.dropOffQuayId) {
        updatedData.dropOffQuay = {
          connect: { id: parseInt(data.dropOffQuayId) }
        };
      } else if (data.type === 'SHUNT') {
        // For SHUNT, if no quay is selected, disconnect any existing quay
        updatedData.dropOffQuay = { disconnect: true };
      } else if (tbnQuay) {
        // For non-SHUNT, use TBN
        updatedData.dropOffQuay = {
          connect: { id: tbnQuay.id }
        };
      }

      // Handle TAR fields
      updatedData.pickUpTar = data.pickUpQuayId !== existingTransport.pickUpQuayId ? null : existingTransport.pickUpTar;
      updatedData.dropOffTar = data.dropOffQuayId !== existingTransport.dropOffQuayId ? null : existingTransport.dropOffTar;

      // Handle T1 fields
      if (data.requiresT1 !== undefined) {
        updatedData.requiresT1 = data.requiresT1;
      }
      if (data.t1Received !== undefined) {
        updatedData.t1Received = data.t1Received;
      }

      // Handle destinations
      // First delete all existing destinations to avoid unique constraint errors
      await tx.transportDestination.deleteMany({
        where: { transportId: parseInt(id) }
      });
      
      // Then create new destinations with the correct order
      updatedData.destinations = {
        create: data.destinations.map((dest, index) => {
          // Destination null kontrolü
          if (!dest) {
            console.error('Null destination found in data.destinations');
            return {
              order: index + 1,
              destinationDate: new Date(),
              destinationTime: new Date().toISOString(),
              eta: null
            };
          }
          
          // For SHUNT transports, frequentLocationId is optional
          const createData = {
            order: index + 1, // Use index + 1 to ensure unique order values
            destinationDate: new Date(dest.destinationDate),
            destinationTime: dest.destinationTime && dest.destinationTime.trim() !== ""
              ? `${dest.destinationDate}T${dest.destinationTime}:00.000Z`
              : `${dest.destinationDate}T00:00:00.000Z`,
            eta: dest.eta && dest.eta.trim() !== ""
              ? new Date(dest.eta).toISOString()
              : null
          };
          
          // Only include frequentLocationId if it exists or if it's not a SHUNT transport
          if (dest.frequentLocationId || data.type !== 'SHUNT') {
            createData.frequentLocationId = dest.frequentLocationId || null;
          }
          
          return createData;
        })
      };

      // Transport'u güncelle
      const updatedTransport = await tx.transport.update({
        where: {
          id: parseInt(id)
        },
        data: updatedData,
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
            include: {
              slot: true
            }
          },
          truck: true,
          trailer: true
        }
      });

    console.log('After Update:', {
      pickUpQuayId: updatedTransport.pickUpQuayId,
      dropOffQuayId: updatedTransport.dropOffQuayId,
      pickUpTar: updatedTransport.pickUpTar,
      dropOffTar: updatedTransport.dropOffTar
    });

      return updatedTransport;
    });
    
    // Socket.IO bildirimi gönder
    await sendSocketNotification('transport:update', result);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Error updating transport:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const transportId = parseInt(id);

    // Transport'u bul
    const transport = await prisma.transport.findUnique({
      where: { id: transportId },
      include: { 
        cutInfo: true,
        client: true,
        destinations: true
      }
    });

    if (!transport) {
      return NextResponse.json(
        { error: 'Transport not found' },
        { status: 404 }
      );
    }

    // Transaction ile tüm ilişkili kayıtları sil
    const result = await prisma.$transaction(async (tx) => {
      // 1. Destinations'ları sil
      await tx.transportDestination.deleteMany({
        where: { transportId }
      });

      // 2. Slot assignments'ları sil
      await tx.transportSlot.deleteMany({
        where: { transportId }
      });

      // 3. Transport'u sil veya isDeleted=true yap
      if (transport.cutInfo) {
        // CutInfo kaydı varsa, transport'u mantıksal olarak sil
        return await tx.transport.update({
          where: { id: transportId },
          data: {
            isDeleted: true,
          }
        });
      } else {
        // CutInfo kaydı yoksa, transport'u tamamen sil
        return await tx.transport.delete({
          where: { id: transportId }
        });
      }
    });

    // Socket.IO bildirimi için transport verisini hazırla
    const transportData = {
      id: transportId,
      transportOrderNumber: transport.transportOrderNumber,
      clientId: transport.clientId,
      clientName: transport.client?.name,
      containerNumber: transport.containerNumber,
      containerType: transport.containerType
    };

    // Socket.IO bildirimi gönder - transport:delete eventi ile
    await sendSocketNotification('transport:delete', transportData);
    console.log(`Transport silindi, Socket.IO bildirimi gönderildi: ID=${transportId}, OrderNumber=${transport.transportOrderNumber}`);

    // Ekstra olarak planning:update bildirimi de gönder, tüm planlama ekranlarının yenilenmesi için
    await sendSocketNotification('planning:update', { action: 'transport-deleted', transportId });
    console.log(`Planning update bildirimi gönderildi: transport-deleted, ID=${transportId}`);

    return NextResponse.json({
      ...result,
      message: transport.cutInfo 
        ? "Transport marked as deleted successfully" 
        : "Transport deleted successfully"
    });
  } catch (error) {
    console.error('Error deleting transport:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete transport' },
      { status: 500 }
    );
  }
}

export async function PATCH(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();
    
    console.log('PATCH request data:', data); // Log the incoming data to see if pickUpTarPositive is included
    
    const updatedTransport = await prisma.transport.update({
      where: { id: parseInt(id) },
      data: {
        pickUpTar: 'pickUpTar' in data ? data.pickUpTar : undefined,
        dropOffTar: 'dropOffTar' in data ? data.dropOffTar : undefined, 
        pickUpTarPositive: 'pickUpTarPositive' in data ? Boolean(data.pickUpTarPositive) : undefined,
        dropOffTarPositive: 'dropOffTarPositive' in data ? Boolean(data.dropOffTarPositive) : undefined,
        departureDate: 'departureDate' in data ? data.departureDate : undefined,
        returnDate: 'returnDate' in data ? data.returnDate : undefined,
      },
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
          include: {
            slot: true
          }
        },
        truck: true,
        trailer: true
      }
    });

    // Socket.IO bildirimi gönder
    await sendSocketNotification('transport:update', updatedTransport);
    console.log("TAR update notification sent via Socket.IO");

    return NextResponse.json(updatedTransport);
  } catch (error) {
    console.error('Error updating transport TAR:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to update transport TAR' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const transportId = parseInt(id);
    
    const transport = await prisma.transport.findUnique({
      where: { id: transportId },
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
        slotAssignments: {
          orderBy: {
            date: 'asc'
          }
        },
        truck: true,
        trailer: true,
        notes: true,
        cutInfo: true
      }
    });

    if (!transport) {
      return NextResponse.json(
        { error: "Transport not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(transport);
  } catch (error) {
    console.error('Error fetching transport:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 