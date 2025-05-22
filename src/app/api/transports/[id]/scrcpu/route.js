import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

// Socket.IO bildirim fonksiyonu
const sendSocketNotification = async (event, data) => {
  try {
    const socketServerUrl = process.env.SOCKET_SERVER_URL || 'http://127.0.0.1:3001/api/notify';
    
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
    
    console.log(`Socket.IO bildirimi gönderildi: ${event}`);
  } catch (error) {
    console.error('Socket.IO bildirim hatası:', error);
  }
};

export async function PUT(request, { params }) {
  try {
    const { id } = params;
    const { status, color, scrCpuNote } = await request.json();

    const updatedTransport = await prisma.transport.update({
      where: { id: parseInt(id) },
      data: {
        scrCpuStatus: status,
        scrCpuColor: color,
        scrCpuNote: scrCpuNote,
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

    // Socket.IO bildirimi gönder
    await sendSocketNotification('transport:update', updatedTransport);
    console.log("SCR/CPU status update notification sent via Socket.IO");

    return NextResponse.json(updatedTransport);
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to update SCR/CPU status" },
      { status: 500 }
    );
  }
} 