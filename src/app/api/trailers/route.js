import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { TransportCurrentStatus } from '@prisma/client';
import { Prisma } from '@prisma/client';

export async function POST(request) {
  try {
    const data = await request.json();
    
    // Eğer chasisNumber boş string ise null'a çevir
    const formattedData = {
      ...data,
      modelYear: data.modelYear ? parseInt(data.modelYear) : null,
      chasisNumber: data.chasisNumber || null,  // Boş string'i null'a çevir
      model: data.model || null,  // Explicitly handle empty model
      // insuranceExpireDate'i işle
      insuranceExpireDate: data.insuranceExpireDate ? new Date(data.insuranceExpireDate) : null
    };

    const existingTrailer = await prisma.trailer.findFirst({
      where: {
        OR: [
          { licensePlate: { equals: data.licensePlate, mode: 'insensitive' } },
          data.chasisNumber ? { chasisNumber: { equals: data.chasisNumber, mode: 'insensitive' } } : {},
          { nickName: { equals: data.nickName, mode: 'insensitive' } }
        ]
      }
    });

    if (existingTrailer) {
      if (existingTrailer.licensePlate.toLowerCase() === data.licensePlate.toLowerCase()) {
        return NextResponse.json(
          { error: "A trailer with this license plate already exists" },
          { status: 400 }
        );
      }
      if (data.chasisNumber && existingTrailer.chasisNumber?.toLowerCase() === data.chasisNumber.toLowerCase()) {
        return NextResponse.json(
          { error: "A trailer with this chasis number already exists" },
          { status: 400 }
        );
      }
      if (existingTrailer.nickName.toLowerCase() === data.nickName.toLowerCase()) {
        return NextResponse.json(
          { error: "A trailer with this nickname already exists" },
          { status: 400 }
        );
      }
    }

    const newTrailer = await prisma.trailer.create({
      data: formattedData
    });

    return NextResponse.json(newTrailer);
  } catch (error) {
    console.error("Error creating trailer:", error);
    return NextResponse.json(
      { error: "Error creating trailer" },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const available = searchParams.get('available') === 'true';
  const includeParked = searchParams.get('includeParked') === 'true';

  try {
    const whereCondition = {
      isActive: true,
    };

    // If we want available trailers for assignment, add more conditions
    if (available && !includeParked) {
      whereCondition.OR = [
        {
          transports: {
            none: {
              currentStatus: {
                in: [TransportCurrentStatus.PLANNED, TransportCurrentStatus.ONGOING]
              }
            }
          }
        }
      ];
    }

    const trailers = await prisma.trailer.findMany({
      where: whereCondition,
      include: {
        transports: {
          where: {
            currentStatus: {
              in: [TransportCurrentStatus.PLANNED, TransportCurrentStatus.ONGOING]
            }
          },
          select: {
            id: true,
            currentStatus: true
          }
        },
        currentParking: {
          include: {
            location: true
          }
        }
      }
    });

    // Process the trailers to include their transport status
    const processedTrailers = trailers.map(trailer => {
      const hasOngoingTransport = trailer.transports.some(t => 
        t.currentStatus === TransportCurrentStatus.ONGOING
      );
      const hasPlannedTransport = trailer.transports.some(t => 
        t.currentStatus === TransportCurrentStatus.PLANNED
      );
      
      let transportStatus = null;
      if (hasOngoingTransport) {
        transportStatus = 'ONGOING';
      } else if (hasPlannedTransport) {
        transportStatus = 'PLANNED';
      }

      // Save parking info before removing transport details
      const parkingInfo = trailer.currentParking;
      
      // Remove private data
      delete trailer.transports;
      
      return {
        ...trailer,
        transportStatus,
        currentParking: parkingInfo
      };
    });

    // If we need available trailers, filter out those with ongoing transports
    if (available && !includeParked) {
      return NextResponse.json(processedTrailers.filter(
        trailer => trailer.transportStatus !== 'ONGOING'
      ));
    }
    
    return NextResponse.json(processedTrailers);
  } catch (error) {
    console.error('Error fetching trailers:', error);
    return NextResponse.json({ error: 'Failed to fetch trailers' }, { status: 500 });
  }
} 