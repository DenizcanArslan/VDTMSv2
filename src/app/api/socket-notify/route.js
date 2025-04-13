import { NextResponse } from 'next/server';
import { getWebSocketServerUrl } from '@/lib/websocket';

/**
 * WebSocket bildirim API endpoint'i
 * @param {Request} req 
 * @returns {NextResponse}
 * 
 * Not: Bu endpoint'i çağırdığınızda, istemcilere otomatik olarak WebSocket bildirimi gönderilecektir.
 * Bildirimi alan istemciler transport ve slot güncellemelerini Redux'ta işleyecek ve arayüzlerini güncelleyecektir.
 * Gerekli durumlarda Redux'taki planningSlice/fetchPlanningData action'ı da çağrılarak tüm planlama verileri yenilenecektir.
 */
export async function POST(req) {
  try {
    // WebSocket sunucusunun URL'si
    const socketServerUrl = getWebSocketServerUrl();
    const body = await req.json();
    
    if (!body.event || !body.data) {
      return NextResponse.json(
        { error: 'Event ve data alanları zorunludur' },
        { status: 400 }
      );
    }
    
    // WebSocket sunucusuna bildirim gönder
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
      throw new Error(`WebSocket bildirim gönderme hatası: ${response.statusText}`);
    }
    
    const data = await response.json();
    
    return NextResponse.json(data);
  } catch (error) {
    console.error('WebSocket bildirim hatası:', error);
    return NextResponse.json(
      { error: `WebSocket bildirim hatası: ${error.message}` },
      { status: 500 }
    );
  }
} 