import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";

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

// POST /api/transport-notes - Yeni not ekleme
export async function POST(req) {
  try {
    const body = await req.json();
    const { transportId, content, color } = body;

    const note = await prisma.transportNote.create({
      data: {
        transportId: parseInt(transportId),
        content,
        color,
      },
    });

    // Transport bilgilerini al - tüm ilişkili verileri de içerecek şekilde
    const transport = await prisma.transport.findUnique({
      where: { id: parseInt(transportId) },
      include: {
        notes: {
          orderBy: {
            createdAt: 'desc',
          }
        },
        client: true,
        pickUpQuay: true,
        dropOffQuay: true,
        destinations: {
          include: {
            frequentLocation: true
          },
          orderBy: {
            order: 'asc'
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
    await sendWebSocketNotification('transport:update', transport);
    console.log("Note added notification sent via WebSocket with full transport data");

    return NextResponse.json(note);
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { error: "Failed to create note" },
      { status: 500 }
    );
  }
}

export async function GET(req) {
  const transportId = req.nextUrl.searchParams.get('transportId');
  try {
    const notes = await prisma.transportNote.findMany({
      where: {
        transportId: parseInt(transportId),
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    return NextResponse.json(notes);
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch notes" },
      { status: 500 }
    );
  }
}

export async function DELETE(req) {
  const noteId = req.nextUrl.searchParams.get('id');
  try {
    // Silinecek notun transport ID'sini alabilmek için önce notu bulalım
    const note = await prisma.transportNote.findUnique({
      where: { id: noteId }
    });

    if (!note) {
      return NextResponse.json(
        { error: "Note not found" },
        { status: 404 }
      );
    }

    const transportId = note.transportId;

    // Notu sil
    await prisma.transportNote.delete({
      where: {
        id: noteId,
      },
    });

    // Transport bilgilerini al (not silindikten sonra) - tüm ilişkili verileri içerecek şekilde
    const transport = await prisma.transport.findUnique({
      where: { id: transportId },
      include: {
        notes: {
          orderBy: {
            createdAt: 'desc',
          }
        },
        client: true,
        pickUpQuay: true,
        dropOffQuay: true,
        destinations: {
          include: {
            frequentLocation: true
          },
          orderBy: {
            order: 'asc'
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
    await sendWebSocketNotification('transport:update', transport);
    console.log("Note deleted notification sent via WebSocket with full transport data");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
} 