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

// Add a debounce utility function to reduce duplicate notifications
const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

const useRealTimeUpdates = () => {
  const dispatch = useDispatch();
  const { isConnected, on } = useSocket();
  const pathname = usePathname();
  
  // Planning sayfasında olup olmadığını kontrol et
  const isInPlanningPage = pathname && pathname.includes('/planning');
  
  // Her bir event için aktif dinleyicileri izle
  const activeListeners = useRef({});
  // Keep track of recent toast messages to prevent duplicates
  const recentToasts = useRef({});
  // Add a flag to prevent multiple simultaneous API calls
  const isUpdating = useRef(false);

  // Create a debounced toast function
  const showToastDebounced = useRef(
    debounce((message, type = 'info') => {
      const key = `${message}-${type}`;
      const now = Date.now();
      
      // Only show toast if we haven't shown this same message in the last 2 seconds
      if (!recentToasts.current[key] || now - recentToasts.current[key] > 2000) {
        recentToasts.current[key] = now;
        toast[type](message, { 
          position: 'bottom-right',
          autoClose: 2000
        });
      }
    }, 500)
  ).current;

  // Create a more resilient debounced function for data fetching
  const debouncedFetchAndUpdate = debounce(async () => {
    try {
      console.log('Executing debounced planning data fetch...');
      if (!isUpdating.current) {
        await doFetchAndUpdate();
      }
    } catch (error) {
      console.error('Error in debounced fetch:', error);
    }
  }, 500);

  useEffect(() => {
    // Event dinleyicilerini temizle
    const cleanupListeners = () => {
      console.log('Socket.IO dinleyicileri temizleniyor...');
      Object.values(activeListeners.current).forEach(cleanup => {
        if (typeof cleanup === 'function') {
          cleanup();
        }
      });
      activeListeners.current = {};
    };
    
    if (!isConnected) {
      console.log('Socket.IO bağlantısı yok, dinleyiciler kurulmadı');
      // Eğer bağlantı kopmuşsa ve tekrar bağlanırsa, otomatik olarak verileri yenileyelim
      return () => {
        // Bağlantı kesildiğinde temizlik işlemi
        cleanupListeners();
      };
    }
    
    console.log('Socket.IO bağlantısı hazır, dinleyiciler kuruluyor');
    console.log('Şu anki sayfa:', pathname, 'Planning sayfasında mı:', isInPlanningPage);
    
    // Custom DOM event listener ekle - force-planning-update
    const forcePlanningUpdateHandler = (event) => {
      if (!isInPlanningPage) return;
      
      const { event: eventName, data } = event.detail;
      console.log(`🔥 force-planning-update event detected! Origin event: ${eventName}`);
      
      // 100ms gecikmeli bir şekilde tam veri yenileme işlemi çağır
      setTimeout(async () => {
        try {
          console.log('🔄 Forced planning data refresh triggered by DOM event');
          
          // Önce mevcut güncelleme işaretini temizle
          isUpdating.current = false;
          
          // Refresh işlemini gerçekleştir
          await doFetchAndUpdate();
          
          console.log('✅ Forced planning data refresh completed successfully');
        } catch (error) {
          console.error('❌ Forced planning data refresh failed:', error);
        }
      }, 100);
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('force-planning-update', forcePlanningUpdateHandler);
    }
    
    // Yardımcı fonksiyon: API'den veri çekip Redux'a uygular
    const fetchAndUpdatePlanning = async () => {
      // If already updating, skip this call
      if (isUpdating.current) {
        console.log('Already updating, will queue this update after 500ms');
        // Queue an update for after the current one finishes
        return new Promise(resolve => {
          setTimeout(async () => {
            if (!isUpdating.current) {
              console.log('Executing delayed planning data fetch');
              try {
                await doFetchAndUpdate();
                resolve();
              } catch (error) {
                console.error('Error in delayed fetch:', error);
                resolve(); // Still resolve to prevent hanging promises
              }
            } else {
              console.log('Still updating, skipping delayed fetch');
              resolve(); // Resolve anyway to prevent hanging promises
            }
          }, 500);
        });
      }
      
      return doFetchAndUpdate();
    };
    
    // The actual fetch and update logic in a separate function to avoid code duplication
    const doFetchAndUpdate = async () => {
      try {
        isUpdating.current = true;
        
        console.log('Fetching updated planning data...');
        // Force browser to make a new request and not use cache
        const uniqueParam = new Date().getTime();
        
        // Cache busting için daha agresif bir yaklaşım
        const response = await fetch(`/api/planning?nocache=${uniqueParam}`, {
          method: 'GET',
          cache: 'no-store',
          headers: {
            'Content-Type': 'application/json',
            'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
            'Pragma': 'no-cache',
            'Expires': '0'
          }
        });
        
        if (!response.ok) {
          throw new Error(`Failed to fetch planning data: ${response.statusText}`);
        }
        
        const planningData = await response.json();
        
        // Redux store güncelleme
        console.log('Dispatching planning data to Redux store:', {
          transportCount: planningData.transports?.length || 0,
          slotDates: Object.keys(planningData.slots || {})
        });
        
        // Dispatch öncesi ek kontrol
        if (!planningData || !planningData.slots) {
          console.error('Invalid planning data received:', planningData);
          throw new Error('Invalid planning data structure');
        }
        
        // KRITIK: Dispatch'i doğrudan yap, setTimeout kullanma
        dispatch(updateTransportsAndSlots({
          transportUpdates: planningData.transports || [],
          slotUpdates: planningData.slots || {},
          type: 'update'
        }));
        
        // DOM eventini manuel olarak tetikle
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('planning-data-updated', { 
            detail: { timestamp: new Date().toISOString() }
          }));
        }
        
        console.log('Redux store refreshed with latest planning data');
        
        return planningData;
      } catch (error) {
        console.error('Error fetching planning data:', error);
        console.error('Error stack:', error.stack);
        
        if (isInPlanningPage) {
          showToastDebounced('Failed to refresh planning data', 'error');
          
          // Planlama verilerini alırken ciddi bir hata oluşursa, kritik durumlarda sayfa yenilemesi dene
          if (error.message.includes('invalid') || error.message.includes('unexpected')) {
            console.log('Critical error, forcing page reload in 3 seconds...');
            setTimeout(() => {
              if (typeof window !== 'undefined') window.location.reload();
            }, 3000);
          }
        }
        throw error;
      } finally {
        // Always ensure we clear the updating flag, even if there was an error
        setTimeout(() => {
          isUpdating.current = false;
        }, 200);
      }
    };
    
    // Bağlantı başarılı olduktan sonra tüm güncel verileri çek
    const initializeData = async () => {
      if (isInPlanningPage) {
        try {
          console.log('Socket.IO bağlantısı kuruldu, planning verilerini güncelliyorum...');
          await fetchAndUpdatePlanning();
          console.log('Socket.IO bağlantısı sonrası ilk veri güncelleme tamamlandı');
        } catch (error) {
          console.error('Socket.IO bağlantısı sonrası veri güncelleme hatası:', error);
        }
      }
    };
    
    // Event dinleyicilerini yeniden kur
    const setupListeners = () => {
      // Önce mevcut tüm dinleyicileri temizle
      cleanupListeners();
      
      // Transport güncellemeleri için dinleyiciler
      activeListeners.current.transportCreate = on('transport:create', async (data) => {
        console.log('Yeni transport alındı:', data);
        
        try {
          // Fetch all planning data to ensure consistency across users
          await fetchAndUpdatePlanning();
          
          // Sadece planning sayfasındaysa bildirim göster
          if (isInPlanningPage) {
            showToastDebounced(`New transport added: ${data.transportOrderNumber || 'Unknown'}`);
          }
        } catch (error) {
          console.error('Transport ekleme hatası:', error);
        }
      });
      
      // Add dedicated listener for ETA updates
      activeListeners.current.transportEtaUpdate = on('transport:eta-update', async (data) => {
        console.log('Transport ETA update event received:', data);
        
        try {
          // Log received ETA data for debugging
          console.log('ETA update details:', {
            id: data.id,
            transportOrderNumber: data.transportOrderNumber,
            pickUpEta: data.pickUpEta,
            dropOffEta: data.dropOffEta,
            destinationEtas: data.destinations?.map(d => ({id: d.id, eta: d.eta})) || []
          });
          
          // Immediate optimistic update without API call - UPDATE TRANSPORT SLICE FIRST
          dispatch(updateTransport(data));
          
          // Update the transport in planning slots view
          dispatch(updateTransportsAndSlots({
            transportUpdates: [data],
            type: 'update'
          }));
          
          // Fetch all planning data to ensure consistency across all users
          await fetchAndUpdatePlanning();
          
          if (isInPlanningPage) {
            showToastDebounced('Transport ETAs updated');
          }
        } catch (error) {
          console.error('Transport ETA update handling error:', error);
          console.error('Error details:', error.stack);
        }
      });
      
      // Add a new listener for transport status updates specifically
      activeListeners.current.transportStatusUpdate = on('transport:status-update', async (data) => {
        console.log('Transport status update event received:', data);
        
        try {
          // If already updating, skip redundant updates
          if (isUpdating.current) {
            console.log('Already updating, handling transport status update immediately');
            // Immediate optimistic update without API call
            // Update the transport in the store to reflect sentToDriver status change
            dispatch(updateTransport(data));
            
            // Update the transport in planning slots view
            dispatch(updateTransportsAndSlots({
              transportUpdates: [data],
              type: 'update'
            }));
            
            if (isInPlanningPage) {
              // Notify based on status change
              if (data.sentToDriver && data.currentStatus === 'PLANNED') {
                showToastDebounced('Transport sent to driver');
              } else if (data.currentStatus === 'COMPLETED') {
                showToastDebounced('Transport marked as completed');
              } else if (data.currentStatus === 'ONGOING') {
                showToastDebounced('Transport marked as ongoing');
              }
            }
            return;
          }
          
          // Immediate optimistic update even before API call
          // This ensures UI elements like buttons immediately reflect new status
          dispatch(updateTransport(data));
          
          dispatch(updateTransportsAndSlots({
            transportUpdates: [data],
            type: 'update'
          }));
          
          // Also update data from API to ensure consistency
          await fetchAndUpdatePlanning();
          
          if (isInPlanningPage) {
            // Notify based on status change
            if (data.sentToDriver && data.currentStatus === 'PLANNED') {
              showToastDebounced('Transport sent to driver');
            } else if (data.currentStatus === 'COMPLETED') {
              showToastDebounced('Transport marked as completed');
            } else if (data.currentStatus === 'ONGOING') {
              showToastDebounced('Transport marked as ongoing');
            }
          }
        } catch (error) {
          console.error('Transport status update handling error:', error);
        }
      });
      
      activeListeners.current.transportUpdate = on('transport:update', async (data) => {
        console.log('Transport güncellendi:', data);
        
        try {
          // Log incoming transport data
          console.log('Transport update detayları:', {
            id: data.id,
            transportOrderNumber: data.transportOrderNumber,
            pickUpDate: data.pickUpDate,
            dropOffDate: data.dropOffDate,
            destinations: data.destinations,
            slotAssignments: data.slotAssignments
          });
          
          // Always fetch complete planning data for any transport update to ensure cross-user synchronization
          await fetchAndUpdatePlanning();
          
          // Show notification only if in planning page
          if (isInPlanningPage) {
            let message = `Transport updated: ${data.transportOrderNumber || 'Unknown'}`;
            
            // Special message for ON_HOLD status change
            if (data.status === 'ON_HOLD') {
              message = `Transport added to onhold: ${data.transportOrderNumber || 'Unknown'}`;
              showToastDebounced(message, 'warning');
            } else {
              showToastDebounced(message);
            }
          }
        } catch (error) {
          console.error('Transport güncelleme hatası:', error);
          console.error('Hata detayları:', error.stack);
        }
      });
      
      activeListeners.current.transportDelete = on('transport:delete', async (data) => {
        console.log('🚨 Transport silindi:', data);
        
        try {
          if (!data || !data.id) {
            console.error('Silinen transport için geçerli ID yok:', data);
            return;
          }
          
          const transportId = data.id;
          console.log(`Transport ${transportId} siliniyor...`);
          
          // 1. Redux store'dan transportu kaldır
          dispatch(removeTransport(transportId));
          
          // 2. Tüm slot koleksiyonlarını tek tek kontrol ederek transport'u kaldır
          // Bu kritik adım, silinen transportun tüm slotlardan temizlenmesini sağlar
          Object.keys(activeListeners.current).forEach(key => {
            if (key.startsWith('transport:')) {
              console.log(`${key} listener için event cache temizleniyor`);
            }
          });
          
          // 3. Redux store'daki slotlardan transport'u manuel olarak kaldır
          // Bu ÖZEL işlem, tüm slotlardan transport'u anında kaldırır
          dispatch({
            type: 'planning/REMOVE_TRANSPORT_FROM_ALL_SLOTS',
            payload: transportId
          });
          
          // 4. Optimistik UI güncelleme
          // Başlangıçta kullanıcının hemen tepki almasını sağlamak için
          dispatch(updateTransportsAndSlots({
            transportUpdates: [{ id: transportId }],
            type: 'remove'
          }));
          
          // 5. API'den tüm güncel verileri çekerek senkronizasyon sağla
          // Bu adım önemli - API'den gelen veriler ile tam senkronizasyon sağlar
          console.log(`Transport ${transportId} için tam veri senkronizasyonu yapılıyor...`);
          await fetchAndUpdatePlanning();
          
          // 6. İkinci bir onaylama doğrulaması için tekrar temizlik kontrolü
          setTimeout(async () => {
            console.log(`Transport ${transportId} için ikinci kontrol yapılıyor...`);
            await fetchAndUpdatePlanning();
          }, 500);
          
          // Sadece planning sayfasındaysa bildirim göster
          if (isInPlanningPage) {
            showToastDebounced(`Transport silindi: ${data.transportOrderNumber || 'Unknown'}`);
          }
        } catch (error) {
          console.error('Transport silme hatası:', error);
          console.error('Hata detayları:', error.stack);
          
          // Hata durumunda verileri yenilemeye çalış
          try {
            await fetchAndUpdatePlanning();
          } catch (refreshError) {
            console.error('Silme sonrası veri yenileme hatası:', refreshError);
          }
        }
      });
      
      // Slot güncellemeleri için dinleyiciler
      activeListeners.current.slotCreate = on('slot:create', async (data) => {
        console.log('Yeni slot alındı:', data);
        
        try {
          // Önce slotSlice'ı güncelle
          dispatch(addSlot(data));
          
          // Gerekli bileşenleri doğrudan güncelle - sayfayı yeniden yüklemeden
          if (data) {
            dispatch(updateTransportsAndSlots({
              slotUpdates: [data],
              type: 'add'
            }));
            
            // Tam veri senkronizasyonu için API'den tüm planlama verilerini fetch et
            await fetchAndUpdatePlanning();
          }
          
          // Sadece planning sayfasındaysa bildirim göster
          if (isInPlanningPage) {
            showToastDebounced('New slot added');
          }
        } catch (error) {
          console.error('Slot ekleme hatası:', error);
        }
      });
      
      activeListeners.current.slotUpdate = on('slot:update', async (data) => {
        console.log('🔄 Slot güncelleme olayı alındı:', {
          id: data?.id,
          slotId: data?.slotId,
          updateType: data?.updateType,
          date: data?.date,
          data: JSON.stringify(data).substring(0, 100) // İlk 100 karakteri logla
        });
        
        try {
          // Veri doğrulama - id veya slotId'den birini kullan
          const slotId = data?.id || data?.slotId; 
          if (!slotId) {
            console.error('🚨 Geçersiz slot verisi alındı, ID yok:', data);
            return;
          }
          
          // Standardize data - Eksik property'leri doldur
          const normalizedData = {
            ...data,
            id: slotId, // id propertysi mutlaka olmalı
          };
          
          // Slot state'i güncelleme
          dispatch(updateSlot(normalizedData));
          console.log('✅ Redux updateSlot action başarıyla dispatch edildi:', slotId);
          
          // Özel güncelleme tiplerini kontrol et - driver-start-note için
          if (data.updateType === 'driver-start-note') {
            console.log('📝 Start time güncelleme mesajı alındı:', {
              slotId: slotId,
              driverStartNote: data.driverStartNote,
              date: data.date
            });
            
            // ÖNEMLİ: Kullanıcı bu alana aktif olarak yazıyorsa socket güncellemesini kabul etme
            if (typeof window !== 'undefined' && window.activeInputSlots && window.activeInputSlots[slotId]) {
              const activeTimestamp = window.activeInputSlots[slotId];
              const now = Date.now();
              const secondsSinceActive = (now - activeTimestamp) / 1000;
              
              console.log(`⚠️ Kullanıcı ${slotId} numaralı slota aktif olarak yazıyor (${secondsSinceActive.toFixed(1)} sn). Socket güncellemesi reddedildi.`);
              return; // Socket güncellemesini işleme - kullanıcının yazdığı veri korunsun
            }
            
            if (!data.date) {
              console.warn('⚠️ Start time güncellemesi için eksik tarih:', data);
              return;
            }
            
            // Tarih formatını kontrol et
            let dateStr;
            try {
              const dateObj = new Date(data.date);
              if (isNaN(dateObj.getTime())) {
                throw new Error('Invalid date');
              }
              dateStr = startOfDay(dateObj).toISOString();
            } catch (dateError) {
              console.error('Tarih dönüştürme hatası:', dateError);
              // Hatalı tarih durumunda bugünkü tarihi kullan
              dateStr = startOfDay(new Date()).toISOString();
            }
            
            console.log('📅 Kullanılan tarih:', dateStr);
            
            // Daha az beklet: Anlık güncelleme yap - kullanıcı aktif olarak bu alanda yazmıyorsa
            // Debounce'ı kaldırıyoruz çünkü kullanıcı yazmıyorsa hemen güncellenmeli
            // if (window.driverNoteUpdateDebounce) clearTimeout(window.driverNoteUpdateDebounce);
            
            // Doğrudan planningSlice'deki updateSlotDriverStartNote action'ını kullan
            dispatch(updateSlotDriverStartNote({
              dateStr: dateStr,
              slotId: slotId,
              driverStartNote: data.driverStartNote || '' // Silme durumlarında boş string kullan
            }));
            console.log('✅ Redux updateSlotDriverStartNote action başarıyla dispatch edildi');
            
            // Sadece planning sayfasındaysa bildirim göster - gerekli değilse kaldırılabilir
            if (isInPlanningPage) {
              showToastDebounced('Start time updated');
            }
            
            return;
          }
          
          // If already updating, skip additional API call
          if (isUpdating.current) {
            console.log('Already updating, skipping redundant API call for slot update');
            if (isInPlanningPage) {
              showToastDebounced('Slot updated');
            }
            return;
          }
          
          // Diğer slot güncellemeleri için tam veri al
          console.log('Fetching complete planning data after slot update...');
          await doFetchAndUpdate();
          console.log('Planning data successfully updated after slot update');
          
          // DOM eventini manuel olarak tetikle
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('force-planning-update', { 
              detail: { event: 'slot:update', data: data }
            }));
            console.log('force-planning-update DOM event dispatched');
          }
          
          // Sadece planning sayfasındaysa bildirim göster
          if (isInPlanningPage) {
            showToastDebounced('Slot updated');
          }
        } catch (error) {
          console.error('Slot güncelleme hatası:', error);
          console.error('Error stack:', error.stack);
          
          // API üzerinden tam veriyi alarak durumu kurtarmayı dene
          console.log('Hata sonrası tam veri güncelleme deneniyor...');
          debouncedFetchAndUpdate();
          
          // Hata durumunda yine de bildir
          if (isInPlanningPage) {
            showToastDebounced('Error updating slot data', 'error');
          }
          
          // DOM eventini manuel olarak tetikle - hata durumunda bile
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new CustomEvent('force-planning-update', { 
              detail: { event: 'slot:update-error', data: { error: error.message } }
            }));
            console.log('force-planning-update DOM event dispatched (error case)');
          }
        }
      });
      
      // Driver atama olayını dinle
      activeListeners.current.driverAssign = on('driver:assign', async (data) => {
        console.log('Driver atama olayı alındı:', data);
        
        try {
          // If already updating, skip additional API call
          if (isUpdating.current) {
            console.log('Already updating, skipping redundant API call for driver assignment');
            if (isInPlanningPage) {
              showToastDebounced('Driver assigned to slot');
            }
            return;
          }
          
          await fetchAndUpdatePlanning();
          
          // Sadece planning sayfasındaysa bildirim göster
          if (isInPlanningPage) {
            showToastDebounced('Driver assigned to slot');
          }
        } catch (error) {
          console.error('Driver atama sonrası veri güncelleme hatası:', error);
        }
      });
      
      // Truck atama olayını dinle
      activeListeners.current.truckAssign = on('truck:assign', async (data) => {
        console.log('Truck atama olayı alındı:', data);
        
        try {
          // If already updating, skip additional API call
          if (isUpdating.current) {
            console.log('Already updating, skipping redundant API call for truck assignment');
            if (isInPlanningPage) {
              showToastDebounced('Truck assigned to slot');
            }
            return;
          }
          
          await fetchAndUpdatePlanning();
          
          // Sadece planning sayfasındaysa bildirim göster
          if (isInPlanningPage) {
            showToastDebounced('Truck assigned to slot');
          }
        } catch (error) {
          console.error('Truck atama sonrası veri güncelleme hatası:', error);
        }
      });
      
      activeListeners.current.slotDelete = on('slot:delete', async (data) => {
        console.log('Slot silindi:', data);
        
        try {
          // Önce slotSlice'ı güncelle
          dispatch(removeSlot(data.id));
          
          // Gerekli bileşenleri doğrudan güncelle - sayfayı yeniden yüklemeden
          if (data) {
            dispatch(updateTransportsAndSlots({
              slotUpdates: [data],
              type: 'remove'
            }));
            
            // Tam veri senkronizasyonu için API'den tüm planlama verilerini fetch et
            await fetchAndUpdatePlanning();
          }
          
          // Sadece planning sayfasındaysa bildirim göster
          if (isInPlanningPage) {
            showToastDebounced('Slot deleted');
          }
        } catch (error) {
          console.error('Slot silme hatası:', error);
        }
      });
      
      // slots:reorder olayını dinle
      activeListeners.current.slotsReorder = on('slots:reorder', async (data) => {
        console.log('\n🔄 ========== SLOT REORDER EVENT TRIGGERED ==========');
        console.log('Event Time:', new Date().toISOString());
        console.log('Raw Event Data:', JSON.stringify(data, null, 2));

        try {
          if (!data || !data.slots) {
            console.warn('❌ No slot data received in the event');
            return;
          }

          // Socket.IO'ten gelen slot verilerini detaylı logla
          const dateKeys = Object.keys(data.slots);
          console.log('\n📥 GELEN SLOT VERİLERİ:');
          console.log('Tarih Anahtarları:', dateKeys);
          
          dateKeys.forEach(dateKey => {
            const slots = data.slots[dateKey];
            if (!Array.isArray(slots)) {
              console.warn(`❌ Invalid slots data for date ${dateKey}:`, slots);
              return;
            }

            console.log(`\n📅 TARİH: ${dateKey}`);
            console.log('SLOT DETAYLARI:');
            slots.forEach(slot => {
              console.log(`\nSlot ID: ${slot.id}`);
              console.log(`Slot Number: ${slot.slotNumber}`);
              console.log(`Order: ${slot.order}`);
              console.log(`Driver ID: ${slot.driverId || 'Atanmamış'}`);
              console.log(`Truck ID: ${slot.truckId || 'Atanmamış'}`);
              console.log(`Transport IDs: ${slot.transports?.map(t => t.id).join(', ') || 'Boş'}`);
            });
          });

          // Veritabanı güncellemesinin tamamlanması için kısa bir gecikme ekle
          console.log('\n⏳ Veritabanı güncellemesi bekleniyor (500ms)...');
          await new Promise(resolve => setTimeout(resolve, 500));
          
          // Tam verileri almak için API'yi çağır
          console.log('\n📡 API\'den güncel veriler alınıyor...');
          const response = await fetch('/api/planning');
          if (!response.ok) {
            throw new Error('Planning verileri alınamadı');
          }
          
          const planningData = await response.json();
          console.log('\n✅ API\'den veriler alındı');
          
          // Tarih anahtarını doğru şekilde oluştur
          const dateKey = startOfDay(new Date(data.date)).toISOString();
          
          // API'den gelen güncel slotları logla
          if (planningData.slots && planningData.slots[dateKey]) {
            console.log('\n📊 API\'DEN GELEN GÜNCEL SLOT VERİLERİ:');
            console.log(`TARİH: ${dateKey}`);
            planningData.slots[dateKey].forEach(slot => {
              console.log(`\nSlot ID: ${slot.id}`);
              console.log(`Slot Number: ${slot.slotNumber}`);
              console.log(`Order: ${slot.order}`);
              console.log(`Driver ID: ${slot.driverId || 'Atanmamış'}`);
              console.log(`Truck ID: ${slot.truckId || 'Atanmamış'}`);
              console.log(`Transport IDs: ${slot.transports?.map(t => t.id).join(', ') || 'Boş'}`);
            });
          }
          
          // Redux store'u güncelle
          if (data.slots && data.slots[dateKey]) {
            const slots = data.slots[dateKey];
            console.log('\n🔄 REDUX STORE GÜNCELLEME BAŞLADI');
            console.log('Güncellenecek Slot Sayısı:', slots.length);
            
            // Redux store'a optimisticReorder kullanarak doğrudan uygula
            dispatch(optimisticReorderThunk({
              dateStr: dateKey,
              slots: slots
            }));
            
            console.log('✅ REDUX STORE GÜNCELLENDİ');
          }
          
          // Sadece planning sayfasındaysa bildirim göster
          if (isInPlanningPage) {
            showToastDebounced('Slot positions updated');
          }

          console.log('\n========== SLOT REORDER EVENT COMPLETED ==========\n');
        } catch (error) {
          console.error('❌ Error processing slots:reorder event:', error);
          console.error('Error details:', {
            message: error.message,
            stack: error.stack
          });
          showToastDebounced('Failed to update slot positions', 'error');
        }
      });
      
      // planning:update olayını dinle
      activeListeners.current.planningUpdate = on('planning:update', async (data) => {
        console.log('🔄 Planning update event received:', data);
        
        try {
          // Notification first
          if (isInPlanningPage) {
            // More descriptive message based on update type
            if (data && data.type) {
              switch (data.type) {
                case 'slot-add':
                  showToastDebounced('New slot added', 'success');
                  break;
                case 'slot-delete':
                  showToastDebounced('Slot deleted', 'info');
                  break;
                case 'total-slots-update':
                  showToastDebounced(`Slots updated: now ${data.currentCount} slots`, 'info');
                  break;
                default:
                  showToastDebounced('Planning data updated', 'info');
              }
            } else {
              showToastDebounced('Planning data updated', 'info');
            }
          }
          
          // FORCE REDUX UPDATE: First ensure we're not in a fetch operation
          isUpdating.current = false;
          
          // THE MOST RADICAL APPROACH: If this is total-slots-update, we take a radical approach
          // This ensures we definitely refresh the UI with the new slots
          if (data && data.type === 'total-slots-update' && isInPlanningPage) {
            console.log('🔥 TOTAL SLOTS UPDATE DETECTED: Forcing direct Redux update with provided data');
            
            if (data.updatedSlots) {
              // Generate a dateStr from the received date
              console.log('Date received in update:', data.date);
              const dateObj = new Date(data.date);
              const dateStr = startOfDay(dateObj).toISOString();
              console.log('Using date string for update:', dateStr);
              
              // Extract just the slot data we need to update Redux
              const slotUpdates = {};
              slotUpdates[dateStr] = data.updatedSlots;
              
              console.log('Directly updating Redux store with provided data:');
              console.log('- Date:', dateStr);
              console.log('- New slot count:', data.updatedSlots.length);
              
              // Direct Redux update with the provided data
              dispatch(updateTransportsAndSlots({
                slotUpdates: slotUpdates,
                type: 'forceUpdate'
              }));
              
              console.log('🟢 Redux update dispatched!');
              
              // Now force a complete reload of data to ensure database consistency
              setTimeout(async () => {
                await doFetchAndUpdate();
              }, 500);
              
              return;
            }
          }
          
          // Longer delay for slot operations to ensure DB changes are completed
          const delay = (data?.type === 'slot-add' || data?.type === 'slot-delete') ? 500 : 200;
          console.log(`Waiting ${delay}ms before fetching latest data...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          
          // Now force an update
          console.log('🔄 Forcing data refresh from server...');
          await doFetchAndUpdate();
          console.log('✅ Data refresh completed');
          
        } catch (error) {
          console.error('❌ Error handling planning:update event:', error);
          
          if (isInPlanningPage) {
            showToastDebounced('Error updating planning data. Refreshing page...', 'error');
            
            // As a last resort, reload the page if we're having persistent update issues
            setTimeout(() => {
              if (typeof window !== 'undefined') {
                console.log('🔄 Forcing page reload as last resort');
                window.location.reload();
              }
            }, 2000);
          }
        }
      });
      
      console.log('Tüm Socket.IO dinleyicileri başarıyla kuruldu');
    };
    
    // Dinleyicileri kur
    setupListeners();
    
    // Bağlantı sağlandığında tüm verileri güncelle
    initializeData();
    
    // Cleanup function
    return () => {
      console.log('useRealTimeUpdates hook temizleniyor, tüm Socket.IO dinleyicileri kaldırılıyor');
      cleanupListeners();
      
      // Custom DOM event listenerını da temizle
      if (typeof window !== 'undefined') {
        window.removeEventListener('force-planning-update', forcePlanningUpdateHandler);
      }
    };
  }, [dispatch, isConnected, on, pathname, isInPlanningPage]);
};

export default useRealTimeUpdates;
