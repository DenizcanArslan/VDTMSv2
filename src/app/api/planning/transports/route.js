import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { isGensetRequired } from '@/lib/constants/containerTypes';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request) {
  try {
    const data = await request.json();
    
    console.log('API received data:', data);
    
    // Loading reference kontrolü - eğer bir referans girilmişse benzersiz olmalı
    if (data.loadingUnloadingReference) {
      // Loading reference'ı küçük harfe dönüştür
      data.loadingUnloadingReference = data.loadingUnloadingReference.toLowerCase();
      
      // Silinmemiş ve aynı loading reference'a sahip başka bir transport var mı kontrol et
      const existingTransport = await prisma.transport.findFirst({
        where: {
          loadingUnloadingReference: {
            equals: data.loadingUnloadingReference,
            mode: 'insensitive'  // Büyük/küçük harf duyarsız arama
          },
          isDeleted: false
        }
      });
      
      if (existingTransport) {
        return NextResponse.json(
          { error: "Loading/Unloading Reference must be unique. Another transport with this reference already exists." },
          { status: 400 }
        );
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
    
    const gensetRequired = isGensetRequired(data.containerType);
    
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

    // Destinations için veri hazırla
    const destinationsData = data.destinations.map((dest, index) => {
      // For SHUNT transports, frequentLocationId is optional
      if (data.type === 'SHUNT' && !dest.frequentLocationId) {
        return {
          order: index + 1,
          destinationDate: new Date(dest.destinationDate),
          destinationTime: dest.destinationTime && dest.destinationTime.trim() !== "" 
            ? `${dest.destinationDate}T${dest.destinationTime}:00.000Z` 
            : null,
          eta: dest.eta
        };
      }
      
      // For regular transports or SHUNT with location
      return {
        frequentLocation: {
          connect: {
            id: dest.frequentLocationId
          }
        },
        order: index + 1,
        destinationDate: new Date(dest.destinationDate),
        destinationTime: dest.destinationTime && dest.destinationTime.trim() !== "" 
          ? `${dest.destinationDate}T${dest.destinationTime}:00.000Z` 
          : null,
        eta: dest.eta
      };
    });

    // Slot atamalarını hazırla
    let slotAssignments = [];
    
    // Destination tarihlerini al
    const destinationDates = destinationsData
      .map(d => new Date(d.destinationDate))
      .sort((a, b) => a - b);
    
    // Advanced planning aktif ise ve tarihler girilmişse
    if (data.departureDate && data.returnDate) {
      // Departure ve return tarihleri arasındaki tüm günler için slot oluştur
      const startDate = new Date(data.departureDate);
      const endDate = new Date(data.returnDate);
      
      console.log('Creating slots for date range:', { startDate, endDate });
      
      let currentDate = new Date(startDate);
      let order = 1;
      
      // Tarih aralığındaki her gün için slot oluştur
      while (currentDate <= endDate) {
        slotAssignments.push({
          date: new Date(currentDate),
          slotOrder: order
        });
        
        // Bir sonraki güne geç
        const nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 1);
        currentDate = nextDate;
        order++;
      }
    } else {
      // Sadece destination tarihleri için slot oluştur
      const startDate = destinationDates[0];
      const endDate = destinationDates[destinationDates.length - 1];
      
      let currentDate = new Date(startDate);
      let order = 1;
      
      while (currentDate <= endDate) {
        slotAssignments.push({
          date: new Date(currentDate),
          slotOrder: order
        });
        
        // Bir sonraki güne geç
        const nextDate = new Date(currentDate);
        nextDate.setDate(nextDate.getDate() + 1);
        currentDate = nextDate;
        order++;
      }
    }
    
    // Benzersiz tarihleri al (aynı gün için birden fazla slot oluşturmamak için)
    const uniqueDates = {};
    slotAssignments = slotAssignments.filter(slot => {
      const dateStr = slot.date.toISOString().split('T')[0];
      if (uniqueDates[dateStr]) {
        return false;
      }
      uniqueDates[dateStr] = true;
      return true;
    });
    
    console.log('Slot assignments to create:', slotAssignments.length);

    const transportData = {
      client: {
        connect: {
          id: data.clientId
        }
      },
      transportOrderNumber: data.transportOrderNumber,
      bookingReference: data.bookingReference || null,
      containerNumber: data.containerNumber || null,
      containerType: data.containerType || null,
      loadingUnloadingReference: data.loadingUnloadingReference || null,
      genset: data.genset,
      adr: data.adr,
      type: data.type,
      departureDate: data.departureDate ? new Date(data.departureDate) : null,
      returnDate: data.returnDate ? new Date(data.returnDate) : null,
      hasTransportOrder: data.hasTransportOrder,
      transportOrderReceivedAt: data.transportOrderReceivedAt ? new Date(data.transportOrderReceivedAt) : null,
      pickUpQuay: data.pickUpQuayId ? {
        connect: {
          id: data.pickUpQuayId
        }
      } : undefined,
      dropOffQuay: data.dropOffQuayId ? {
        connect: {
          id: data.dropOffQuayId
        }
      } : undefined,
      destinations: {
        create: destinationsData
      },
      slotAssignments: {
        create: slotAssignments
      }
    };

    console.log('Transport data to save:', transportData);
    
    const transport = await prisma.transport.create({
      data: transportData,
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
        trailer: true
      }
    });

    return NextResponse.json(transport);
  } catch (error) {
    console.error('Error creating transport:', error);
    console.log('Detailed error:', error.response?.data || error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  try {
    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const showArchived = searchParams.get("showArchived") === "true"; // Varsayılan olarak arşivlenmiş transportları gösterme
    
    // Filtreleme koşullarını oluştur
    const whereConditions = {
      isCut: false, // Kesilen transportları gösterme (bunlar cut-transports sayfasında gösteriliyor)
      NOT: {
        currentStatus: "CUT" // CUT statusündeki transportları gösterme
      }
    };
    
    // Arşivlenmiş transportları gösterme (eğer showArchived=true değilse)
    if (!showArchived) {
      whereConditions.isArchived = false;
    }

    const transports = await prisma.transport.findMany({
      where: whereConditions,
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
        trailer: true
      },
      orderBy: {
        createdAt: 'desc'
      }
    });

    return NextResponse.json(transports);
  } catch (error) {
    console.error('Error fetching transports:', error);
    return NextResponse.json(
      { error: 'Error fetching transports' },
      { status: 500 }
    );
  }
} 