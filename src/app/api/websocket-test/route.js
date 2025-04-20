import { NextResponse } from 'next/server';
import { getSocketServerUrl } from '@/lib/websocket';

/**
 * Socket.IO bağlantı testi için API endpoint
 * Bu endpoint, Socket.IO sunucusuna çeşitli URL'ler üzerinden bağlantı denemesi yapar ve sonuçları döndürür
 */
export async function GET(req) {
  const results = {
    tests: [],
    timestamp: new Date().toISOString(),
    success: false
  };
  
  // Test edilecek URL'ler
  const urls = [
    getSocketServerUrl(),
    'http://localhost:3001/api/notify',
    'http://transport-websocket:3001/api/notify',
    'http://host.docker.internal:3001/api/notify',
    'http://127.0.0.1:3001/api/notify'
  ];
  
  // Tüm URL'leri test et
  for (const url of urls) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const testData = {
        event: 'test:ping',
        data: {
          ping: true,
          timestamp: Date.now()
        }
      };
      
      console.log(`Socket.IO testi: ${url} adresine istek gönderiliyor...`);
      
      const startTime = Date.now();
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(testData),
        signal: controller.signal
      });
      const endTime = Date.now();
      
      clearTimeout(timeoutId);
      
      const responseData = await response.json();
      
      results.tests.push({
        url,
        success: response.ok,
        status: response.status,
        statusText: response.statusText,
        responseTime: endTime - startTime,
        response: responseData
      });
      
      if (response.ok) {
        console.log(`Socket.IO testi başarılı: ${url}`);
        results.success = true;
      }
    } catch (error) {
      results.tests.push({
        url,
        success: false,
        error: error.name === 'AbortError' ? 'Timeout' : error.message
      });
      
      console.error(`Socket.IO test hatası (${url}):`, error.message);
    }
  }
  
  // Sonuçları döndür
  return NextResponse.json(results);
} 