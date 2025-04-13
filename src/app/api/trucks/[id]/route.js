import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();

    if (data.hasOwnProperty('isActive')) {
      const updatedTruck = await prisma.truck.update({
        where: { id: parseInt(id) },
        data: { isActive: data.isActive }
      });
      return NextResponse.json(updatedTruck);
    }

    const existingTruck = await prisma.truck.findFirst({
      where: {
        OR: [
          {
            licensePlate: data.licensePlate,
            NOT: {
              id: parseInt(id)
            }
          },
          {
            chasisNumber: data.chasisNumber,
            NOT: {
              id: parseInt(id)
            }
          },
          {
            nickName: data.nickName,
            NOT: {
              id: parseInt(id)
            }
          }
        ]
      }
    });

    if (existingTruck) {
      if (existingTruck.licensePlate === data.licensePlate) {
        return NextResponse.json(
          { error: "Bu plakaya sahip başka bir kamyon zaten mevcut!" },
          { status: 400 }
        );
      }
      if (existingTruck.chasisNumber === data.chasisNumber) {
        return NextResponse.json(
          { error: "Bu şasi numarasına sahip başka bir kamyon zaten mevcut!" },
          { status: 400 }
        );
      }
      if (existingTruck.nickName === data.nickName) {
        return NextResponse.json(
          { error: "Bu nickname'e sahip başka bir kamyon zaten mevcut!" },
          { status: 400 }
        );
      }
    }

    const formattedData = {
      ...data,
      modelYear: data.modelYear ? parseInt(data.modelYear) : null,
      chasisNumber: data.chasisNumber || null,
      nickName: data.nickName || null
    };

    const updatedTruck = await prisma.truck.update({
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

    return NextResponse.json(updatedTruck);
  } catch (error) {
    console.error("Error updating truck:", error);
    return NextResponse.json(
      { error: error.message || "Error updating truck" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    const deletedTruck = await prisma.truck.delete({
      where: { 
        id: parseInt(id) 
      },
    });

    return NextResponse.json({ message: "Truck deleted successfully" });
  } catch (error) {
    console.error("Error deleting truck:", error);
    return NextResponse.json(
      { error: "Error deleting truck", details: error.message },
      { status: 500 }
    );
  }
} 