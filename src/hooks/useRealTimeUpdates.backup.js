"use client";

import { useEffect, useRef, useState } from 'react';
import { useDispatch } from 'react-redux';
import { useSocket } from '@/context/SocketContext';
import { usePathname } from 'next/navigation';
import { 
  addTransport, 
  updateTransport, 
  removeTransport 
} from '@/redux/features/transportSlice';
import { 
  addSlot, 
  updateSlot, 
  removeSlot
} from '@/redux/features/slotSlice';
import { updateTransportsAndSlots, fetchPlanningData, optimisticReorderThunk, updateSlotDriverStartNote } from '@/redux/features/planningSlice';
import { toast } from 'react-toastify';
import { startOfDay } from 'date-fns';

const useRealTimeUpdates = () => {
  const dispatch = useDispatch();
  const { isConnected, on, socket } = useSocket();
  const pathname = usePathname();
  
  // UI yenilemesi için state değişkeni
  const [triggerRefresh, setTriggerRefresh] = useState(false);
  
  // Planning sayfasında olup olmadığını kontrol et
  const isInPlanningPage = pathname && pathname.includes('/planning');
  
  // Her bir event için aktif dinleyicileri izle
  const activeListeners = useRef({});

  useEffect(() => {
    // Socket bağlantısını kontrol et
    if (!socket || !isConnected) {
      console.warn('⚠️ Socket.IO bağlantısı kurulmadı, real-time güncellemeler alınamayacak!');
      
      // Eğer socket yoksa, bir süre sonra tekrar dene
      const reconnectTimer = setTimeout(() => {
        console.log('⚠️ Socket.IO bağlantısı yeniden kurulmaya çalışılıyor...');
        // Sayfayı zorla yeniden bağla
        window.location.reload();
      }, 30000); // 30 saniye sonra yeniden bağlanmayı dene
      
      return () => clearTimeout(reconnectTimer);
    }
    
    console.log('✅ Socket.IO bağlantısı hazır, real-time güncellemeleri dinlemeye başlıyor...');
    console.log('📡 Socket ID:', socket.id);
    console.log('📡 Connected Status:', isConnected);
    
    // Bağlantının tamamen hazır olması için küçük bir gecikme ekle
    setTimeout(() => {
      // slots:reorder olayını dinle - TÜM SOCKET OLAYLARININ ÜSTÜNDEKİ PRIORITY OLARAK DİNLE
      if (!activeListeners.current.slotsReorder) {
        console.log('⚡ slots:reorder olayı için dinleyici ekleniyor...');
        activeListeners.current.slotsReorder = on('slots:reorder', async (data) => {
          console.log('⭐️ SLOTS:REORDER OLAYI SOCKET.IO ÜZERİNDEN ALINDI ⭐️', {
            eventTime: new Date().toISOString()
          });
          console.log('Event data:', data);

          if (!data || !data.slots || !data.date) {
            console.error('❌ Geçersiz slot yeniden sıralama verisi:', JSON.stringify(data));
            return;
          }
          
          processSlotReorderEvent(data);
        });
      }
      
      // Driver atama olayını dinle
      if (!activeListeners.current.driverAssign) {
        console.log('⚡ driver:assign olayı için dinleyici ekleniyor...');
        activeListeners.current.driverAssign = on('driver:assign', async (data) => {
          console.log('⭐️ DRIVER:ASSIGN OLAYI SOCKET.IO ÜZERİNDEN ALINDI ⭐️', {
            eventTime: new Date().toISOString(), 
            data
          });
          
          if (!data || !data.slotId || !data.driverId) {
            console.error('❌ Geçersiz driver:assign verisi:', JSON.stringify(data));
            return;
          }
          
          processDriverAssignEvent(data);
        });
      }
      
      // Truck atama olayını dinle
      if (!activeListeners.current.truckAssign) {
        console.log('⚡ truck:assign olayı için dinleyici ekleniyor...');
        activeListeners.current.truckAssign = on('truck:assign', async (data) => {
          console.log('⭐️ TRUCK:ASSIGN OLAYI SOCKET.IO ÜZERİNDEN ALINDI ⭐️', {
            eventTime: new Date().toISOString(),
            data
          });
          
          if (!data || !data.slotId || !data.truckId) {
            console.error('❌ Geçersiz truck:assign verisi:', JSON.stringify(data));
            return;
          }
          
          processTruckAssignEvent(data);
        });
      }
      
      // Slot güncelleme olayını dinle
      if (!activeListeners.current.slotUpdate) {
        console.log('⚡ slot:update olayı için dinleyici ekleniyor...');
        activeListeners.current.slotUpdate = on('slot:update', async (data) => {
          console.log('⭐️ SLOT:UPDATE OLAYI SOCKET.IO ÜZERİNDEN ALINDI ⭐️', {
            eventTime: new Date().toISOString(),
            data
          });
          
          if (!data || !data.slotId) {
            console.error('❌ Geçersiz slot:update verisi:', JSON.stringify(data));
            return;
          }
          
          // Tüm planning verilerini yeniden yükle
          if (pathname === '/planning') {
            console.log('🔄 Planning veri güncelleme - slot değişikliği nedeniyle');
            dispatch(fetchPlanningData());
            toast.info("Slot updated by another user", {
              autoClose: 2000,
            });
          }
        });
      }
      
      // Ayrıca window event olarak da dinleyelim (redundancy için)
      if (!activeListeners.current.windowSlotReorder) {
        console.log('⚡ socket:slotreorder window event için dinleyici ekleniyor...');
        const windowEventListener = (event) => {
          const data = event.detail;
          console.log('⭐️ SLOTS:REORDER OLAYI WINDOW EVENT ÜZERİNDEN ALINDI ⭐️', {
            eventTime: new Date().toISOString(),
            data
          });
          
          if (!data || !data.slots || !data.date) {
            console.error('❌ Geçersiz slot yeniden sıralama window event verisi:', data);
            return;
          }
          
          processSlotReorderEvent(data);
        };
        
        window.addEventListener('socket:slotreorder', windowEventListener);
        activeListeners.current.windowSlotReorder = () => {
          window.removeEventListener('socket:slotreorder', windowEventListener);
        };
      }
    }, 1000);
    
    // Slot yeniden sıralama olayını işle
    const processSlotReorderEvent = async (data) => {
      try {
        console.log('⭐️ slots:reorder olayı alındı:', data);
        console.log('⏱️ Olay alınma zamanı:', new Date().toISOString());
        console.log('📊 Veri içeriği:', {
          hasDate: !!data?.date,
          hasSlots: !!data?.slots,
          slotKeys: data?.slots ? Object.keys(data?.slots) : []
        });
        
        // Tarih ve slot verilerini doğrulama
        if (!data || !data.slots || !data.date) {
          console.error('❌ Geçersiz slots:reorder verisi:', data);
          return;
        }
        
        // Tarihi doğru formata çevir
        const dateStr = startOfDay(new Date(data.date)).toISOString();
        
        console.log('📊 Slot verileri işleme alınıyor:', {
          dateStr,
          slotKeys: Object.keys(data.slots),
          slotCount: data.slots[dateStr]?.length || 0
        });
        
        // Redux store güncelleme
        console.log('🔄 Redux store güncelleniyor...');
        
        // updateTransportsAndSlots action'ını dispatch et
        dispatch(updateTransportsAndSlots({
          slotUpdates: data.slots,
          type: 'update'
        }));
        
        console.log('✅ Redux store güncellendi');

        // Kullanıcıya bildirim göster
        if (pathname === '/planning') {
          toast.info("Layout updated by another user", {
            autoClose: 2000,
          });
          
          // Gereksiz sayfa refresh'i önlendi
        }
        
        // UI'ı zorla güncellemek için state güncelle
        setTriggerRefresh(prev => !prev);
        console.log('🔄 UI yenilemesi tetiklendi!');
      } catch (error) {
        console.error('❌ Slot verilerini işleme hatası:', error);
        console.error('Hata detayları:', {
          message: error.message,
          stack: error.stack
        });
        
        if (pathname === '/planning') {
          toast.error("Failed to update layout", {
            duration: 3000,
          });
          
          // Hata durumunda otomatik sayfa yenileme kaldırıldı
        }
      }
    };

    // Driver atama olayını işle
    const processDriverAssignEvent = async (data) => {
      try {
        console.log('⭐️ driver:assign olayı işleniyor:', data);
        
        // Slot ve driver ID'leri kontrol et
        if (!data.slotId || !data.driverId) {
          console.error('❌ Geçersiz driver atama verisi:', data);
          return;
        }
        
        // Eğer planning sayfasındaysak Redux store'u güncelle
        if (pathname === '/planning') {
          const dateStr = data.date || Object.keys(data.slots || {})[0];
          
          // updateSlotDriver actionu dispatch et
          dispatch({
            type: 'planning/updateSlotDriver',
            payload: {
              slotId: data.slotId,
              driverId: data.driverId,
              dateStr: dateStr
            }
          });
          
          console.log('✅ Redux store driver atama ile güncellendi');
          
          // Kullanıcıya bildirim göster
          toast.info("Driver assignment updated by another user", {
            autoClose: 2000,
          });
          
          // UI'ı zorla güncellemek için state güncelle
          setTriggerRefresh(prev => !prev);
        }
      } catch (error) {
        console.error('❌ Driver atama verilerini işleme hatası:', error);
        
        // Hata durumunda tüm verileri yeniden çek
        if (pathname === '/planning') {
          console.log('🔄 Hata nedeniyle planning verilerini tamamen yenileme');
          dispatch(fetchPlanningData());
        }
      }
    };
    
    // Truck atama olayını işle
    const processTruckAssignEvent = async (data) => {
      try {
        console.log('⭐️ truck:assign olayı işleniyor:', data);
        
        // Slot ve truck ID'leri kontrol et
        if (!data.slotId || !data.truckId) {
          console.error('❌ Geçersiz truck atama verisi:', data);
          return;
        }
        
        // Eğer planning sayfasındaysak Redux store'u güncelle
        if (pathname === '/planning') {
          const dateStr = data.date || Object.keys(data.slots || {})[0];
          
          // updateSlotTruck actionu dispatch et
          dispatch({
            type: 'planning/updateSlotTruck',
            payload: {
              slotId: data.slotId,
              truckId: data.truckId,
              dateStr: dateStr
            }
          });
          
          console.log('✅ Redux store truck atama ile güncellendi');
          
          // Kullanıcıya bildirim göster
          toast.info("Truck assignment updated by another user", {
            autoClose: 2000,
          });
          
          // UI'ı zorla güncellemek için state güncelle
          setTriggerRefresh(prev => !prev);
        }
      } catch (error) {
        console.error('❌ Truck atama verilerini işleme hatası:', error);
        
        // Hata durumunda tüm verileri yeniden çek
        if (pathname === '/planning') {
          console.log('🔄 Hata nedeniyle planning verilerini tamamen yenileme');
          dispatch(fetchPlanningData());
        }
      }
    };

    // Cleanup function
    return () => {
      console.log('⚠️ useRealTimeUpdates temizleniyor, tüm dinleyiciler kaldırılıyor...');
      // Mevcut tüm dinleyicileri temizle
      Object.values(activeListeners.current).forEach(cleanupFn => {
        if (typeof cleanupFn === 'function') {
          cleanupFn();
        }
      });
      activeListeners.current = {};
    };
  }, [dispatch, isConnected, on, pathname, isInPlanningPage]);
};

export default useRealTimeUpdates;

export default useRealTimeUpdates;
