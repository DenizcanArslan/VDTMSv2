import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    const deletedHoliday = await prisma.driverHoliday.delete({
      where: { 
        id: parseInt(id) 
      },
    });

    return NextResponse.json({ message: "Holiday deleted successfully" });
  } catch (error) {
    console.error("Error deleting holiday:", error);
    return NextResponse.json(
      { error: "Error deleting holiday" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();

    const updatedHoliday = await prisma.driverHoliday.update({
      where: { 
        id: parseInt(id) 
      },
      data: {
        startDate: new Date(data.startDate).toISOString(),
        endDate: new Date(data.endDate).toISOString(),
        reason: data.reason,
        notes: data.notes || null,
        driverId: parseInt(data.driverId),
      },
      include: {
        driver: true,
      },
    });

    return NextResponse.json(updatedHoliday);
  } catch (error) {
    console.error("Error updating holiday:", error);
    return NextResponse.json(
      { error: "Error updating holiday" },
      { status: 500 }
    );
  }
} 