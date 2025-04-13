import prisma from "@/lib/prisma";
import { NextResponse } from "next/server";
import { startOfDay, endOfDay, parseISO } from 'date-fns';

export async function POST(request) {
  try {
    const body = await request.json();
    const { date, count = 1 } = body;
    
    // count değeri kontrolü, 1 ile 20 arasında olmalı
    const slotCount = Math.min(Math.max(1, count), 20);
    
    // Tarihi UTC'ye çevir ve timezone offset'ini hesaba kat
    const localDate = new Date(date);
    const utcDate = new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000));
    console.log(`Creating ${slotCount} slot(s) for UTC date:`, utcDate);

    // O tarihteki son slot'u bul
    const lastSlot = await prisma.planningSlot.findFirst({
      where: {
        date: {
          gte: startOfDay(utcDate),
          lt: endOfDay(utcDate)
        }
      },
      orderBy: {
        slotNumber: 'desc'
      }
    });

    let startSlotNumber = lastSlot ? lastSlot.slotNumber + 1 : 1;
    let startOrder = lastSlot ? lastSlot.order + 1 : 0;
    
    const createdSlots = [];
    
    // Birden fazla slot ekleyebilme desteği
    for (let i = 0; i < slotCount; i++) {
      const newSlot = await prisma.planningSlot.create({
        data: {
          date: utcDate,
          slotNumber: startSlotNumber + i,
          order: startOrder + i,
          isActive: true
        },
        include: {
          transports: {
            include: {
              transport: {
                include: {
                  client: true,
                  pickUpQuay: true,
                  dropOffQuay: true,
                  destinations: {
                    include: {
                      frequentLocation: true
                    }
                  },
                  slotAssignments: {
                    include: {
                      slot: true
                    }
                  }
                }
              }
            }
          }
        }
      });
      
      createdSlots.push(newSlot);
    }

    // Tüm slot'ları getir
    const allSlots = await prisma.planningSlot.findMany({
      where: {
        date: {
          gte: startOfDay(utcDate),
          lt: endOfDay(utcDate)
        }
      },
      include: {
        transports: {
          include: {
            transport: {
              include: {
                client: true,
                pickUpQuay: true,
                dropOffQuay: true,
                destinations: {
                  include: {
                    frequentLocation: true
                  }
                },
                slotAssignments: {
                  include: {
                    slot: true
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
    });

    return NextResponse.json({ 
      newSlots: createdSlots, 
      slots: allSlots,
      count: createdSlots.length
    });
  } catch (error) {
    console.error('Error creating slot:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to create slot' },
      { status: 500 }
    );
  }
}

export async function DELETE(request) {
  try {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');
    
    if (!date) {
      return NextResponse.json(
        { error: 'Date is required' },
        { status: 400 }
      );
    }

    // Tarihi UTC'ye çevir ve tam gece yarısı (00:00) formatında kaydet
    const localDate = new Date(date);
    const utcDate = new Date(Date.UTC(
      localDate.getFullYear(),
      localDate.getMonth(),
      localDate.getDate(),
      0, 0, 0, 0
    ));
    console.log('Deleting slot for UTC date:', utcDate);

    // Transaction içinde işlemleri yap
    const result = await prisma.$transaction(async (tx) => {
      // En son slot'u bul
      const lastSlot = await tx.planningSlot.findFirst({
        where: { 
          date: {
            gte: utcDate,
            lt: new Date(utcDate.getTime() + 24 * 60 * 60 * 1000),
          },
          isActive: true 
        },
        include: {
          transports: true
        },
        orderBy: { order: 'desc' },
      });

      if (!lastSlot) {
        throw new Error('No slots found for this date');
      }

      // Önce transport'ları unassign et
      if (lastSlot.transports.length > 0) {
        await tx.transport.updateMany({
          where: {
            id: {
              in: lastSlot.transports.map(t => t.id)
            }
          },
          data: {
            slotId: null,
            slotOrder: null
          }
        });
      }

      // Sonra slot'u sil
      const deletedSlot = await tx.planningSlot.delete({
        where: { id: lastSlot.id },
      });

      return {
        success: true,
        slot: deletedSlot,
        unassignedTransports: lastSlot.transports
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Error removing slot:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to remove slot' },
      { status: error.message === 'No slots found for this date' ? 404 : 500 }
    );
  }
} 