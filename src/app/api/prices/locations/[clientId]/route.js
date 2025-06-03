import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET(request, { params }) {
  try {
    const { clientId } = params;
    const parsedClientId = parseInt(clientId);

    // Client'ın fiyatı olan tüm lokasyonları getir
    const locations = await prisma.frequentLocation.findMany({
      where: {
        prices: {
          some: {
            clientId: parsedClientId
          }
        }
      },
      select: {
        id: true,
        name: true,
        country: true,
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(locations);
  } catch (error) {
    console.error('Error fetching locations for client:', error);
    return NextResponse.json(
      { error: "Failed to fetch locations" },
      { status: 500 }
    );
  }
} 