import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// Socket.IO bildirim fonksiyonu
const sendSocketNotification = async (event, data) => {
  try {
    const socketServerUrl = process.env.SOCKET_SERVER_URL || 'http://127.0.0.1:3001/api/notify';
    
    console.log(`Socket.IO bildirimi gönderiliyor: ${event}`, {
      dataType: typeof data,
      transportId: data.id,
      transportStatus: data.status,
      transportCurrentStatus: data.currentStatus,
      isCut: data.isCut
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
      console.error(`Socket.IO bildirim hatası: ${response.status} ${errorText}`);
      return;
    }
    
    console.log(`Socket.IO bildirimi başarıyla gönderildi: ${event}`);
  } catch (error) {
    console.error('Socket.IO bildirim hatası:', error);
    console.error('Hata detayları:', error.stack);
  }
};

// POST /api/planning/transports/[id]/cut
// Transport'u belirli bir tarihte keser ve yeni bir transport oluşturur
export async function POST(request, { params }) {
  try {
    const { id } = params;
    const transportId = parseInt(id);
    
    // Request body'den gerekli bilgileri al
    const { 
      cutDate, 
      cutType, 
      locationId, 
      customLocation, 
      notes,
      cutEndDate,
      truck,
      trailer
    } = await request.json();

    // Eğer cutEndDate varsa, bu bir restore işlemidir
    if (cutEndDate) {
      return handleRestoreTransport(transportId, cutEndDate, truck, trailer, notes);
    }

    // Gerekli alanları kontrol et
    if (!cutDate || !cutType) {
      return NextResponse.json(
        { error: "Cut date and cut type are required" },
        { status: 400 }
      );
    }

    // Transport'u bul
    const transport = await prisma.transport.findUnique({
      where: { id: transportId },
      include: {
        client: true,
        destinations: {
          include: {
            frequentLocation: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        trailer: true,
        truck: true,
      },
    });

    if (!transport) {
      return NextResponse.json(
        { error: "Transport not found" },
        { status: 404 }
      );
    }

    // Transport zaten kesilmiş mi kontrolü
    if (transport.isCut) {
      // Eğer transportun kesilmiş parçaları varsa, bunların hepsi restore edilmiş veya silinmiş mi kontrol et
      const cutTransports = await prisma.transport.findMany({
        where: {
          originalTransportId: transportId,
          isCut: true,
          isRestored: false,
          isDeleted: false
        }
      });

      // Eğer hala aktif cut transport parçaları varsa, yeni bir cut işlemine izin verme
      if (cutTransports.length > 0) {
        return NextResponse.json(
          { error: "This transport has already been cut and has active cut parts" },
          { status: 400 }
        );
      }
      
      // Tüm cut parçaları restore edilmiş veya silinmiş, bu durumda transport tekrar kesilebilir
      // Transport'un isCut flag'ini false yap
      await prisma.transport.update({
        where: { id: transportId },
        data: { isCut: false }
      });
    }

    // Kesme tarihini Date objesi olarak oluştur
    const cutDateObj = new Date(cutDate);

    // Yeni transport için verileri hazırla
    const newTransportData = {
      clientId: transport.clientId,
      transportOrderNumber: transport.transportOrderNumber,
      bookingReference: transport.bookingReference,
      containerNumber: (cutType === 'CONTAINER' || cutType === 'BOTH') ? transport.containerNumber : null,
      loadingUnloadingReference: transport.loadingUnloadingReference,
      containerType: (cutType === 'CONTAINER' || cutType === 'BOTH') ? transport.containerType : null,
      genset: (cutType === 'CONTAINER' || cutType === 'BOTH') ? transport.genset : 'NO',
      adr: (cutType === 'CONTAINER' || cutType === 'BOTH') ? transport.adr : 'NO',
      pickUpQuayId: null,
      dropOffQuayId: null,
      status: transport.status,
      pickUpTar: null,
      dropOffTar: null,
      type: transport.type,
      order: transport.order,
      departureDate: null,
      returnDate: null,
      scrCpuStatus: transport.scrCpuStatus,
      scrCpuColor: transport.scrCpuColor,
      requiresScrCpu: transport.requiresScrCpu,
      scrCpuAssignedToDriver: transport.scrCpuAssignedToDriver,
      hasTransportOrder: transport.hasTransportOrder,
      transportOrderReceivedAt: transport.transportOrderReceivedAt,
      currentStatus: "CUT",
      sentToDriver: false,
      pickUpEta: null,
      dropOffEta: null,
      truckId: null,
      trailerId: (cutType === 'TRAILER' || cutType === 'BOTH') ? transport.trailerId : null,
      isCut: true,
      originalTransportId: transportId,
    };

    // Prisma transaction ile işlemleri gerçekleştir
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Yeni transport'u oluştur
      const newTransport = await prisma.transport.create({
        data: newTransportData,
      });

      // 2. CutInfo kaydını oluştur
      await prisma.cutInfo.create({
        data: {
          transportId: newTransport.id,
          cutType: cutType,
          cutStartDate: cutDateObj,
          locationId: locationId || null,
          customLocation: customLocation || null,
          notes: notes || null,
        },
      });

      // 3. Orijinal transport'u güncelle - eğer status ONGOING ise COMPLETED'a çevir
      await prisma.transport.update({
        where: { id: transportId },
        data: {
          isCut: true,
          status: transport.status === 'ONGOING' ? 'COMPLETED' : transport.status,
          currentStatus: 'COMPLETED', // Kesilen transport otomatik olarak COMPLETED durumuna geçsin
          sentToDriver: transport.sentToDriver // Mevcut sentToDriver değerini koru
        },
      });

      return { originalTransport: transport, newTransport };
    });

    // Socket.IO bildirimleri gönder
    // 1. Orijinal transport'un güncel halini al
    const updatedOriginalTransport = await prisma.transport.findUnique({
      where: { id: transportId },
      include: {
        client: true,
        destinations: {
          include: {
            frequentLocation: true
          },
          orderBy: {
            order: 'asc'
          }
        },
        pickUpQuay: true,
        dropOffQuay: true,
        truck: true,
        trailer: true,
        slotAssignments: true
      }
    });

    // 2. Socket.IO bildirimi gönder - transport durumu değişikliği için
    await sendSocketNotification('transport:status-update', updatedOriginalTransport);
    
    // 3. Genel transport güncelleme bildirimi
    await sendSocketNotification('transport:update', updatedOriginalTransport);

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error cutting transport:", error);
    return NextResponse.json(
      { error: "Failed to cut transport", details: error.message },
      { status: 500 }
    );
  }
}

// Kesilmiş bir transport'u planlamaya geri ekler
async function handleRestoreTransport(transportId, cutEndDate, truck, trailer, notes) {
  try {
    // Transport'u bul
    const transport = await prisma.transport.findUnique({
      where: { 
        id: parseInt(transportId),
        isCut: true,
      },
      include: {
        client: true,
        cutInfo: true,
        destinations: {
          include: {
            frequentLocation: true,
          },
          orderBy: {
            order: 'asc',
          },
        },
        trailer: true,
        truck: true,
      },
    });

    if (!transport) {
      return NextResponse.json(
        { message: "Cut transport not found" },
        { status: 404 }
      );
    }

    // cutEndDate değerini kontrol et
    if (!cutEndDate) {
      return NextResponse.json(
        { message: "Cut end date is required for restoring transport" },
        { status: 400 }
      );
    }

    const cutEndDateObj = new Date(cutEndDate);

    // Yeni transport için verileri hazırla
    const newTransportData = {
      clientId: transport.clientId,
      transportOrderNumber: transport.transportOrderNumber,
      bookingReference: transport.bookingReference,
      containerNumber: (transport.cutInfo.cutType === 'CONTAINER' || transport.cutInfo.cutType === 'BOTH') ? transport.containerNumber : null,
      loadingUnloadingReference: transport.loadingUnloadingReference,
      containerType: (transport.cutInfo.cutType === 'CONTAINER' || transport.cutInfo.cutType === 'BOTH') ? transport.containerType : null,
      genset: (transport.cutInfo.cutType === 'CONTAINER' || transport.cutInfo.cutType === 'BOTH') ? transport.genset : 'NO',
      adr: (transport.cutInfo.cutType === 'CONTAINER' || transport.cutInfo.cutType === 'BOTH') ? transport.adr : 'NO',
      pickUpQuayId: null,
      dropOffQuayId: null,
      status: transport.status,
      pickUpTar: null,
      dropOffTar: null,
      type: "SHUNT", // Transport type'ı SHUNT olarak ayarla
      order: transport.order,
      departureDate: null, // Advanced Planning'in otomatik açılmaması için null olarak ayarla
      returnDate: transport.returnDate,
      scrCpuStatus: transport.scrCpuStatus,
      scrCpuColor: transport.scrCpuColor,
      requiresScrCpu: transport.requiresScrCpu,
      scrCpuAssignedToDriver: transport.scrCpuAssignedToDriver,
      hasTransportOrder: transport.hasTransportOrder,
      transportOrderReceivedAt: transport.transportOrderReceivedAt,
      currentStatus: "PLANNED", // Restore edilen transport'un durumunu PLANNED olarak ayarla
      sentToDriver: false, // Her zaman false olarak ayarla - yeni restore edilen transport sürücüye gönderilmemiş olmalı
      pickUpEta: null,
      dropOffEta: null,
      truckId: truck ? parseInt(truck) : null,
      trailerId: (transport.cutInfo.cutType === 'TRAILER' || transport.cutInfo.cutType === 'BOTH') ? (trailer ? parseInt(trailer) : transport.trailerId) : null,
      isCut: false, // Bu bir normal transport
      originalTransportId: transport.originalTransportId, // Orijinal transport ID'sini koru
    };

    // Prisma transaction ile işlemleri gerçekleştir
    const result = await prisma.$transaction(async (prisma) => {
      // 1. CutInfo'yu güncelle - bitiş tarihini ekle
      await prisma.cutInfo.update({
        where: { id: transport.cutInfo.id },
        data: {
          cutEndDate: cutEndDateObj,
          notes: notes ? (transport.cutInfo.notes ? `${transport.cutInfo.notes}\n\n${notes}` : notes) : transport.cutInfo.notes,
        },
      });

      // 2. Cut transport'u güncelle - restore edildi olarak işaretle
      await prisma.transport.update({
        where: { id: transport.id },
        data: {
          isRestored: true,
        },
      });

      // 3. Bu restore işleminden sonra, orijinal transporta ait aktif cut transportlar var mı kontrol et
      if (transport.originalTransportId) {
        const remainingCutTransports = await prisma.transport.count({
          where: {
            originalTransportId: transport.originalTransportId,
            id: { not: transport.id }, // Kendisi haricindeki cut transportlar
            isCut: true,
            isRestored: false,
            isDeleted: false
          }
        });

        // Eğer başka aktif cut transport kalmadıysa, orijinal transport'un isCut flag'ini false yap
        if (remainingCutTransports === 0) {
          await prisma.transport.update({
            where: { id: transport.originalTransportId },
            data: {
              isCut: false // Transport'un tekrar kesilebilmesi için isCut değerini false yap
            }
          });
          
          // Orijinal transport'u al ve bildirim gönder
          const originalTransport = await prisma.transport.findUnique({
            where: { id: transport.originalTransportId },
            include: {
              client: true,
              destinations: {
                include: {
                  frequentLocation: true
                },
                orderBy: {
                  order: 'asc'
                }
              },
              pickUpQuay: true,
              dropOffQuay: true,
              truck: true,
              trailer: true,
              slotAssignments: true
            }
          });
          
          // Orijinal transport için bildirim gönder
          if (originalTransport) {
            await sendSocketNotification('transport:update', originalTransport);
          }
        }
      }

      // 4. Yeni transport oluştur
      const newTransport = await prisma.transport.create({
        data: newTransportData,
      });

      // 5. Her zaman seçilen tarih için boş bir destinasyon oluştur
      await prisma.transportDestination.create({
        data: {
          transportId: newTransport.id,
          order: 1,
          destinationDate: cutEndDateObj,
          // Diğer alanlar null olabilir
        },
      });

      return {
        cutTransport: transport,
        newTransport: await prisma.transport.findUnique({
          where: { id: newTransport.id },
          include: {
            client: true,
            destinations: {
              include: {
                frequentLocation: true,
              },
              orderBy: {
                order: 'asc',
              },
            },
            truck: true,
            trailer: true,
          },
        }),
      };
    });

    // Socket.IO bildirimleri gönder
    // 1. Restore edilen transport için bildirim
    if (result.newTransport) {
      await sendSocketNotification('transport:create', result.newTransport);
    }
    
    // 2. Cut transport'un güncellenmiş durumu için bildirim
    if (result.cutTransport) {
      const updatedCutTransport = await prisma.transport.findUnique({
        where: { id: result.cutTransport.id },
        include: {
          client: true,
          destinations: {
            include: {
              frequentLocation: true
            },
            orderBy: {
              order: 'asc'
            }
          },
          pickUpQuay: true,
          dropOffQuay: true,
          truck: true,
          trailer: true
        }
      });
      
      await sendSocketNotification('transport:update', updatedCutTransport);
    }

    return NextResponse.json(result, { status: 200 });
  } catch (error) {
    console.error("Error restoring cut transport:", error);
    return NextResponse.json(
      { message: "Failed to restore cut transport", details: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/planning/transports/[id]/cut
// Kesilmiş bir transport'u ve ilgili cut bilgilerini tamamen siler
export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const transportId = parseInt(id);
    
    // Transport'u bul
    const transport = await prisma.transport.findUnique({
      where: { 
        id: transportId,
        isCut: true,
      },
      include: {
        cutInfo: true,
      },
    });

    if (!transport) {
      return NextResponse.json(
        { message: "Cut transport not found" },
        { status: 404 }
      );
    }

    // Orijinal transport'u kontrol et
    if (transport.originalTransportId) {
      // Bu cut transport silindikten sonra, orijinal transporta ait aktif cut transportlar var mı kontrol et
      const remainingCutTransports = await prisma.transport.count({
        where: {
          originalTransportId: transport.originalTransportId,
          id: { not: transportId }, // Kendisi haricindeki cut transportlar
          isCut: true,
          isRestored: false,
          isDeleted: false
        }
      });

      // Eğer başka aktif cut transport kalmadıysa, orijinal transport'un isCut flag'ini false yap
      if (remainingCutTransports === 0) {
        await prisma.transport.update({
          where: { id: transport.originalTransportId },
          data: {
            isCut: false // Transport'un tekrar kesilebilmesi için isCut değerini false yap
          }
        });
        
        // Orijinal transport'u al ve bildirim gönder
        const originalTransport = await prisma.transport.findUnique({
          where: { id: transport.originalTransportId },
          include: {
            client: true,
            destinations: {
              include: {
                frequentLocation: true
              },
              orderBy: {
                order: 'asc'
              }
            },
            pickUpQuay: true,
            dropOffQuay: true,
            truck: true,
            trailer: true,
            slotAssignments: true
          }
        });
        
        // Orijinal transport için bildirim gönder
        if (originalTransport) {
          await sendSocketNotification('transport:update', originalTransport);
        }
      }
    }

    // Transport ile ilişkili tüm verileri sil
    const result = await prisma.$transaction(async (prisma) => {
      // 1. Önce CutInfo'yu sil
      if (transport.cutInfo) {
        await prisma.cutInfo.delete({
          where: { id: transport.cutInfo.id }
        });
      }
      
      // 2. Transport Notes'ları sil
      await prisma.transportNote.deleteMany({
        where: { transportId: transportId }
      });
      
      // 3. Transport Destinations'ları sil
      await prisma.transportDestination.deleteMany({
        where: { transportId: transportId }
      });
      
      // 4. Transport Slot'ları sil
      await prisma.transportSlot.deleteMany({
        where: { transportId: transportId }
      });
      
      // 5. Transport'u tamamen sil
      const deletedTransport = await prisma.transport.delete({
        where: { id: transportId }
      });
      
      return deletedTransport;
    });

    // Transport silindi bildirimi gönder
    await sendSocketNotification('transport:delete', { id: transportId });

    return NextResponse.json({ 
      message: "Transport permanently deleted successfully"
    }, { status: 200 });
  } catch (error) {
    console.error("Error deleting cut transport:", error);
    return NextResponse.json(
      { message: "Failed to delete cut transport", details: error.message },
      { status: 500 }
    );
  }
} 