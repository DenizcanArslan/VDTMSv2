import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { startOfDay, endOfDay } from 'date-fns';

export async function POST(request) {
  try {
    const { date, totalSlots } = await request.json();
    
    if (!date || !totalSlots || isNaN(totalSlots) || totalSlots < 0 || totalSlots > 50) {
      return NextResponse.json(
        { error: 'Invalid date or totalSlots value' },
        { status: 400 }
      );
    }
    
    // Convert date to UTC
    const localDate = new Date(date);
    const utcDate = new Date(localDate.getTime() - (localDate.getTimezoneOffset() * 60000));
    
    // Get all slots for this date
    const existingSlots = await prisma.planningSlot.findMany({
      where: {
        date: {
          gte: startOfDay(utcDate),
          lt: endOfDay(utcDate)
        }
      },
      include: {
        transports: true
      },
      orderBy: {
        order: 'asc'
      }
    });
    
    const currentSlotCount = existingSlots.length;
    console.log(`Current slot count: ${currentSlotCount}, Requested total: ${totalSlots}`);
    
    // If we need to reduce slots
    if (currentSlotCount > totalSlots) {
      // Get slots to remove, starting from the highest order
      const slotsToRemove = existingSlots
        .sort((a, b) => b.order - a.order) // Sort in reverse (start from the end)
        .slice(0, currentSlotCount - totalSlots);
      
      console.log(`Will remove ${slotsToRemove.length} slots`);
      
      // For each slot to be removed
      for (const slot of slotsToRemove) {
        try {
          // First, handle any transports in the slot by unassigning them
          if (slot.transports && slot.transports.length > 0) {
            console.log(`Slot ${slot.id} has ${slot.transports.length} transports to unassign`);
            
            // Delete all transport assignments for this slot using the connection table name from your schema
            // Look at the names from the transports object in your slot
            for (const transport of slot.transports) {
              await prisma.transportToSlot.delete({
                where: {
                  id: transport.id
                }
              });
              console.log(`Unassigned transport connection with ID: ${transport.id}`);
            }
          }
          
          // Now delete the slot itself
          await prisma.planningSlot.delete({
            where: { id: slot.id }
          });
          
          console.log(`Deleted slot ${slot.id}`);
        } catch (error) {
          console.error(`Error processing slot ${slot.id}:`, error);
          // If we can't delete transport connections properly, let's manually nullify them 
          // to avoid foreign key constraints
          if (slot.transports && slot.transports.length > 0) {
            console.log(`Trying alternative approach to unassign transports from slot ${slot.id}`);
            
            // Try to update the transports to remove their slot assignments
            for (const transport of slot.transports) {
              try {
                // Just delete the slot manually, as a last resort
                await prisma.$executeRaw`DELETE FROM "TransportToSlot" WHERE "slotId" = ${slot.id}`;
                console.log(`Raw SQL: Removed transport connections for slot ${slot.id}`);
                break; // If this worked, break out of the loop
              } catch (innerError) {
                console.error(`Failed raw SQL for slot ${slot.id}:`, innerError);
              }
            }
            
            // Try to delete the slot again
            try {
              await prisma.planningSlot.delete({
                where: { id: slot.id }
              });
              console.log(`Deleted slot ${slot.id} after alternative approach`);
            } catch (slotDeleteError) {
              console.error(`Still cannot delete slot ${slot.id}:`, slotDeleteError);
            }
          }
        }
      }
    } 
    // If we need to add more slots
    else if (currentSlotCount < totalSlots) {
      const slotsToAdd = totalSlots - currentSlotCount;
      
      let startSlotNumber = currentSlotCount > 0 
        ? existingSlots[existingSlots.length - 1].slotNumber + 1 
        : 1;
      
      let startOrder = currentSlotCount > 0 
        ? existingSlots[existingSlots.length - 1].order + 1 
        : 0;
      
      // Add new slots
      const createdSlots = [];
      
      for (let i = 0; i < slotsToAdd; i++) {
        const newSlot = await prisma.planningSlot.create({
          data: {
            date: utcDate,
            slotNumber: startSlotNumber + i,
            order: startOrder + i,
            isActive: true
          }
        });
        
        createdSlots.push(newSlot);
      }
      
      console.log(`Added ${createdSlots.length} new slots`);
    }
    
    // Get updated slots
    const updatedSlots = await prisma.planningSlot.findMany({
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
      success: true,
      message: `Total slots set to ${totalSlots}`,
      previousCount: currentSlotCount,
      currentCount: updatedSlots.length,
      slots: updatedSlots
    });
    
  } catch (error) {
    console.error('Error setting total slots:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to set total slots' },
      { status: 500 }
    );
  }
} 