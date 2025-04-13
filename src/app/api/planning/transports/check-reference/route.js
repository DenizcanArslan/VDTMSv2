import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function POST(request) {
  try {
    const { reference, excludeId } = await request.json();
    
    if (!reference) {
      return NextResponse.json(
        { error: "Reference is required" },
        { status: 400 }
      );
    }

    // Reference'ı küçük harfe dönüştür
    const normalizedReference = reference.toLowerCase();
    
    // Referansın benzersiz olup olmadığını kontrol et
    const whereConditions = {
      loadingUnloadingReference: {
        equals: normalizedReference,
        mode: 'insensitive'  // Büyük/küçük harf duyarsız arama
      },
      isDeleted: false
    };
    
    // Eğer excludeId verildiyse, o ID'yi sonuçlardan hariç tut
    if (excludeId) {
      whereConditions.id = { not: parseInt(excludeId) };
    }
    
    const existingTransport = await prisma.transport.findFirst({
      where: whereConditions,
      select: {
        id: true,
        transportOrderNumber: true,
        originalTransportId: true
      }
    });
    
    // Eğer referans ile aynı olan bir transport bulunduysa
    if (existingTransport) {
      // Exclude edilen transport'u al (eğer varsa)
      let excludedTransport = null;
      if (excludeId) {
        excludedTransport = await prisma.transport.findUnique({
          where: { id: parseInt(excludeId) },
          select: {
            id: true,
            originalTransportId: true
          }
        });
      }
      
      // Cut ilişkisini kontrol et
      let isCutRelated = false;
      
      if (excludedTransport) {
        // Orijinal transport ID'lerini belirle
        const currentOriginalId = excludedTransport.originalTransportId || excludedTransport.id;
        const foundOriginalId = existingTransport.originalTransportId || existingTransport.id;
        
        // Temel cut ilişkisi kontrolü
        if (
          currentOriginalId === foundOriginalId || 
          existingTransport.id === currentOriginalId ||
          excludedTransport.id === foundOriginalId
        ) {
          isCutRelated = true;
        } else {
          // Daha kapsamlı ilişki kontrolü
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
          
          // İki grup arasında ortak ID var mı kontrol et
          const currentIds = relatedTransportsForCurrent.map(t => t.id);
          const foundIds = relatedTransportsForFound.map(t => t.id);
          
          isCutRelated = currentIds.some(id => foundIds.includes(id));
        }
      }
      
      // Cut ilişkisi varsa, var kabul etme
      return NextResponse.json({
        exists: !isCutRelated, // Cut ilişkisi varsa exists false olmalı
        transportId: existingTransport?.id,
        transportOrderNumber: existingTransport?.transportOrderNumber,
        isCutRelated: isCutRelated // Ek bilgi olarak ilişki durumunu da gönderelim
      });
    } else {
      // Eşleşen transport yoksa
      return NextResponse.json({
        exists: false,
        transportId: null,
        transportOrderNumber: null,
        isCutRelated: false
      });
    }
  } catch (error) {
    console.error('Error checking reference:', error);
    return NextResponse.json(
      { error: 'Error checking reference' },
      { status: 500 }
    );
  }
} 