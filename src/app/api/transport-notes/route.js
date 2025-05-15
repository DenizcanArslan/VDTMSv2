import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { sendSocketNotification } from "@/lib/websocket";

// POST /api/transport-notes - Yeni not ekleme
export async function POST(req) {
  try {
    const body = await req.json();
    const { transportId, content, color } = body;

    // Not oluştur
    const note = await prisma.transportNote.create({
      data: {
        transportId: parseInt(transportId),
        content,
        color,
      },
    });

    // Transport bilgilerini al - daha hafif veri için sadece gerekli ilişkileri içer
    const transport = await prisma.transport.findUnique({
      where: { id: parseInt(transportId) },
      include: {
        notes: {
          orderBy: {
            createdAt: 'desc',
          }
        }
      }
    });

    // Sadece Socket.IO için gerekli olan tam transport verisini getir
    try {
      await sendSocketNotification('transport:update', {
        id: transport.id,
        transportOrderNumber: transport.transportOrderNumber,
        notes: transport.notes,
        updateType: 'notes'
      });
      console.log(`Note added notification sent for transport ${transportId}. Note count: ${transport.notes.length}`);
    } catch (wsError) {
      console.error("Socket notification error:", wsError.message);
    }

    return NextResponse.json({
      ...note,
      _meta: {
        timestamp: new Date().toISOString(),
        transport_note_count: transport.notes.length
      }
    });
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
    // Not sayısını sınırla ve önbelleğe izin ver
    const notes = await prisma.transportNote.findMany({
      where: {
        transportId: parseInt(transportId),
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 50 // En fazla 50 not getir
    });

    return NextResponse.json(notes, {
      headers: {
        'Cache-Control': 'private, max-age=10' // 10 saniye önbelleğe izin ver
      }
    });
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

    // Note silindikten sonra transport'un güncel notlarını getir
    const updatedTransport = await prisma.transport.findUnique({
      where: { id: transportId },
      include: {
        notes: {
          orderBy: {
            createdAt: 'desc',
          }
        }
      }
    });

    // Sadece Socket.IO için gerekli olan hafif veriyi gönder
    try {
      await sendSocketNotification('transport:update', {
        id: updatedTransport.id,
        transportOrderNumber: updatedTransport.transportOrderNumber,
        notes: updatedTransport.notes,
        updateType: 'notes'
      });
      console.log(`Note deleted notification sent for transport ${transportId}. Remaining note count: ${updatedTransport.notes.length}`);
    } catch (wsError) {
      console.error("Socket notification error:", wsError.message);
    }

    return NextResponse.json({ 
      success: true,
      _meta: {
        timestamp: new Date().toISOString(),
        deleted_note_id: noteId,
        transport_id: transportId,
        remaining_note_count: updatedTransport.notes.length
      }
    });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { error: "Failed to delete note" },
      { status: 500 }
    );
  }
} 