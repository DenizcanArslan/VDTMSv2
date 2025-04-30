/**
 * Socket.IO utility functions to standardize URLs across the application
 */

/**
 * Gets the Socket.IO server URL for server-side API calls
 * Prioritizes environment variables for production deployment
 */
export function getSocketServerUrl() {
  const configuredUrl = process.env.SOCKET_SERVER_URL;
  if (configuredUrl) return configuredUrl;
  
  // DuckDNS domain ile güncelle - sertifikalı bağlantı
  return 'https://vandijle.duckdns.org:3001/api/notify';
}

/**
 * Gets the Socket.IO client URL for browser connections
 * Uses secure HTTPS connections for all environments
 */
export function getSocketClientUrl() {
  const configuredUrl = process.env.NEXT_PUBLIC_SOCKET_URL;
  if (configuredUrl) return configuredUrl;
  
  // DuckDNS domain ile güncelle - sertifikalı bağlantı
  return 'https://vandijle.duckdns.org:3001';
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
export async function sendSocketNotification(event, data, timeoutMs = 5000) {
  try {
    // Use the shared function to get the Socket.IO server URL
    const socketServerUrl = getSocketServerUrl();
    
    console.log(`Socket.IO bildirimi gönderiliyor: ${event}`, {
      dataType: typeof data,
      dataId: data.id,
      updateType: data.updateType,
      url: socketServerUrl
    });
    
    // Set up abort controller for timeout
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    
    // Retry mechanism
    let retries = 0;
    const maxRetries = 2;
    let success = false;
    let lastError = null;
    
    while (retries <= maxRetries && !success) {
      try {
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
        
        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Server responded with ${response.status}: ${errorText}`);
        }
        
        success = true;
        console.log(`Socket.IO bildirimi başarıyla gönderildi: ${event}`, {
          event,
          dataId: data.id,
          updateType: data.updateType,
          retryCount: retries
        });
      } catch (retryError) {
        lastError = retryError;
        retries++;
        
        if (retries <= maxRetries) {
          console.warn(`Socket.IO bildirimi gönderilemedi, yeniden deneniyor (${retries}/${maxRetries})...`, retryError.message);
          // Backoff before retry
          await new Promise(resolve => setTimeout(resolve, 500 * retries));
        }
      }
    }
    
    clearTimeout(timeoutId); // Clear timeout
    
    if (!success) {
      throw lastError || new Error('Failed to send notification after retries');
    }
  } catch (error) {
    // Use the shared logSocketError function
    logSocketError(error, { event, data });
    
    // Special message for timeout errors
    if (error.name === 'AbortError') {
      console.error('Socket.IO bildirimi zaman aşımına uğradı. Socket.IO sunucusu çalışıyor mu?');
    }
    
    // Detaylı hata bilgisi
    console.error(`Socket.IO bildirim hatası (${event}):`, {
      message: error.message,
      dataInfo: {
        id: data?.id,
        updateType: data?.updateType,
        type: typeof data
      }
    });
    
    // Swallow the error, application should continue
    console.log('Socket.IO bildirimi başarısız oldu ancak API işlemine devam ediliyor');
  }
} 