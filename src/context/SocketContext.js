"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { getWebSocketClientUrl } from '@/lib/websocket';

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

  // WebSocket bağlantısı kur
  useEffect(() => {
    console.log('SocketProvider: Initializing WebSocket connection...');
    
    // WebSocket sunucu URL'sini belirle - Docker içinde çalışan websocket sunucusunu kullan
    const websocketUrl = getWebSocketClientUrl();
    console.log('WebSocket URL:', websocketUrl);
    
    // Socket.IO instance oluştur
    const socketInstance = io(websocketUrl, {
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000
    });
    
    // Bağlantı olaylarını dinle
    socketInstance.on('connect', () => {
      console.log('WebSocket connected! Socket ID:', socketInstance.id);
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      
      // Transport ve slot güncellemelerine otomatik olarak abone ol
      socketInstance.emit('transport:subscribe');
      socketInstance.emit('slot:subscribe');
    });
    
    socketInstance.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      setIsConnected(false);
    });
    
    socketInstance.on('connect_error', (error) => {
      console.error('WebSocket connection error:', error.message);
      reconnectAttemptsRef.current += 1;
      
      if (reconnectAttemptsRef.current > maxReconnectAttempts) {
        console.error(`Maximum reconnect attempts (${maxReconnectAttempts}) reached`);
        socketInstance.disconnect();
      }
    });
    
    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`WebSocket reconnected after ${attemptNumber} attempts`);
    });
    
    socketInstance.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error.message);
    });
    
    // Socket instance'ı kaydet
    setSocket(socketInstance);
    
    // Cleanup
    return () => {
      console.log('SocketProvider: Cleaning up WebSocket connection...');
      socketInstance.off('connect');
      socketInstance.off('disconnect');
      socketInstance.off('connect_error');
      socketInstance.off('reconnect');
      socketInstance.off('reconnect_error');
      
      // Transport ve slot güncellemelerinden çık
      socketInstance.emit('transport:unsubscribe');
      socketInstance.emit('slot:unsubscribe');
      
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