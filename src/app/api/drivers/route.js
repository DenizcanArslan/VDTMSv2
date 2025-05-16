import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request) {
  try {
    const data = await request.json();

    // nickName kontrolü
    if (!data.nickName) {
      return NextResponse.json(
        { error: "Nick name is required" },
        { status: 400 }
      );
    }

    // Boş string'i null'a çevir
    const formattedData = {
      ...data,
      alphaPassNumber: data.alphaPassNumber || null,
      birthday: data.birthday ? new Date(data.birthday).toISOString() : null,
      alphaPassExpireDate: data.alphaPassExpireDate ? new Date(data.alphaPassExpireDate).toISOString() : null,
      driverLicenseExpireDate: data.driverLicenseExpireDate ? new Date(data.driverLicenseExpireDate).toISOString() : null,
      tachographExpireDate: data.tachographExpireDate 
        ? new Date(data.tachographExpireDate).toISOString() 
        : null,
      adrExpireDate: data.adrExpireDate && data.adr === "YES"
        ? new Date(data.adrExpireDate).toISOString()
        : null,
      cargoCardExpireDate: data.cargoCardExpireDate && data.cargoCard === "YES"
        ? new Date(data.cargoCardExpireDate).toISOString()
        : null,
    };

    // Nickname ve AlphaPass kontrolü
    const existingDriver = await prisma.driver.findFirst({
      where: {
        OR: [
          { nickName: { equals: data.nickName, mode: 'insensitive' } },
          formattedData.alphaPassNumber ? 
            { alphaPassNumber: { equals: formattedData.alphaPassNumber, mode: 'insensitive' } } 
            : undefined
        ].filter(Boolean)
      }
    });

    if (existingDriver) {
      if (existingDriver.nickName.toLowerCase() === data.nickName.toLowerCase()) {
        return NextResponse.json(
          { error: "A driver with this nickname already exists" },
          { status: 400 }
        );
      }
      if (formattedData.alphaPassNumber && 
          existingDriver.alphaPassNumber?.toLowerCase() === formattedData.alphaPassNumber.toLowerCase()) {
        return NextResponse.json(
          { error: "A driver with this alpha pass number already exists" },
          { status: 400 }
        );
      }
    }

    const newDriver = await prisma.driver.create({
      data: formattedData,
    });

    return NextResponse.json(newDriver);
  } catch (error) {
    console.error("Error creating driver:", error);
    return NextResponse.json(
      { error: error.message || "Error creating driver" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const drivers = await prisma.driver.findMany();
    return NextResponse.json(drivers);
  } catch (error) {
    console.error("Error fetching drivers:", error);
    return NextResponse.json(
      { error: "Error fetching drivers" },
      { status: 500 }
    );
  }
} 