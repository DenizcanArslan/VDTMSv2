import prisma from '@/lib/prisma';
import { NextResponse } from 'next/server';
import { sendSocketNotification } from '@/lib/websocket';

// Transport cancel endpoint
export async function PUT(request, { params }) {
  try {
    const { id } = params;
    // 1. Transport'u güncelle
    const updatedTransport = await prisma.transport.update({
      where: { id: parseInt(id) },
      data: {
        status: 'CANCELLED',
        currentStatus: 'PLANNED',
        sentToDriver: false,
        trailerId: null,
      },
      include: {
        client: true,
        pickUpQuay: true,
        dropOffQuay: true,
        destinations: { include: { frequentLocation: true } },
        slotAssignments: true,
        truck: true,
        trailer: true,
        notes: true
      }
    });

    // 2. Tüm slotAssignments'larda slotId'yi null yap
    await prisma.TransportSlot.updateMany({
      where: { transportId: parseInt(id) },
      data: { slotId: null }
    });

    // 3. (Opsiyonel) Transport'u tekrar fetch et, güncel haliyle dön
    const refreshedTransport = await prisma.transport.findUnique({
      where: { id: parseInt(id) },
      include: {
        client: true,
        pickUpQuay: true,
        dropOffQuay: true,
        destinations: { include: { frequentLocation: true } },
        slotAssignments: true,
        truck: true,
        trailer: true,
        notes: true
      }
    });

    // 4. Socket.IO bildirimi gönder
    await sendSocketNotification('transport:cancelled', refreshedTransport);

    return NextResponse.json(refreshedTransport);
  } catch (error) {
    console.error('Error cancelling transport:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to cancel transport' },
      { status: 500 }
    );
  }
} 