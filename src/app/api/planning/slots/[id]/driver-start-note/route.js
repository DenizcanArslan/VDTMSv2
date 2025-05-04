import prisma from '@/lib/prisma';
import { sendSocketNotification } from '@/lib/websocket';

export async function PUT(request, { params }) {
  try {
    // Parse the request body
    const body = await request.json();
    const { driverStartNote, date } = body;
    const slotId = parseInt(params.id, 10);
    
    if (isNaN(slotId)) {
      console.error(`Invalid slot ID: ${params.id}`);
      return Response.json({ error: 'Invalid slot ID' }, { status: 400 });
    }

    if (!date) {
      console.error('Missing date in request body');
      return Response.json({ error: 'Missing date' }, { status: 400 });
    }

    console.log(`Updating driver start note for slot ${slotId} to "${driverStartNote}" for date ${date}`);

    // Update the slot
    const updatedSlot = await prisma.planningSlot.update({
      where: {
        id: slotId,
      },
      data: {
        driverStartNote: driverStartNote,
      },
      include: {
        transports: {
          include: {
            transport: true,
          },
        },
      },
    });

    // Send socket notification to update other clients
    try {
      // Doğru format için kesinlikle şu alanları içermeli:
      const socketData = {
        slotId: slotId,
        id: slotId, // Geriye uyumluluk için hem id hem slotId gönder
        driverStartNote: driverStartNote,
        date: date,
        updateType: 'driver-start-note'
      };

      console.log('Sending socket notification with data:', socketData);
      
      // Socket olayını gönder
      await sendSocketNotification('planning:slot:updated', socketData);
      console.log('Socket notification sent successfully');
    } catch (socketError) {
      console.error('Error sending socket notification:', socketError);
      // Socket hatası durumunda işleme devam et ama hatayı logla
    }

    return Response.json(updatedSlot);
  } catch (error) {
    console.error('Error updating driver start note:', error);
    return Response.json({ error: 'Failed to update driver start note' }, { status: 500 });
  }
} 