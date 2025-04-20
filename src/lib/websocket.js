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