import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// GET - Tüm lokasyonları getir
export async function GET() {
  try {
    const frequentLocations = await prisma.frequentLocation.findMany({
      where: {
        isActive: true
      },
      orderBy: {
        name: 'asc'
      }
    });

    return NextResponse.json(frequentLocations);
  } catch (error) {
    console.error('Error fetching frequent locations:', error);
    return NextResponse.json(
      { error: 'Failed to fetch frequent locations' },
      { status: 500 }
    );
  }
}

// POST - Yeni lokasyon oluştur
export async function POST(request) {
  try {
    const data = await request.json();
    console.log("Received data:", data);

    if (!data.km) {
      return NextResponse.json(
        { error: "KM is required" },
        { status: 400 }
      );
    }

    const newLocation = await prisma.frequentLocation.create({
      data: {
        name: data.name,
        country: data.country,
        postalCode: data.postalCode || null,
        km: parseInt(data.km),
      },
    });
    return NextResponse.json(newLocation);
  } catch (error) {
    console.error("Error details:", error);
    return NextResponse.json(
      { error: error.message || "Error creating location" },
      { status: 500 }
    );
  }
} 