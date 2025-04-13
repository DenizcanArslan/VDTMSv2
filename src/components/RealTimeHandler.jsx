"use client";

import { useEffect } from 'react';
import useRealTimeUpdates from '@/hooks/useRealTimeUpdates';
import { useSocket } from '@/context/SocketContext';
import { toast } from 'react-toastify';

const RealTimeHandler = () => {
  // Real-time güncellemeler için hook'u kullan
  useRealTimeUpdates();
  
  const { isConnected, socket } = useSocket();
  
  useEffect(() => {
    // Debug bağlantı durumunu
    console.log('Socket.IO bağlantı durumu:', isConnected);
    if (socket) {
      console.log('Socket ID:', socket.id);
    }
  }, [isConnected, socket]);
  
  return null; // UI renderlamaz, sadece fonksiyonellik sağlar
};

export default RealTimeHandler; 