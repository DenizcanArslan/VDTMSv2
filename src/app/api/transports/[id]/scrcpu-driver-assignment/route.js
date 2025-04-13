import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getWebSocketServerUrl } from '@/lib/websocket';

// WebSocket bildirim fonksiyonu
const sendWebSocketNotification = async (event, data) => {
  try {
    const socketServerUrl = process.env.WEBSOCKET_SERVER_URL || 'http://127.0.0.1:3001/api/notify';
    
    const response = await fetch(socketServerUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ event, data }),
      signal: AbortSignal.timeout(5000), // 5 saniye timeout
    });
    
    if (response.ok) {
      console.log(`WebSocket bildirimi gönderildi: ${event}`);
    } else {
      throw new Error(`Failed with status: ${response.status}`);
    }
  } catch (error) {
    console.error('WebSocket bildirim hatası:', error);
    // Hata durumunda API yanıtını engelleme, sadece log
  }
};

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { scrCpuAssignedToDriver } = await request.json();

    const updatedTransport = await prisma.transport.update({
      where: { id: parseInt(id) },
      data: {
        scrCpuAssignedToDriver,
      },
      include: {
        client: true,
        destinations: {
          include: {
            frequentLocation: true
          }
        },
        pickUpQuay: true,
        dropOffQuay: true,
        truck: true,
        trailer: true,
        slotAssignments: {
          include: {
            slot: true
          }
        }
      }
    });

    // WebSocket bildirimi gönder
    await sendWebSocketNotification('transport:update', updatedTransport);
    console.log("SCR/CPU driver assignment notification sent via WebSocket");

    return NextResponse.json(updatedTransport);
  } catch (error) {
    console.error("SCR/CPU driver assignment error:", error);
    return NextResponse.json(
      { error: "SCR/CPU driver assignment failed" },
      { status: 500 }
    );
  }
} 