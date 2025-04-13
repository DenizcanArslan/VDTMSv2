import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    const deletedInspection = await prisma.vehicleInspection.delete({
      where: { 
        id: parseInt(id) 
      },
    });

    return NextResponse.json({ message: "Inspection deleted successfully" });
  } catch (error) {
    console.error("Error deleting inspection:", error);
    return NextResponse.json(
      { error: "Error deleting inspection" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();

    const updatedInspection = await prisma.vehicleInspection.update({
      where: { 
        id: parseInt(id) 
      },
      data: {
        inspectionDate: new Date(data.inspectionDate).toISOString(),
        notes: data.notes || null,
        cost: data.cost,
        ...(data.vehicleType === "truck" 
          ? { 
              truckId: parseInt(data.vehicleId),
              trailerId: null 
            }
          : { 
              trailerId: parseInt(data.vehicleId),
              truckId: null 
            }
        ),
      },
    });

    return NextResponse.json(updatedInspection);
  } catch (error) {
    console.error("Error updating inspection:", error);
    return NextResponse.json(
      { error: "Error updating inspection" },
      { status: 500 }
    );
  }
} 