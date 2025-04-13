import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// GET /api/planning/transports/cut
// Kesilmiş ve restore edilmiş transportları listeler
export async function GET(request) {
  try {
    // URL parametrelerini al
    const { searchParams } = new URL(request.url);
    const date = searchParams.get("date");
    const clientId = searchParams.get("clientId");
    const cutType = searchParams.get("cutType");
    const locationId = searchParams.get("locationId");
    const showRestored = searchParams.get("showRestored") !== "false"; // Varsayılan olarak restore edilenleri de göster
    const showArchived = searchParams.get("showArchived") === "true"; // Varsayılan olarak arşivlenmiş transportları gösterme

    // Filtreleme koşullarını oluştur
    let whereConditions = {
      isDeleted: false, // Silinmiş transportları gösterme
    };
    
    // Sadece aktif kesilmiş transportları göstermek isteniyorsa
    if (!showRestored) {
      whereConditions.isCut = true;
      whereConditions.isRestored = false;
    } else {
      // Restore edilmiş transportları da göster
      whereConditions.OR = [
        { isCut: true },
        { isRestored: true }
      ];
    }

    // Arşivlenmiş transportları gösterme (eğer showArchived=true değilse)
    if (!showArchived) {
      whereConditions.isArchived = false;
    }

    // Müşteri filtresi
    if (clientId) {
      whereConditions.clientId = parseInt(clientId);
    }

    // Kesilmiş ve restore edilmiş transportları getir
    const allTransports = await prisma.transport.findMany({
      where: whereConditions,
      include: {
        client: true,
        cutInfo: {
          include: {
            location: true,
          },
        },
        originalTransport: {
          select: {
            id: true,
            transportOrderNumber: true,
          },
        },
        destinations: {
          include: {
            frequentLocation: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        trailer: true,
      },
      orderBy: [
        {
          isCut: 'desc', // Önce aktif kesilmiş olanlar
        },
      ],
    });

    // Sadece cutInfo'su olan transportları filtrele
    let cutTransports = allTransports.filter(transport => transport.cutInfo);

    // Tarih filtresi
    if (date) {
      const startDate = new Date(date);
      startDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(date);
      endDate.setHours(23, 59, 59, 999);
      
      cutTransports = cutTransports.filter(transport => {
        const cutStartDate = new Date(transport.cutInfo.cutStartDate);
        return cutStartDate >= startDate && cutStartDate <= endDate;
      });
    }

    // Kesme tipi filtresi
    if (cutType) {
      cutTransports = cutTransports.filter(transport => 
        transport.cutInfo.cutType === cutType
      );
    }

    // Lokasyon filtresi
    if (locationId) {
      const locId = parseInt(locationId);
      cutTransports = cutTransports.filter(transport => 
        transport.cutInfo.locationId === locId
      );
    }

    // Kesim tarihine göre sırala
    cutTransports.sort((a, b) => {
      // Önce aktif kesilmiş olanlar
      if (a.isCut !== b.isCut) {
        return a.isCut ? -1 : 1;
      }
      
      // Sonra kesim tarihine göre sırala (yeniden eskiye)
      const dateA = new Date(a.cutInfo.cutStartDate);
      const dateB = new Date(b.cutInfo.cutStartDate);
      return dateB - dateA;
    });

    console.log('Cut Transports from API:', JSON.stringify(cutTransports, null, 2));
    return NextResponse.json(cutTransports, { status: 200 });
  } catch (error) {
    console.error("Error fetching cut transports:", error);
    return NextResponse.json(
      { error: "Failed to fetch cut transports", details: error.message },
      { status: 500 }
    );
  }
} 