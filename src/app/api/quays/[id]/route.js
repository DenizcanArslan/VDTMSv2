import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";

export const dynamic = 'force-dynamic';
export const revalidate = 0;

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const data = await request.json();
    
    // Status değişikliği mi kontrol et
    if (data.hasOwnProperty('isActive')) {
      const updatedQuay = await prisma.quay.update({
        where: { id: parseInt(id) },
        data: { isActive: data.isActive }
      });
      return NextResponse.json(updatedQuay);
    }

    // İsmi büyük harfe çevir
    const formattedName = data.name.charAt(0).toUpperCase() + data.name.slice(1);

    // Aynı isimde ve farklı ID'ye sahip quay var mı kontrol et
    const existingQuay = await prisma.quay.findFirst({
      where: {
        AND: [
          { name: { equals: formattedName, mode: 'insensitive' } },
          { id: { not: parseInt(id) } }
        ]
      }
    });

    if (existingQuay) {
      return NextResponse.json(
        { error: "A quay with this name already exists" },
        { status: 400 }
      );
    }

    const updatedQuay = await prisma.quay.update({
      where: { id: parseInt(id) },
      data: {
        name: formattedName,
        quayNumber: data.quayNumber ? parseInt(data.quayNumber) : null,
        isLoRo: data.isLoRo || null,
        address: data.address || null,
        terminalFee: data.terminalFee || null,
        workingHoursStart: data.workingHoursStart || null,
        workingHoursEnd: data.workingHoursEnd || null,
        defaultTar: data.defaultTar || null,
        tarType: data.tarType || "NONE",
        tarPositiveColor: data.tarPositiveColor || "GREEN",
        tarNegativeColor: data.tarNegativeColor || "RED",
      },
    });

    return NextResponse.json(updatedQuay);
  } catch (error) {
    console.error("Error updating quay:", error);
    return NextResponse.json(
      { error: error.message || "Error updating quay" },
      { status: 500 }
    );
  }
}

export async function DELETE(request, { params }) {
  try {
    const { id } = params;

    const deletedQuay = await prisma.quay.delete({
      where: { id: parseInt(id) },
    });

    return NextResponse.json({ message: "Quay deleted successfully" });
  } catch (error) {
    console.error("Error deleting quay:", error);
    return NextResponse.json(
      { error: "Error deleting quay" },
      { status: 500 }
    );
  }
}

export async function GET(request, { params }) {
  try {
    const { id } = params;
    const quay = await prisma.quay.findUnique({
      where: { id: parseInt(id) }
    });

    if (!quay) {
      return NextResponse.json(
        { error: "Quay not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(quay);
  } catch (error) {
    console.error("Error fetching quay:", error);
    return NextResponse.json(
      { error: "Error fetching quay" },
      { status: 500 }
    );
  }
} 