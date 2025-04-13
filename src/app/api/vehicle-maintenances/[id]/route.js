import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    
    const deletedMaintenance = await prisma.vehicleMaintenance.delete({
      where: { 
        id: parseInt(id) 
      },
    });

    return NextResponse.json({ message: "Maintenance deleted successfully" });
  } catch (error) {
    console.error("Error deleting maintenance:", error);
    return NextResponse.json(
      { error: "Error deleting maintenance" },
      { status: 500 }
    );
  }
}

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();

    const updatedMaintenance = await prisma.vehicleMaintenance.update({
      where: { 
        id: parseInt(id) 
      },
      data: {
        maintenanceDate: new Date(data.maintenanceDate).toISOString(),
        notes: data.notes || null,
        cost: data.cost,
        isGensetMaintenance: data.isGensetMaintenance || false,
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

    return NextResponse.json(updatedMaintenance);
  } catch (error) {
    console.error("Error updating maintenance:", error);
    return NextResponse.json(
      { error: "Error updating maintenance" },
      { status: 500 }
    );
  }
} 