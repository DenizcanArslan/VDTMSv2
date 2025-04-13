import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { startOfDay, endOfDay } from "date-fns";

export async function DELETE(request, { params }) {
  try {
    const { id } = params;
    const { date } = await request.json();

    // Önce slot'taki transport'ları unassign et
    await prisma.transportSlot.deleteMany({
      where: {
        slotId: parseInt(id),
        date: {
          gte: startOfDay(new Date(date)),
          lt: endOfDay(new Date(date))
        }
      }
    });

    // Sonra slot'u sil
    await prisma.planningSlot.delete({
      where: {
        id: parseInt(id)
      }
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting slot:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to delete slot' },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const slot = await prisma.planningSlot.findUnique({
      where: {
        id: parseInt(params.id)
      },
      include: {
        driver: {
          select: {
            id: true,
            nickName: true
          }
        },
        truck: {
          select: {
            id: true,
            nickName: true,
            licensePlate: true
          }
        }
      }
    });

    if (!slot) {
      return NextResponse.json(
        { error: 'Slot not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(slot);
  } catch (error) {
    console.error('Error fetching slot:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 