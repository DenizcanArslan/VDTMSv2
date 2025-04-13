import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { transformPriceData } from "@/lib/validations/price";

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();
    const validatedData = transformPriceData(data);
    const priceId = parseInt(id);

    // Güncellenecek fiyatın mevcut bilgilerini al
    const currentPrice = await prisma.price.findUnique({
      where: { id: priceId }
    });

    if (!currentPrice) {
      return NextResponse.json(
        { error: "Güncellenecek fiyat bulunamadı" },
        { status: 404 }
      );
    }

    // Eğer müşteri veya lokasyon değiştiyse, bu kombinasyon için başka bir fiyat var mı kontrol et
    if (currentPrice.clientId !== validatedData.clientId || 
        currentPrice.frequentLocationId !== validatedData.frequentLocationId) {
      
      const existingPrice = await prisma.price.findFirst({
        where: {
          clientId: validatedData.clientId,
          frequentLocationId: validatedData.frequentLocationId,
          id: { not: priceId } // Kendisi hariç
        }
      });

      if (existingPrice) {
        return NextResponse.json(
          { error: "This client and location combination already has a price record" },
          { status: 400 }
        );
      }
    }

    // Sabit fiyat seçilmişse, diğer alanları null yap
    if (validatedData.isFixedPrice) {
      validatedData.dieselSurcharge = null;
      validatedData.roadTax = null;
    }

    // isFixedPrice alanını çıkar, Prisma şemasında henüz yok
    const { isFixedPrice, ...priceData } = validatedData;

    const price = await prisma.price.update({
      where: { id: priceId },
      data: priceData,
      include: {
        client: true,
        frequentLocation: true,
      },
    });

    return NextResponse.json(price);
  } catch (error) {
    console.error('Error updating price:', error);
    return NextResponse.json(
      { error: error.message || "Fiyat güncellenirken bir hata oluştu" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    await prisma.price.delete({
      where: { id: parseInt(id) },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json(
      { error: "Fiyat silinirken bir hata oluştu" },
      { status: 500 }
    );
  }
} 