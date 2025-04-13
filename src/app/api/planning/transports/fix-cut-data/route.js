import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

// POST /api/planning/transports/fix-cut-data
// Veritabanındaki cut transport verilerini düzeltir
export async function POST(request) {
  try {
    // Tüm transportları getir
    const allTransports = await prisma.transport.findMany({
      include: {
        cutInfo: true,
      },
    });

    const results = {
      fixed: 0,
      errors: [],
      details: [],
    };

    // Her bir transport için kontrol et ve düzelt
    for (const transport of allTransports) {
      try {
        // Transport'un cutInfo'su yoksa atla
        if (!transport.cutInfo) continue;

        // 1. Eğer transport restore edilmiş (isCut: false) ancak cutEndDate null ise, düzelt
        if (!transport.isCut && !transport.cutInfo.cutEndDate) {
          // Restore edilmiş transportlar için cutEndDate'i bugün olarak ayarla
          await prisma.cutInfo.update({
            where: { id: transport.cutInfo.id },
            data: {
              cutEndDate: new Date(),
            },
          });
          results.fixed++;
          results.details.push({
            transportId: transport.id,
            transportOrderNumber: transport.transportOrderNumber,
            issue: "Restored transport without cutEndDate",
            action: "Set cutEndDate to today",
          });
        }

        // 2. Eğer transport hala kesilmiş (isCut: true) ancak cutEndDate varsa, düzelt
        if (transport.isCut && transport.cutInfo.cutEndDate) {
          // Hala kesilmiş transportlar için cutEndDate'i null olarak ayarla
          await prisma.cutInfo.update({
            where: { id: transport.cutInfo.id },
            data: {
              cutEndDate: null,
            },
          });
          results.fixed++;
          results.details.push({
            transportId: transport.id,
            transportOrderNumber: transport.transportOrderNumber,
            issue: "Cut transport with cutEndDate",
            action: "Set cutEndDate to null",
          });
        }
      } catch (error) {
        results.errors.push({
          transportId: transport.id,
          error: error.message,
        });
      }
    }

    return NextResponse.json(results, { status: 200 });
  } catch (error) {
    console.error("Error fixing cut transport data:", error);
    return NextResponse.json(
      { error: "Failed to fix cut transport data", details: error.message },
      { status: 500 }
    );
  }
} 