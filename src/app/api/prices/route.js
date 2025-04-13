import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { transformPriceData } from "@/lib/validations/price";

export async function GET() {
  try {
    const prices = await prisma.price.findMany({
      include: {
        client: true,
        frequentLocation: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(prices);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch prices" },
      { status: 500 }
    );
  }
}

export async function POST(request) {
  try {
    const data = await request.json();
    const validatedData = transformPriceData(data);
    
    // Aynı müşteri ve lokasyon için fiyat var mı kontrol et
    const existingPrice = await prisma.price.findFirst({
      where: {
        clientId: validatedData.clientId,
        frequentLocationId: validatedData.frequentLocationId
      }
    });

    if (existingPrice) {
      return NextResponse.json(
        { error: "This client and location combination already has a price record" },
        { status: 400 }
      );
    }
    
    // Sabit fiyat seçilmişse, diğer alanları null yap
    if (validatedData.isFixedPrice) {
      validatedData.dieselSurcharge = null;
      validatedData.roadTax = null;
    }
    
    // isFixedPrice alanını çıkar, Prisma şemasında henüz yok
    const { isFixedPrice, ...priceData } = validatedData;
    
    const price = await prisma.price.create({
      data: priceData,
      include: {
        client: true,
        frequentLocation: true,
      },
    });

    return NextResponse.json(price);
  } catch (error) {
    console.error('Error creating price:', error);
    return NextResponse.json(
      { error: error.message || "Failed to create price" },
      { status: 500 }
    );
  }
} 