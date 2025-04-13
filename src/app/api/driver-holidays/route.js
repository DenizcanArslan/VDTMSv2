import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

// Önbelleği devre dışı bırak
export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(request) {
  try {
    const data = await request.json();
    console.log("Received data:", data);

    const newHoliday = await prisma.driverHoliday.create({
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

    return NextResponse.json(newHoliday, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error("Detailed API error:", error);
    return NextResponse.json(
      { error: error.message || "Error creating holiday" },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const holidays = await prisma.driverHoliday.findMany({
      include: {
        driver: true,
      },
      orderBy: {
        startDate: 'desc',
      },
    });
    return NextResponse.json(holidays, {
      headers: {
        'Cache-Control': 'no-store, max-age=0, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      }
    });
  } catch (error) {
    console.error("Error fetching holidays:", error);
    return NextResponse.json(
      { error: "Error fetching holidays" },
      { status: 500 }
    );
  }
} 