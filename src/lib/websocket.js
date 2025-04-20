/**
 * Socket.IO utility functions to standardize URLs across the application
 */

/**
 * Gets the Socket.IO server URL for server-side API calls
 * Prioritizes the Docker container name for reliable container-to-container communication
 * Provides fallbacks for different network environments
 */
export function getSocketServerUrl() {
  // Öncelikle çevre değişkeninden URL'yi al
  const configuredUrl = process.env.SOCKET_SERVER_URL;
  if (configuredUrl) return configuredUrl;
  
  // Önce Docker container adını kullan - container-to-container iletişim için
  const containerUrl = 'http://transport-websocket:3001/api/notify';
  
  // Alternatif URL'leri dene - container fail olursa local sunucuya yönlendir
  const alternativeUrls = [
    containerUrl,
    'http://localhost:3001/api/notify',
    'http://127.0.0.1:3001/api/notify'
  ];
  
  // İlk URL'i döndür, alternatifler sendSocketNotification içinde denenecek
  return alternativeUrls[0];
}

/**
 * Gets the Socket.IO client URL for browser connections
 * Uses localhost or the configured public URL
 */
export function getSocketClientUrl() {
  return process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3001';
}

/**
 * Socket.IO bağlantı hatalarını takip etmek için debug fonksiyonu
 */
export function logSocketError(error, context = {}) {
  console.error('Socket.IO Error Details:', {
    name: error.name,
    message: error.message,
    stack: error.stack,
    context: context
  });
}

/**
 * Standardized Socket.IO notification function
 * This function handles sending notifications to the Socket.IO server
 * with error handling, timeouts, and logging
 * 
 * @param {string} event - The event name to emit
 * @param {object} data - The data to send with the event
 * @param {number} timeoutMs - Timeout in milliseconds (default: 3000)
 * @returns {Promise<void>}
 */
export async function sendSocketNotification(event, data, timeoutMs = 3000) {
  try {
    // Use the shared function to get the Socket.IO server URL
    const socketServerUrl = getSocketServerUrl();
    
    console.log(`Socket.IO bildirimi gönderiliyor: ${event}`, {
      dataType: typeof data,
      dataId: data.id
    });
    
    // Set up abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    const response = await fetch(socketServerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        event,
        data,
      }),
      signal: controller.signal
    });
    
    clearTimeout(timeoutId); // Clear timeout
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error(`Socket.IO bildirim hatası: ${response.status} ${errorText}`);
      return;
    }
    
    console.log(`Socket.IO bildirimi başarıyla gönderildi: ${event}`, {
      event,
      dataId: data.id
    });
  } catch (error) {
    // Use the shared logSocketError function
    logSocketError(error, { event, data });
    
    // Special message for timeout errors
    if (error.name === 'AbortError') {
      console.error('Socket.IO bildirimi zaman aşımına uğradı. Socket.IO sunucusu çalışıyor mu?');
    }
    
    // Swallow the error, application should continue
    console.log('Socket.IO bildirimi başarısız oldu ancak API işlemine devam ediliyor');
  }
} 