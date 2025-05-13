import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { format } from 'date-fns';

export async function GET(request) {
  try {
    // Vercel'de ve diğer ortamlarda önbelleklemeyi engelle
    const headers = {
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    };

    const [transports, cutTransports, slots, drivers, trucks, trailers, clients, quays] = await Promise.all([
      prisma.transport.findMany({
        where: {
          isCut: false, // Regular transports
          isDeleted: false,
          // Diğer where koşulları...
        },
        include: {
          client: true,
          pickUpQuay: true,
          dropOffQuay: true,
          truck: {
            select: {
              id: true,
              nickName: true,
              licensePlate: true
            }
          },
          destinations: {
            include: {
              frequentLocation: true
              
            },
            orderBy: {
              order: "asc"
            }
          },
          trailer: true,
          slotAssignments: {
            include: {
              slot: true
            }

          }
        },
        orderBy: {
          id: 'desc'
        }
      }),
      // Cut transports that are not restored or deleted
      prisma.transport.findMany({
        where: {
          isCut: true,
          isRestored: false,
          isDeleted: false,
        },
        include: {
          client: true,
          cutInfo: true,
          trailer: true
        },
      }),
      prisma.planningSlot.findMany({
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
          },
          transports: {
            include: {
              transport: {
                include: {
                  client: true,
                  pickUpQuay: true,
                  dropOffQuay: true,
                  trailer: true,
                  destinations: {
                    include: {
                      frequentLocation: true
                    }
                  }
                }
              }
            }
          }
        },
        orderBy: {
          order: 'asc'
        }
      }),
      prisma.driver.findMany({ where: { isActive: true } }),
      prisma.truck.findMany({ where: { isActive: true } }),
      prisma.trailer.findMany({ where: { isActive: true } }),
      prisma.client.findMany({ where: { isActive: true } }),
      prisma.quay.findMany({ where: { isActive: true } }),
    ]);

    // Cache-Control header'larını ekleyerek önbelleklemeyi devre dışı bırak
    return NextResponse.json(
      {
        transports: [...transports, ...cutTransports], // Combine regular and cut transports
        slots,
        drivers,
        trucks,
        trailers,
        clients,
        quays,
      },
      { headers }
    );
  } catch (error) {
    console.error('Error fetching planning data:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
} 