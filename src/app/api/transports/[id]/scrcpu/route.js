import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// WebSocket bildirim fonksiyonu
const sendWebSocketNotification = async (event, data) => {
  try {
    const socketServerUrl = process.env.WEBSOCKET_SERVER_URL || 'http://127.0.0.1:3001/api/notify';
    
    await fetch(socketServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        data,
      }),
    });
    
    console.log(`WebSocket bildirimi gönderildi: ${event}`);
  } catch (error) {
    console.error('WebSocket bildirim hatası:', error);
  }
};

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { status, color } = await request.json();

    const updatedTransport = await prisma.transport.update({
      where: { id: parseInt(id) },
      data: {
        scrCpuStatus: status,
        scrCpuColor: color,
      },
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
        },
        truck: true,
        trailer: true
      }
    });

    // WebSocket bildirimi gönder
    await sendWebSocketNotification('transport:update', updatedTransport);
    console.log("SCR/CPU status update notification sent via WebSocket");

    return NextResponse.json(updatedTransport);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update SCR/CPU status" },
      { status: 500 }
    );
  }
} 