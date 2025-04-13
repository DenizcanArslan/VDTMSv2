// Script to reset Transport and related tables

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function resetTransportTables() {
  try {
    console.log('Deleting records from TransportNote...');
    await prisma.transportNote.deleteMany({});
    
    console.log('Deleting records from CutInfo...');
    await prisma.cutInfo.deleteMany({});
    
    console.log('Deleting records from TransportSlot...');
    await prisma.transportSlot.deleteMany({});
    
    console.log('Deleting records from TransportDestination...');
    await prisma.transportDestination.deleteMany({});
    
    console.log('Deleting records from Transport...');
    await prisma.transport.deleteMany({});
    
    console.log('All transport and related tables have been reset!');
    
    // Verify counts
    const transportCount = await prisma.transport.count();
    const transportNoteCount = await prisma.transportNote.count();
    const cutInfoCount = await prisma.cutInfo.count();
    const transportSlotCount = await prisma.transportSlot.count();
    const transportDestinationCount = await prisma.transportDestination.count();
    
    console.log('Verification:');
    console.log(`- Transport: ${transportCount} records`);
    console.log(`- TransportNote: ${transportNoteCount} records`);
    console.log(`- CutInfo: ${cutInfoCount} records`);
    console.log(`- TransportSlot: ${transportSlotCount} records`);
    console.log(`- TransportDestination: ${transportDestinationCount} records`);
    
  } catch (error) {
    console.error('Error during table reset:', error);
  } finally {
    await prisma.$disconnect();
  }
}

resetTransportTables(); 