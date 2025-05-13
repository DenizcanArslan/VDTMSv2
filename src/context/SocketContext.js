"use client";

import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io } from 'socket.io-client';
import { toast } from 'react-toastify';
import { getSocketClientUrl } from '@/lib/websocket';
import { useDispatch } from 'react-redux';

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

// Cache-busting ile planning verisi yenileme fonksiyonu
const fetchPlanningDataWithCacheBust = async (dispatch) => {
  const timestamp = new Date().getTime();
  const response = await fetch(`/api/planning?nocache=${timestamp}`, {
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
      'Pragma': 'no-cache',
      'Expires': '0'
    }
  });
  const data = await response.json();
  dispatch({
    type: 'planning/updateTransportsAndSlots',
    payload: {
      transportUpdates: data.transports || [],
      slotUpdates: data.slots || {},
      type: 'forceUpdate'
    }
  });
  
  // Socket olaylarını izlemek için timestamp global değişkene kaydedelim
  window._lastPlanningUpdateTimestamp = timestamp;
  console.log('Planning data updated with timestamp:', timestamp);
};

export const SocketProvider = ({ children }) => {
  const [socket, setSocket] = useState(null);
  const [isConnected, setIsConnected] = useState(false);
  const reconnectAttemptsRef = useRef(0);
  const maxReconnectAttempts = 5;
  const dispatch = useDispatch();
  
  // Son veri güncelleme zaman damgasını saklamak için bir ref
  const lastUpdateTimestampRef = useRef(0);
  
  // Global window değişkenini başlat (eğer tarayıcıdaysak)
  useEffect(() => {
    if (typeof window !== 'undefined') {
      window._lastPlanningUpdateTimestamp = 0;
    }
  }, []);

  // Socket.IO bağlantısı kur
  useEffect(() => {
    console.log('SocketProvider: Initializing Socket.IO connection...');
    
    // Socket.IO sunucu URL'sini belirle
    const socketUrl = getSocketClientUrl();
    console.log('Socket.IO URL:', socketUrl);
    
    // Socket.IO instance oluştur - Self-signed sertifika desteğiyle
    const socketInstance = io(socketUrl, {
      transports: ['websocket', 'polling'], // Önce websocket dene, sonra polling
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      rejectUnauthorized: false, // Self-signed sertifikaları kabul et
      withCredentials: true,
      forceNew: true, // Yeni bir bağlantı zorla
      path: '/socket.io/',
      secure: true
    });
    
    console.log('Socket.IO instance created with configuration:', {
      url: socketUrl,
      transports: ['websocket', 'polling'],
      withCredentials: true,
      forceNew: true
    });
    
    // Bağlantı olaylarını dinle
    socketInstance.on('connect', () => {
      console.log('Socket.IO connected! Socket ID:', socketInstance.id);
      setIsConnected(true);
      reconnectAttemptsRef.current = 0;
      
      // Başarılı bağlantı bildirimi
      toast.success('Live updates enabled', { autoClose: 2000 });
      
      // Transport ve slot güncellemelerine otomatik olarak abone ol
      socketInstance.emit('transport:subscribe');
      socketInstance.emit('slot:subscribe');
      
      // Connect olduktan 1 saniye sonra tekrar abone olma komutu gönder
      // Bu, sunucu tarafında olası kayıt sorunlarını çözmek için
      setTimeout(() => {
        if (socketInstance.connected) {
          console.log('Re-subscribing to events after 1 second...');
          socketInstance.emit('transport:subscribe');
          socketInstance.emit('slot:subscribe');
        }
      }, 1000);
    });
    
    socketInstance.on('disconnect', (reason) => {
      console.log('Socket.IO disconnected:', reason);
      setIsConnected(false);
      
      // Kullanıcıya bağlantı koptuğunu bildir
      toast.warning('Canlı güncellemeler kesintiye uğradı, yeniden bağlanılıyor...', { autoClose: 3000 });
      
      // Disconnect nedeni transport kapanması ise, manuel olarak reconnect dene
      if (reason === 'transport close' || reason === 'ping timeout') {
        console.log('Attempting to reconnect manually...');
        setTimeout(() => {
          if (!socketInstance.connected) {
            socketInstance.connect();
          }
        }, 1000);
      }
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
        
        // 30 saniye sonra yeniden bağlanmayı dene
        setTimeout(() => {
          console.log('Attempting to reconnect after cooling period...');
          reconnectAttemptsRef.current = 0;
          socketInstance.connect();
        }, 30000);
      }
    });
    
    socketInstance.on('reconnect', (attemptNumber) => {
      console.log(`Socket.IO reconnected after ${attemptNumber} attempts`);
      
      // Kullanıcıya bildir
      toast.success('Canlı güncellemeler yeniden etkinleştirildi', { autoClose: 2000 });
      
      // Reconnect olduktan sonra tekrar abone ol
      if (socketInstance.connected) {
        console.log('Re-subscribing to events after reconnect...');
        socketInstance.emit('transport:subscribe');
        socketInstance.emit('slot:subscribe');
      }
    });
    
    socketInstance.on('reconnect_error', (error) => {
      console.error('Socket.IO reconnection error:', error.message);
    });
    
    socketInstance.on('reconnect_attempt', (attemptNumber) => {
      console.log(`Socket.IO reconnect attempt #${attemptNumber}`);
    });
    
    // Debug için transport durumunu dinle
    socketInstance.on('connect_failed', () => console.log('Socket.IO connection failed'));
    socketInstance.io.on('reconnect_attempt', () => console.log('Socket.IO reconnect attempt'));
    socketInstance.io.on('error', (err) => console.error('Socket.IO transport error:', err));
    
    // Bağlantı ping/pong durumunu takip et
    socketInstance.io.on('ping', () => {
      console.log('Socket.IO ping received');
    });
    
    socketInstance.io.on('pong', (latency) => {
      console.log(`Socket.IO pong received (latency: ${latency}ms)`);
    });
    
    // Veri değişikliklerini işleyen fonksiyon
    const handleDataChange = async (data) => {
      // Mevcut timestamp'i al
      const currentTimestamp = Date.now();
      const lastUpdateTimestamp = window._lastPlanningUpdateTimestamp || 0;
      
      // Son güncellemeden bu yana yeterli süre geçmiş mi kontrol et
      // (çok sık güncelleme olmasını engeller)
      const UPDATE_THROTTLE_MS = 500; // 500ms içinde bir güncelleme izin ver
      
      console.log('Received data change event:', {
        eventTime: currentTimestamp,
        lastUpdate: lastUpdateTimestamp,
        timeSinceLast: currentTimestamp - lastUpdateTimestamp,
        willUpdate: (currentTimestamp - lastUpdateTimestamp) > UPDATE_THROTTLE_MS
      });
      
      if ((currentTimestamp - lastUpdateTimestamp) > UPDATE_THROTTLE_MS) {
        console.log('Fetching fresh data from server due to socket event');
        // Güncel verileri almak için cache-busting ile veri yenile
        await fetchPlanningDataWithCacheBust(dispatch);
      } else {
        console.log('Skipping update due to throttling');
      }
    };
    
    // Önemli güncellemeleri dinlemeye başla
    const events = [
      'slot:update', 
      'slots:reorder', 
      'transport:update', 
      'transport:delete',
      'transport:status-update',
      'driver:assign', 
      'truck:assign'
    ];
    
    events.forEach(event => {
      socketInstance.on(event, (data) => {
        console.log(`Güncellenme alındı (${event}):`, {
          id: data?.id,
          updateType: data?.updateType,
          transportId: data?.transportId,
          time: new Date().toISOString()
        });
        
        // Veri değişikliğini işle
        handleDataChange(data);
      });
    });
    
    // Truck ve Driver event'leri için özel işleyiciler
    // Bu özel işleyiciler, Redux state'ini hemen güncellemek için kullanılır
    socketInstance.on('truck:assign', async (data) => {
      console.log('Truck assign olayı alındı:', data);
      // Önce Redux state'ini hemen güncelle (iyimser güncelleme)
      if (data.slotId && data.truckId) {
        dispatch({
          type: 'planning/updateSlotTruck',
          payload: {
            dateStr: new Date(data.date).toISOString().split('T')[0],
            slotId: data.slotId,
            truckId: data.truckId
          }
        });
      }
      
      // Veri değişikliğini işle
      await handleDataChange(data);
    });
    
    socketInstance.on('driver:assign', async (data) => {
      console.log('Driver assign olayı alındı:', data);
      // Önce Redux state'ini hemen güncelle (iyimser güncelleme)
      if (data.slotId && data.driverId) {
        dispatch({
          type: 'planning/updateSlotDriver',
          payload: {
            dateStr: new Date(data.date).toISOString().split('T')[0],
            slotId: data.slotId,
            driverId: data.driverId
          }
        });
      }
      
      // Veri değişikliğini işle
      await handleDataChange(data);
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
      socketInstance.off('reconnect_attempt');
      socketInstance.off('ping');
      socketInstance.off('pong');
      
      // Bağlantıyı kapat
      socketInstance.disconnect();
    };
  }, [dispatch]);
  
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