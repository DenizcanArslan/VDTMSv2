import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();

    if (data.hasOwnProperty('isActive')) {
      const updatedTrailer = await prisma.trailer.update({
        where: { id: parseInt(id) },
        data: { isActive: data.isActive }
      });
      return NextResponse.json(updatedTrailer);
    }

    const formattedData = {
      ...data,
      modelYear: data.modelYear ? parseInt(data.modelYear) : null,
      chasisNumber: data.chasisNumber || null
    };

    const existingTrailer = await prisma.trailer.findFirst({
      where: {
        AND: [
          {
            OR: [
              { licensePlate: { equals: formattedData.licensePlate, mode: 'insensitive' } },
              { chasisNumber: formattedData.chasisNumber ? 
                { equals: formattedData.chasisNumber, mode: 'insensitive' } : undefined },
              { nickName: { equals: formattedData.nickName, mode: 'insensitive' } }
            ]
          },
          { id: { not: parseInt(id) } }
        ]
      }
    });

    if (existingTrailer) {
      if (existingTrailer.licensePlate.toLowerCase() === formattedData.licensePlate.toLowerCase()) {
        return NextResponse.json(
          { error: "A trailer with this license plate already exists" },
          { status: 400 }
        );
      }
      if (existingTrailer.chasisNumber?.toLowerCase() === formattedData.chasisNumber?.toLowerCase()) {
        return NextResponse.json(
          { error: "A trailer with this chasis number already exists" },
          { status: 400 }
        );
      }
      if (existingTrailer.nickName.toLowerCase() === formattedData.nickName.toLowerCase()) {
        return NextResponse.json(
          { error: "A trailer with this nickname already exists" },
          { status: 400 }
        );
      }
    }

    const updatedTrailer = await prisma.trailer.update({
      where: { 
        id: parseInt(id) 
      },
      data: {
        ...formattedData,
        insuranceExpireDate: formattedData.insuranceExpireDate 
          ? new Date(formattedData.insuranceExpireDate).toISOString() 
          : null,
      },
    });

    return NextResponse.json(updatedTrailer);
  } catch (error) {
    console.error("Error updating trailer:", error);
    return NextResponse.json(
      { error: error.message || "Error updating trailer" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    const deletedTrailer = await prisma.trailer.delete({
      where: { 
        id: parseInt(id) 
      },
    });

    return NextResponse.json({ message: "Trailer deleted successfully" });
  } catch (error) {
    console.error("Error deleting trailer:", error);
    return NextResponse.json(
      { error: "Error deleting trailer", details: error.message },
      { status: 500 }
    );
  }
} 