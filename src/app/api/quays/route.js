import prisma from "@/lib/prisma";
import { quaySchema } from "@/lib/validations/quay";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function POST(req) {
  try {
    const body = await req.json();
    console.log('Received body:', body);
    console.log('quayNumber type:', typeof body.quayNumber);
    
    // Validate request body
    const validatedData = quaySchema.parse(body);
    console.log('Validated data:', validatedData);
    
    const quay = await prisma.quay.create({
      data: {
        name: validatedData.name,
        quayNumber: validatedData.quayNumber ? parseInt(validatedData.quayNumber) : null,
        isLoRo: validatedData.isLoRo,
        address: validatedData.address || null,
        terminalFee: validatedData.terminalFee ? parseFloat(validatedData.terminalFee) : null,
        workingHoursStart: validatedData.workingHoursStart || null,
        workingHoursEnd: validatedData.workingHoursEnd || null,
        defaultTar: validatedData.defaultTar || null,
        tarType: validatedData.tarType || "NONE",
        tarPositiveColor: validatedData.tarPositiveColor || "GREEN",
        tarNegativeColor: validatedData.tarNegativeColor || "RED",
      },
    });

    return NextResponse.json(quay);
  } catch (error) {
    console.error("Error creating quay:", error);
    
    if (error.name === "ZodError") {
      console.log('Zod validation errors:', error.errors);
      return NextResponse.json(
        { error: error.errors[0].message },
        { status: 400 }
      );
    }

    // Prisma hatalarını kontrol et
    if (error.code === "P2009") {
      return NextResponse.json(
        { error: "Lo/Ro selection is required" },
        { status: 400 }
      );
    }

    // Diğer hatalar için
    return NextResponse.json(
      { error: error.message || "Failed to create quay" },
      { status: 400 }
    );
  }
}

export async function GET() {
  try {
    const quays = await prisma.quay.findMany();
    return NextResponse.json(quays);
  } catch (error) {
    console.error("Error fetching quays:", error);
    return NextResponse.json(
      { error: "Error fetching quays" },
      { status: 500 }
    );
  }
} 