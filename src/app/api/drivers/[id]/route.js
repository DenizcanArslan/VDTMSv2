import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

function capitalizeFirstLetter(string) {
  if (!string) return string;
  return string.charAt(0).toUpperCase() + string.slice(1).toLowerCase();
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();

    // Status değişikliği mi kontrol et
    if (data.hasOwnProperty('isActive')) {
      const updatedDriver = await prisma.driver.update({
        where: { id: parseInt(id) },
        data: { isActive: data.isActive }
      });
      return NextResponse.json(updatedDriver);
    }

    // Nickname ve Alpha Pass Number kontrolü
    const existingDriver = await prisma.driver.findFirst({
      where: {
        AND: [
          {
            OR: [
              { nickName: { equals: data.nickName, mode: 'insensitive' } },
              { alphaPassNumber: data.alphaPassNumber ? 
                { equals: data.alphaPassNumber, mode: 'insensitive' } : undefined }
            ]
          },
          { id: { not: parseInt(id) } }
        ]
      }
    });

    if (existingDriver) {
      if (existingDriver.nickName.toLowerCase() === data.nickName.toLowerCase()) {
        return NextResponse.json(
          { error: "A driver with this nickname already exists" },
          { status: 400 }
        );
      }
      if (existingDriver.alphaPassNumber?.toLowerCase() === data.alphaPassNumber?.toLowerCase()) {
        return NextResponse.json(
          { error: "A driver with this alpha pass number already exists" },
          { status: 400 }
        );
      }
    }

    // İsim ve soyisimlerin baş harflerini büyük yap
    if (data.name) data.name = capitalizeFirstLetter(data.name);
    if (data.surname) data.surname = capitalizeFirstLetter(data.surname);

    // Tarihleri ve diğer alanları formatla
    const formattedData = {
      ...data,
      birthday: data.birthday ? new Date(data.birthday).toISOString() : null,
      alphaPassNumber: data.alphaPassNumber || null,
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

    const updatedDriver = await prisma.driver.update({
      where: { id: parseInt(id) },
      data: formattedData,
    });

    return NextResponse.json(updatedDriver);
  } catch (error) {
    console.error("Error updating driver:", error);
    return NextResponse.json(
      { error: error.message || "Error updating driver" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    console.log("Silinecek sürücü ID:", id);

    // Önce bu sürücüyle ilişkili TransportDriver kayıtlarını sil
    await prisma.transportDriver.deleteMany({
      where: { driverId: parseInt(id) },
    });

    // Sonra sürücüyü sil
    const deletedDriver = await prisma.driver.delete({
      where: { id: parseInt(id) },
    });

    console.log("Silinen sürücü:", deletedDriver);
    return NextResponse.json({ message: "Driver deleted successfully" });
  } catch (error) {
    console.error("Driver deleted is not successful:", error);
    return NextResponse.json(
      { error: "Driver deleted is not successful", details: error.message },
      { status: 500 }
    );
  }
} 