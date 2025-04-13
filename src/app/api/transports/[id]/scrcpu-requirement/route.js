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
    const { requiresScrCpu } = await request.json();

    const updatedTransport = await prisma.transport.update({
      where: { id: parseInt(id) },
      data: {
        requiresScrCpu,
        // SCR/CPU gerekliliği kapatıldığında status ve rengi sıfırla
        ...(requiresScrCpu === false && {
          scrCpuStatus: null,
          scrCpuColor: null
        }),
        // SCR/CPU gerekliliği açıldığında varsayılan değerleri ayarla
        ...(requiresScrCpu === true && {
          scrCpuStatus: 'SCRCPUNOK',
          scrCpuColor: 'RED'
        })
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
    console.log("SCR/CPU requirement update notification sent via WebSocket");

    return NextResponse.json(updatedTransport);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update SCR/CPU requirement" },
      { status: 500 }
    );
  }
} 