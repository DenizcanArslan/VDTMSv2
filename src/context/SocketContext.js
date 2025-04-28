"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { getSocketClientUrl } from '@/lib/websocket';

// Socket.IO Context
export const SocketContext = createContext({
  socket: null,
  isConnected: false,
  on: () => () => {}, 
  off: () => {},
  emit: () => {}
});

// Yeniden bağlanma denemesi için sabitler
const RECONNECT_TIMEOUT = 3000;
const MAX_RECONNECT_ATTEMPTS = 5;

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;

  // Socket.IO bağlantısı kur
  useEffect(() => {
    console.log('SocketProvider: Initializing Socket.IO connection...');
    
    // Socket.IO sunucu URL'sini belirle
    const socketUrl = getSocketClientUrl();
    console.log('Socket.IO URL:', socketUrl);
    
    // Socket.IO instance oluştur - Self-signed sertifika desteğiyle
    const socketInstance = io(socketUrl, {
      transports: ['polling', 'websocket'], // Hem polling hem websocket dene
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      rejectUnauthorized: false, // Self-signed sertifikaları kabul et
      withCredentials: true,
      forceNew: true // Yeni bir bağlantı zorla
    });
    
    // Bağlantı olaylarını dinle
    socketInstance.on('connect', () => {
      console.log('Socket.IO connected! Socket ID:', socketInstance.id);
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      
      // Başarılı bağlantı bildirimi
      toast.success('Canlı güncellemeler etkinleştirildi', { autoClose: 2000 });
      
      // Transport ve slot güncellemelerine otomatik olarak abone ol
      socketInstance.emit('transport:subscribe');
      socketInstance.emit('slot:subscribe');
    });
    
    socketInstance.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      setIsConnected(false);
      
      // Kullanıcıya bağlantı koptuğunu bildir
      toast.warning('Canlı güncellemeler kesintiye uğradı, yeniden bağlanılıyor...', { autoClose: 3000 });
    });
    
    socketInstance.on('connect_error', (error) => {
      console.error('Socket.IO connection error:', error.message);
      reconnectAttemptsRef.current += 1;
      
      // Bağlantı URL'ini console'a yazdır
      console.log(`Trying to connect to: ${socketUrl} (Attempt ${reconnectAttemptsRef.current}/${maxReconnectAttempts})`);
      
      if (reconnectAttemptsRef.current > maxReconnectAttempts) {
        console.error(`Maximum reconnect attempts (${maxReconnectAttempts}) reached`);
        socketInstance.disconnect();
        
        // Kullanıcıya bildir
        toast.error('Canlı güncellemelere bağlanılamadı. Lütfen sayfayı yenileyin.', { 
          autoClose: false,
          closeOnClick: true 
        });
      }
    });
    
    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`Socket.IO reconnected after ${attemptNumber} attempts`);
      
      // Kullanıcıya bildir
      toast.success('Canlı güncellemeler yeniden etkinleştirildi', { autoClose: 2000 });
    });
    
    socketInstance.on('reconnect_error', (error) => {
      console.error('Socket.IO reconnection error:', error.message);
    });
    
    // Debug için transport durumunu dinle
    socketInstance.on('connect_failed', () => console.log('Socket.IO connection failed'));
    socketInstance.io.on('reconnect_attempt', () => console.log('Socket.IO reconnect attempt'));
    socketInstance.io.on('error', (err) => console.error('Socket.IO transport error:', err));
    
    // Önemli güncellemeleri dinlemeye başla
    const events = ['slot:update', 'slots:reorder', 'transport:update', 'driver:assign', 'truck:assign'];
    events.forEach(event => {
      socketInstance.on(event, (data) => {
        console.log(`Güncellenme alındı (${event}):`, data);
      });
    });
    
    // Socket instance'ı kaydet
    setSocket(socketInstance);
    
    // Cleanup
    return () => {
      console.log('SocketProvider: Cleaning up Socket.IO connection...');
      
      // Transport ve slot güncellemelerinden çık
      if (socketInstance.connected) {
        socketInstance.emit('transport:unsubscribe');
        socketInstance.emit('slot:unsubscribe');
      }
      
      // Event dinleyicilerini kaldır
      events.forEach(event => socketInstance.off(event));
      socketInstance.off('connect');
      socketInstance.off('disconnect');
      socketInstance.off('connect_error');
      socketInstance.off('reconnect');
      socketInstance.off('reconnect_error');
      
      // Bağlantıyı kapat
      socketInstance.disconnect();
    };
  }, []);
  
  // Socket event dinleyicisi ekle
  const on = useCallback((event, callback) => {
    if (!socket) return () => {};
    
    console.log(`Adding listener for event: ${event}`);
    socket.on(event, callback);
    
    // Cleanup fonksiyonu döndür
    return () => {
      console.log(`Removing listener for event: ${event}`);
      socket.off(event, callback);
    };
  }, [socket]);
  
  // Socket event dinleyicisini kaldır
  const off = useCallback((event, callback) => {
    if (!socket) return;
    console.log(`Manually removing listener for event: ${event}`);
    socket.off(event, callback);
  }, [socket]);
  
  // Event emit et
  const emit = useCallback((event, data) => {
    if (!socket) return;
    console.log(`Emitting event: ${event}`, data);
    socket.emit(event, data);
  }, [socket]);
  
  // SocketContext.Provider'a değerleri ver
  const value = {
    socket,
    isConnected,
    on,
    off,
    emit
  };
  
  return (
    <SocketContext.Provider value={value}>
      {children}
    </SocketContext.Provider>
  );
};

// Socket.IO hook'u
export const useSocket = () => {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket hook, SocketProvider içinde kullanılmalıdır');
  }
  return context;
}; 