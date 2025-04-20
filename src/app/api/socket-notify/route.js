import { NextResponse } from 'next/server';
import { getSocketServerUrl } from '@/lib/websocket';

/**
 * Socket.IO bildirim API endpoint'i
 * @param {Request} req 
 * @returns {NextResponse}
 * 
 * Not: Bu endpoint'i çağırdığınızda, istemcilere otomatik olarak Socket.IO bildirimi gönderilecektir.
 * Bildirimi alan istemciler transport ve slot güncellemelerini Redux'ta işleyecek ve arayüzlerini güncelleyecektir.
 * Gerekli durumlarda Redux'taki planningSlice/fetchPlanningData action'ı da çağrılarak tüm planlama verileri yenilenecektir.
 */
export async function POST(req) {
  try {
    // Socket.IO sunucusunun URL'si
    const socketServerUrl = getSocketServerUrl();
    const body = await req.json();
    
    if (!body.event || !body.data) {
      return NextResponse.json(
        { error: 'Event ve data alanları zorunludur' },
        { status: 400 }
      );
    }
    
    // Socket.IO sunucusuna bildirim gönder
    const response = await fetch(socketServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event: body.event,
        data: body.data,
      }),
    });
    
    if (!response.ok) {
      throw new Error(`Socket.IO bildirim gönderme hatası: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('Socket.IO bildirim hatası:', error);
    return NextResponse.json(
      { error: `Socket.IO bildirim hatası: ${error.message}` },
      { status: 500 }
    );
  }
} 