import { createSlice, createAsyncThunk, createAction } from '@reduxjs/toolkit';
import { startOfDay } from 'date-fns';

// Async thunk for fetching planning data
export const fetchPlanningData = createAsyncThunk(
  'planning/fetchPlanningData',
  async () => {
    try {
      const response = await fetch('/api/planning');
      if (!response.ok) {
        throw new Error('Network response was not ok');
      }
      const data = await response.json();

      // Destinations verilerini de include edelim
      const transportsWithDestinations = data.transports.map(transport => ({
        ...transport,
        destinations: transport.destinations?.sort((a, b) => a.order - b.order) || []
      }));

      return {
        ...data,
        transports: transportsWithDestinations
      };
    } catch (error) {
      throw error;
    }
  }
);

export const addSlot = createAsyncThunk(
  'planning/addSlot',
  async (date) => {
    const response = await fetch('/api/planning/slots', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ date }),
    });
    if (!response.ok) throw new Error('Failed to add slot');
    return response.json();
  }
);

export const removeSlot = createAsyncThunk(
  'planning/removeSlot',
  async (date) => {
    const response = await fetch(`/api/planning/slots?date=${date}`, {
      method: 'DELETE',
    });
    if (!response.ok) throw new Error('Failed to remove slot');
    return response.json();
  }
);

export const reorderSlots = createAsyncThunk(
  'planning/reorderSlots',
  async ({ date, oldIndex, newIndex }) => {
    try {
      const response = await fetch('/api/planning/slots/reorder', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date, oldIndex, newIndex }),
      });
      
      if (!response.ok) throw new Error('Failed to reorder slots');
      const result = await response.json();

      // Sadece slot'ları döndür, tüm veriyi yeniden fetch etme
      return result;
    } catch (error) {
      throw error;
    }
  }
);

export const addTransport = createAsyncThunk(
  'planning/addTransport',
  async (transportData) => {
    const response = await fetch('/api/planning/transports', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transportData),
    });
    if (!response.ok) throw new Error('Failed to add transport');
    return response.json();
  }
);

export const updateTransport = createAsyncThunk(
  'planning/updateTransport',
  async (transportData) => {
    try {
      const response = await fetch(`/api/planning/transports/${transportData.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transportData),
      });

      if (!response.ok) throw new Error('Failed to update transport');
      
      // Transport güncellemesinden sonra tüm planning verilerini yeniden yükle
      const planningResponse = await fetch('/api/planning');
      if (!planningResponse.ok) throw new Error('Failed to fetch planning data');
      const planningData = await planningResponse.json();
      
      return planningData;  // Tüm planning verilerini dön
    } catch (error) {
      throw error;
    }
  }
);

export const assignDriverToSlot = createAsyncThunk(
  'planning/assignDriverToSlot',
  async ({ slotId, driverId, date }) => {
    const response = await fetch(`/api/planning/slots/${slotId}/assign-driver`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ driverId, date }),
    });
    
    if (!response.ok) throw new Error('Failed to assign driver');
    return response.json();
  }
);

export const updateSlotDriver = createAction('planning/updateSlotDriver');

export const assignTruckToSlot = createAsyncThunk(
  'planning/assignTruckToSlot',
  async ({ slotId, truckId, date }) => {
    const response = await fetch(`/api/planning/slots/${slotId}/assign-truck`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ truckId, date }),
    });
    
    if (!response.ok) throw new Error('Failed to assign truck');
    return response.json();
  }
);

export const updateSlotTruck = createAction('planning/updateSlotTruck');

export const updateTransportStatus = createAsyncThunk(
  'planning/updateTransportStatus',
  async ({ transportId, status, dates }) => {
    console.log('Action payload:', { transportId, status, dates });
    const response = await fetch(`/api/planning/transports/${transportId}/status`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        status, 
        dates: dates ? {
          departureDate: dates.departureDate,
          returnDate: dates.returnDate,
          destinations: dates.destinations
        } : undefined 
      })
    });

    if (!response.ok) {
      throw new Error('Failed to update transport status');
    }

    return response.json();
  }
);

// Yeni action - Transport'un current status'ünü güncelle , PLANNED, ONGOING, COMPLETED DURUMLARI ICIN
export const updateTransportCurrentStatus = createAsyncThunk(
  'planning/updateTransportCurrentStatus',
  async ({ transportId, currentStatus, sentToDriver, sourceSlotId }) => {
    console.log('Mutation data:', { transportId, currentStatus, sentToDriver, sourceSlotId });
    const response = await fetch(`/api/planning/transports/${transportId}/status/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentStatus, sentToDriver, sourceSlotId })
    });

    if (!response.ok) {
      throw new Error('Failed to update transport current status');
    }

    return response.json();
  }
);

// Yeni action - Transport'un ETA'larını güncelle , PICKUP, DROP OFF, DESTINATIONS ICIN
export const updateTransportEtas = createAsyncThunk(
  'planning/updateTransportEtas',
  async ({ transportId, pickUpEta, dropOffEta, destinationEtas }) => {
    const response = await fetch(`/api/planning/transports/${transportId}/eta/update`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ pickUpEta, dropOffEta, destinationEtas })
    });

    if (!response.ok) {
      throw new Error('Failed to update transport ETAs');
    }

    return response.json();
  }
);

export const updateSlotDriverStartNote = createAction('planning/updateSlotDriverStartNote');

export const updateTransportTrailer = createAsyncThunk(
  'planning/updateTransportTrailer',
  async ({ transportId, trailerId }) => {
    const response = await fetch(`/api/planning/transports/${transportId}/trailer`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ trailerId }),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to update transport trailer');
    }
    
    return await response.json();
  }
);

// Slot pozisyonları doğrudan güncellemek için kullan (serverdan gelen verilerle)
export const optimisticReorderThunk = createAsyncThunk(
  'planning/optimisticReorderThunk',
  async (data, { getState, dispatch }) => {
    try {
      if (!data || !data.dateStr || !data.slots || !Array.isArray(data.slots)) {
        console.error('Invalid parameters for optimisticReorderThunk:', {
          hasDateStr: !!data?.dateStr,
          hasSlots: !!data?.slots,
          isSlotsArray: Array.isArray(data?.slots),
          slotCount: data?.slots?.length
        });
        throw new Error('Invalid parameters for optimisticReorderThunk');
      }

      const { dateStr, slots } = data;
      const state = getState();
      const { planning } = state;

      // İlk olarak verileri loglayalım
      console.log(`⚡ OPTIMISTIC REORDER for date ${dateStr} with ${slots.length} slots`);
      console.log('Received slots to apply:', slots.slice(0, 5).map(s => ({
        id: s.id,
        order: s.order,
        slotNumber: s.slotNumber
      })));

      // Mevcut tarih için slotları kontrol et
      const currentSlotsForDate = (planning.slots && planning.slots[dateStr]) || [];
      
      console.log(`Current state has ${currentSlotsForDate.length} slots for ${dateStr}`);
      if (currentSlotsForDate.length > 0) {
        console.log('Sample of current slots:', currentSlotsForDate.slice(0, 3).map(s => ({
          id: s.id,
          order: s.order,
          slotNumber: s.slotNumber,
          hasTransport: !!s.transportId
        })));
      }

      // Orijinal slotların ID'lerini eşleştirme objesi olarak oluştur
      const slotMap = {};
      currentSlotsForDate.forEach(slot => {
        slotMap[slot.id] = { ...slot };
      });

      // Yeni slotlar için ID referansları oluştur
      const updatedSlotMap = {};
      slots.forEach((slot, index) => {
        updatedSlotMap[slot.id] = { 
          ...slot,
          order: index, // Sıra numarasını güncelle
          slotNumber: `${index + 1}` // Slot numarasını güncelle
        };
      });

      console.log('Slot map created for current slots:', Object.keys(slotMap).length);
      console.log('Updated slot map for new positions:', Object.keys(updatedSlotMap).length);

      // Yeni sıraya göre slotları oluştur ve transport referanslarını koru
      const updatedSlots = slots.map((slot, index) => {
        // Orijinal slottan transport bilgilerini al
        const originalSlot = slotMap[slot.id] || {};
        
        // Yeni slot bilgilerini oluştur
        return {
          // Yeni slottan gelen kısımlar
          ...slot,
          // Sıra ve indeks değerlerini güncelle
          order: index,
          slotNumber: `${index + 1}`,
          // Orijinal slottan gelen transport referanslarını koru
          transportId: originalSlot.transportId || slot.transportId,
          transportRef: originalSlot.transportRef || slot.transportRef,
          driverId: originalSlot.driverId || slot.driverId,
          driverRef: originalSlot.driverRef || slot.driverRef, 
          truckId: originalSlot.truckId || slot.truckId,
          truckRef: originalSlot.truckRef || slot.truckRef,
          // Diğer transport verilerini koru
          transport: originalSlot.transport || slot.transport,
          // Transports dizisini orijinalden kopyala ya da boş dizi oluştur
          transports: Array.isArray(originalSlot.transports) ? [...originalSlot.transports] : []
        };
      });

      console.log(`Generated ${updatedSlots.length} updated slots for date ${dateStr}`);
      console.log('Sample of updated slots:', updatedSlots.slice(0, 3).map(s => ({
        id: s.id,
        order: s.order,
        slotNumber: s.slotNumber,
        hasTransport: !!s.transportId
      })));

      // Yeni slotları tarih anahtarına göre grupla
      return {
        dateStr,
        slots: updatedSlots,
      };
    } catch (error) {
      console.error('Error in optimisticReorderThunk:', error);
      throw error;
    }
  }
);

const initialState = {
  transports: [],
  drivers: [],
  trucks: [],
  trailers: [],
  clients: [],
  quays: [],
  loading: false,
  error: null,
  selectedDate: new Date().toISOString(),
  slots: {},
  filters: {
    driver: null,
    truck: null,
    trailer: null,
    status: 'all',
  },
};

export const planningSlice = createSlice({
  name: 'planning',
  initialState,
  reducers: {
    setSelectedDate(state, action) {
      state.selectedDate = action.payload;
    },
    setFilter(state, action) {
      state.filters[action.payload.key] = action.payload.value;
    },
    clearFilters(state) {
      state.filters = initialState.filters;
    },
    // Manuel olarak çekilen transport verilerini güncelleme
    updateExistingTransport(state, action) {
      const transport = action.payload;
      
      if (!transport || !transport.id) {
        console.error('Invalid transport data for updateExistingTransport:', transport);
        return;
      }
      
      console.log('Manuel olarak transport güncelleniyor:', {
        id: transport.id,
        orderNumber: transport.transportOrderNumber,
        containerNumber: transport.containerNumber,
        bookingRef: transport.bookingReference
      });
      
      // Transport varsa güncelle, yoksa ekle
      const index = state.transports.findIndex(t => t.id === transport.id);
      if (index !== -1) {
        state.transports[index] = {
          ...transport,
          // Önemli arama alanlarından emin ol
          transportOrderNumber: transport.transportOrderNumber || state.transports[index].transportOrderNumber,
          containerNumber: transport.containerNumber || state.transports[index].containerNumber,
          bookingReference: transport.bookingReference || state.transports[index].bookingReference,
          loadingReference: transport.loadingReference || state.transports[index].loadingReference
        };
        console.log('Transport güncellendi:', state.transports[index]);
      } else {
        state.transports.push(transport);
        console.log('Transport eklendi:', transport);
      }
      
      // Slotlardaki referansları da güncelle
      Object.keys(state.slots).forEach(dateStr => {
        state.slots[dateStr] = state.slots[dateStr].map(slot => ({
          ...slot,
          transports: slot.transports.map(ts => 
            ts.transport.id === transport.id
              ? { ...ts, transport }
              : ts
          )
        }));
      });
    },
    // Yeni reducer: Transport'u tüm slotlardan kaldır
    REMOVE_TRANSPORT_FROM_ALL_SLOTS(state, action) {
      const transportId = action.payload;
      console.log(`🧹 planningSlice: Transport ${transportId} tüm slotlardan kaldırılıyor...`);
      
      if (!transportId) {
        console.error('REMOVE_TRANSPORT_FROM_ALL_SLOTS: Geçersiz transport ID');
        return;
      }
      
      // Önce transports state'inden transportu kaldır
      state.transports = state.transports.filter(t => t.id !== transportId);
      
      // Sonra tüm tarihler için slot'ları kontrol et ve transport'u kaldır
      Object.keys(state.slots).forEach(dateStr => {
        if (state.slots[dateStr] && Array.isArray(state.slots[dateStr])) {
          // Slot'un kendi alanlarını kontrol et
          state.slots[dateStr] = state.slots[dateStr].map(slot => {
            // Slot'un transportId alanını kontrol et
            if (slot.transportId === transportId) {
              console.log(`Slot ${slot.id}'nin transportId alanı temizleniyor`);
              slot.transportId = null;
              slot.transport = null;
            }
            
            // Slot'un transports dizisini filterele
            if (Array.isArray(slot.transports)) {
              const prevLength = slot.transports.length;
              slot.transports = slot.transports.filter(t => {
                // Transport ID veya transport referansı üzerindeki ID'yi kontrol et
                const currentTransportId = t.transportId || (t.transport && t.transport.id);
                return currentTransportId !== transportId;
              });
              
              const newLength = slot.transports.length;
              if (prevLength !== newLength) {
                console.log(`Slot ${slot.id}'den transport kaldırıldı (${prevLength} -> ${newLength})`);
              }
            }
            
            return slot;
          });
        }
      });
      
      console.log(`✅ Transport ${transportId} tüm slotlardan başarıyla kaldırıldı`);
    },
    optimisticReorder(state, action) {
      try {
        const { dateStr, slots } = action.payload;
        
        console.log('⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓⇓');
        console.log(`optimisticReorder START: ${dateStr} için ${slots?.length || 0} slot güncelleniyor`);
        
        // Gerekli parametreleri kontrol et
        if (!dateStr) {
          console.error('optimisticReorder: dateStr parametresi eksik veya geçersiz');
          return;
        }
        
        if (!slots || !Array.isArray(slots) || slots.length === 0) {
          console.error(`optimisticReorder: ${dateStr} için geçersiz slot verisi`, slots);
          return;
        }
        
        // Slot verilerini JSON olarak logla
        console.log('First 2 slots data sample:', JSON.stringify(slots.slice(0, 2), null, 2));
        
        // Debug: Tarih anahtarı kontrolü
        console.log('State slots date keys:', Object.keys(state.slots).slice(0, 5));
        console.log(`Updating for date key: ${dateStr}`);
        
        // State'te bu tarih için slot verisi yoksa oluştur
        if (!state.slots[dateStr]) {
          console.log(`${dateStr} için slots dizisi oluşturuluyor!`);
          state.slots[dateStr] = [];
        }
        
        // Slot'ları order'a göre sırala (ek güvenlik önlemi)
        const sortedSlots = [...slots].sort((a, b) => {
          const aOrder = (typeof a.order === 'number') ? a.order : 
                        (typeof a.slotNumber === 'number' ? a.slotNumber - 1 : 0);
          const bOrder = (typeof b.order === 'number') ? b.order : 
                        (typeof b.slotNumber === 'number' ? b.slotNumber - 1 : 0);
          return aOrder - bOrder;
        });
        
        console.log(`Slots sıralandı! İlk slot ID: ${sortedSlots[0]?.id || 'none'}`);
        
        // Her slot için yeni sıra ve diğer değerleri ayarla
        const processedSlots = sortedSlots.map((slot, index) => {
          // Temel slot verisi
          const updatedSlot = {
            ...slot,
            order: index,
            slotNumber: index + 1
          };
          
          // Transport verilerini işle
          if (Array.isArray(slot.transports)) {
            updatedSlot.transports = slot.transports.map(ts => {
              // Transport verisi geçerli değilse, boş transport ile devam et
              if (!ts || !ts.transport || !ts.transport.id) {
                console.warn(`Geçersiz transport verisi slot ${slot.id} içinde!`);
                return { transport: {} };
              }
              
              // Transport ID'yi kullanarak mevcut transport verisiyle birleştir
              const transportId = ts.transport.id;
              const existingTransport = state.transports.find(t => t.id === transportId);
              
              if (existingTransport) {
                return {
                  ...ts,
                  transport: {
                    ...existingTransport,
                    ...ts.transport // Gelen veriyi öncelikli kıl
                  }
                };
              }
              
              return ts; // Eşleşen transport yoksa olduğu gibi kullan
            });
          } else {
            updatedSlot.transports = [];
          }
          
          return updatedSlot;
        });
        
        // Güncellenen slot'ları state'e yaz
        state.slots[dateStr] = processedSlots;
        
        console.log(`optimisticReorder SUCCESS: ${dateStr} için ${processedSlots.length} slot güncellendi`);
        console.log('⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑⇑');
      } catch (error) {
        console.error('optimisticReorder işleminde hata:', error);
        console.error('Hata detayı:', error.stack);
      }
    },
    updateTransportAssignment(state, action) {
      const { transportId, slotId, transports } = action.payload;
      state.transports = transports;
      
      // Slot'ları da güncelle
      Object.keys(state.slots).forEach(dateStr => {
        state.slots[dateStr] = state.slots[dateStr].map(slot => {
          if (slot.id === slotId) {
            return {
              ...slot,
              transports: [...(slot.transports || []), transports.find(t => t.id === transportId)]
            };
          }
          return slot;
        });
      });
    },
    updateTransportsAndSlots(state, action) {
      try {
        const { transportUpdates, slotUpdates, type } = action.payload;
        console.log('🔄 updateTransportsAndSlots çalıştırılıyor:', {
          type,
          transportCount: transportUpdates?.length || 0,
          slotUpdatesType: typeof slotUpdates
        });
        
        // Transport güncellemeleri
        if (transportUpdates && transportUpdates.length > 0) {
          if (type === 'add') {
            // Yeni transport ekle
            transportUpdates.forEach(transport => {
              if (!state.transports.some(t => t.id === transport.id)) {
                state.transports.push(transport);
              }
            });
          } else if (type === 'update' || type === 'forceUpdate') {
            // Transport güncelle
            transportUpdates.forEach(updatedTransport => {
              console.log('Transport güncelleniyor:', {
                id: updatedTransport.id,
                slotAssignments: updatedTransport.slotAssignments?.length || 0,
                destinations: updatedTransport.destinations?.length || 0
              });
              
              // Mevcut transport'u bul
              const existingIndex = state.transports.findIndex(t => t.id === updatedTransport.id);
              
              if (existingIndex !== -1) {
                // Mevcut transport'u bul
                const existingTransport = state.transports[existingIndex];
                
                // Önemli: Transportu komple güncelle
                state.transports[existingIndex] = {
                  ...updatedTransport,
                  // Socket.IO'ten gelmeyen kritik alanları koru
                  notes: updatedTransport.notes || existingTransport.notes,
                  // Gelen yeni veriler varsa onları kullan, yoksa mevcut verileri koru
                  destinations: updatedTransport.destinations || existingTransport.destinations,
                  slotAssignments: updatedTransport.slotAssignments || existingTransport.slotAssignments
                };
                
                // Transport'u tüm slotlardan kaldır, sonra güncel slotAssignments'a göre ekleriz
                Object.keys(state.slots).forEach(dateStr => {
                  state.slots[dateStr] = state.slots[dateStr].map(slot => ({
                    ...slot,
                    transports: slot.transports.filter(ts => ts.transport?.id !== updatedTransport.id)
                  }));
                });
                
                // Transport'u yeni slot atamalarına ekle
                if (updatedTransport.slotAssignments && updatedTransport.slotAssignments.length > 0) {
                  updatedTransport.slotAssignments.forEach(assignment => {
                    const assignmentDateStr = startOfDay(new Date(assignment.date)).toISOString();
                    
                    if (state.slots[assignmentDateStr]) {
                      // Slot'u bul ve transport'u ekle
                      state.slots[assignmentDateStr] = state.slots[assignmentDateStr].map(slot => {
                        if (slot.id === assignment.slotId) {
                          return {
                            ...slot,
                            transports: [...slot.transports.filter(ts => ts.transport?.id !== updatedTransport.id), {
                              transportId: updatedTransport.id,
                              slotId: slot.id,
                              date: assignmentDateStr,
                              slotOrder: assignment.slotOrder || 0,
                              transport: state.transports[existingIndex]
                            }]
                          };
                        }
                        return slot;
                      });
                    }
                  });
                }
              } else {
                // Eğer transport henüz state'de yoksa ekle
                state.transports.push(updatedTransport);
              }
            });
          } else if (type === 'remove') {
            // Transport'u kaldır
            transportUpdates.forEach(transport => {
              state.transports = state.transports.filter(t => t.id !== transport.id);
              
              // Slot içindeki transport referanslarını da kaldır
              Object.keys(state.slots).forEach(dateStr => {
                state.slots[dateStr] = state.slots[dateStr].map(slot => ({
                  ...slot,
                  transports: slot.transports.filter(ts => ts.transport?.id !== transport.id)
                }));
              });
            });
          }
        }
        
        // Slot güncellemeleri - API'den gelen veri yapısına göre işlem yap
        console.log('Slot updates check:', {
          isObject: typeof slotUpdates === 'object', 
          isArray: Array.isArray(slotUpdates),
          hasSlotUpdates: !!slotUpdates,
          slotUpdateKeys: slotUpdates ? Object.keys(slotUpdates).length : 0
        });
        
        // 1. Durum: slotUpdates bir obje olarak gelmiş (API'den)
        // Örnek: { "2023-05-01T00:00:00.000Z": [slot1, slot2, ...] }
        if (slotUpdates && typeof slotUpdates === 'object' && !Array.isArray(slotUpdates)) {
          console.log('Processing object-format slot updates with keys:', Object.keys(slotUpdates));
          
          if (type === 'forceUpdate') {
            // Doğrudan tüm slot verilerini değiştir
            console.log('Tüm slot verileri zorla değiştiriliyor', {
              mevcut: Object.keys(state.slots || {}).length,
              yeni: Object.keys(slotUpdates).length
            });
            
            // Doğrudan atama
            state.slots = { ...slotUpdates };
          } else {
            // Her bir tarih anahtarı için slotları güncelle
            Object.keys(slotUpdates).forEach(dateStr => {
              const slotsForDate = slotUpdates[dateStr];
              
              if (!Array.isArray(slotsForDate)) {
                console.warn(`${dateStr} için slot verisi dizi değil:`, slotsForDate);
                return;
              }
              
              console.log(`${dateStr} için ${slotsForDate.length} slot güncelleniyor...`);
              
              // Tarih anahtarı için slots dizisi yoksa oluştur
              if (!state.slots[dateStr]) {
                state.slots[dateStr] = [];
              }
              
              // Slotları güncelle veya ekle
              slotsForDate.forEach(updatedSlot => {
                const existingIndex = state.slots[dateStr].findIndex(s => s.id === updatedSlot.id);
                
                if (existingIndex !== -1) {
                  // Mevcut slot'u güncelle, transport'ları koru
                  state.slots[dateStr][existingIndex] = {
                    ...state.slots[dateStr][existingIndex],
                    ...updatedSlot,
                    transports: updatedSlot.transports || state.slots[dateStr][existingIndex].transports
                  };
                } else {
                  // Yeni slot ekle
                  state.slots[dateStr].push({
                    ...updatedSlot,
                    transports: updatedSlot.transports || []
                  });
                }
              });
              
              // Sıralama düzenini kontrol et
              state.slots[dateStr].sort((a, b) => {
                const aOrder = typeof a.order === 'number' ? a.order : 0;
                const bOrder = typeof b.order === 'number' ? b.order : 0;
                return aOrder - bOrder;
              });
            });
          }
          console.log('Slot güncellemesi tamamlandı, tarihler:', Object.keys(state.slots));
        } 
        // 2. Durum: slotUpdates bir dizi olarak gelmiş (Socket.IO'dan)
        else if (slotUpdates && Array.isArray(slotUpdates)) {
          console.log('Processing array-format slot updates with length:', slotUpdates.length);
          
          // Gelen verileri tarih bazında grupla
          const slotsByDate = {};
          
          slotUpdates.forEach(slot => {
            if (!slot.date) {
              console.error('Slot için tarih bilgisi eksik:', slot);
              return;
            }
            
            const dateStr = startOfDay(new Date(slot.date)).toISOString();
            
            if (!slotsByDate[dateStr]) {
              slotsByDate[dateStr] = [];
            }
            
            slotsByDate[dateStr].push(slot);
          });
          
          // Gruplandırılmış verileri state'e uygula
          Object.keys(slotsByDate).forEach(dateStr => {
            const slots = slotsByDate[dateStr];
            
            if (type === 'add') {
              // Yeni slotlar ekle
              if (!state.slots[dateStr]) {
                state.slots[dateStr] = [];
              }
              
              slots.forEach(slot => {
                if (!state.slots[dateStr].some(s => s.id === slot.id)) {
                  state.slots[dateStr].push({
                    ...slot,
                    transports: slot.transports || []
                  });
                }
              });
            } else if (type === 'update') {
              // Mevcut slotları güncelle
              if (state.slots[dateStr]) {
                slots.forEach(updatedSlot => {
                  state.slots[dateStr] = state.slots[dateStr].map(s => 
                    s.id === updatedSlot.id 
                      ? { 
                          ...s, 
                          ...updatedSlot,
                          transports: updatedSlot.transports || s.transports 
                        }
                      : s
                  );
                });
              }
            } else if (type === 'remove') {
              // Slotları kaldır
              if (state.slots[dateStr]) {
                slots.forEach(slotToRemove => {
                  state.slots[dateStr] = state.slots[dateStr].filter(s => s.id !== slotToRemove.id);
                });
              }
            }
          });
          
          console.log('Array-format slot güncellemesi tamamlandı, tarihler:', Object.keys(slotsByDate));
        }
      } catch (error) {
        console.error('updateTransportsAndSlots reducer hatası:', error);
        console.error('Hata detayı:', error.stack);
      }
    },
    updateSlotTransports: (state, action) => {
      const { dateStr, slotId, updatedTransports } = action.payload;
      
      if (state.slots[dateStr]) {
        state.slots[dateStr] = state.slots[dateStr].map(slot => {
          if (slot.id === slotId) {
            return {
              ...slot,
              transports: updatedTransports.map(t => ({
                transportId: t.id,
                slotId: slot.id,
                date: dateStr,
                slotOrder: t.slotOrder,
                transport: t
              }))
            };
          }
          return slot;
        });
      }
    },
    addTransport: (state, action) => {
      state.transports.push(action.payload);
    },
    updateTransport: (state, action) => {
      const updatedTransport = action.payload;
      
      // Önce mevcut transport'u bul
      const existingTransport = state.transports.find(t => t.id === updatedTransport.id);
      
      if (existingTransport) {
        // Quay değişikliği kontrolü
        const isPickUpQuayChanged = existingTransport.pickUpQuayId !== updatedTransport.pickUpQuayId;
        const isDropOffQuayChanged = existingTransport.dropOffQuayId !== updatedTransport.dropOffQuayId;

        // Quay değişmediyse mevcut TAR değerlerini koru
        const updatedTransportWithTar = {
          ...updatedTransport,
          pickUpTar: isPickUpQuayChanged ? null : existingTransport.pickUpTar,
          dropOffTar: isDropOffQuayChanged ? null : existingTransport.dropOffTar,
          // Mevcut ETA değerlerini koru
          pickUpEta: existingTransport.pickUpEta,
          dropOffEta: existingTransport.dropOffEta,
          destinations: updatedTransport.destinations.map(dest => {
            const existingDest = existingTransport.destinations.find(d => d.id === dest.id);
            return {
              ...dest,
              eta: existingDest?.eta || dest.eta
            };
          })
        };

        // Transport listesini güncelle
        state.transports = state.transports.map(t =>
          t.id === updatedTransport.id ? updatedTransportWithTar : t
        );

        // Slot'lardaki transport'ları güncelle
        Object.keys(state.slots).forEach(dateStr => {
          state.slots[dateStr] = state.slots[dateStr].map(slot => {
            return {
              ...slot,
              transports: slot.transports.map(ts => {
                return ts.transport.id === updatedTransport.id
                  ? { ...ts, transport: updatedTransportWithTar }
                  : ts;
              })
            };
          });
        });
      }
    },
    updateSlotDriver: (state, action) => {
      const { dateStr, slotId, driverId } = action.payload;
      // Slot'u güncelle
      if (state.slots[dateStr]) {
        state.slots[dateStr] = state.slots[dateStr].map(slot => 
          slot.id === slotId 
            ? { 
                ...slot, 
                driverId, 
                driver: driverId ? state.drivers.find(d => d.id === driverId) : null 
              }
            : slot
        );
      }
    },
    assignDriverToSlot: (state, action) => {
      const { slotId, driverId, date } = action.payload;
      // Slot'u güncelle
      if (state.slots[date]) {
        state.slots[date] = state.slots[date].map(slot => 
          slot.id === slotId 
            ? { ...slot, driverId, driver: state.drivers.find(d => d.id === driverId) }
            : slot
        );
      }
    },
    deleteTransport: (state, action) => {
      const transportId = action.payload;
      
      // Transports listesinden sil
      state.transports = state.transports.filter(t => t.id !== transportId);
      
      // Slot'lardan da sil
      Object.keys(state.slots).forEach(dateStr => {
        state.slots[dateStr] = state.slots[dateStr].map(slot => {
          return {
            ...slot,
            transports: slot.transports.filter(ts => ts.transport.id !== transportId)
          };
        });
      });
    },
    updateSlotDriverStartNote: (state, action) => {
      try {
        const { dateStr, slotId, driverStartNote } = action.payload;
        
        console.log('PLANNING REDUCER: Updating slot driver start note:', {
          dateStr,
          slotId,
          driverStartNote,
          hasSlotsForDate: !!dateStr && !!state.slots[dateStr]
        });
        
        // Tarih için slot verisini kontrol et
        if (dateStr && state.slots[dateStr]) {
          // Slot'u bul
          const slotIndex = state.slots[dateStr].findIndex(slot => slot.id === slotId);
          
          if (slotIndex !== -1) {
            console.log(`PLANNING REDUCER: Slot bulundu, tarih: ${dateStr}, slot ID: ${slotId}, eski değer: ${state.slots[dateStr][slotIndex].driverStartNote}, yeni değer: ${driverStartNote}`);
            
            // Driver start note alanını güncelle - undefined/null durumlarında boş string kullan
            state.slots[dateStr][slotIndex].driverStartNote = driverStartNote === null || driverStartNote === undefined ? '' : driverStartNote;
            
            console.log(`PLANNING REDUCER: Güncelleme tamamlandı, yeni değer: ${state.slots[dateStr][slotIndex].driverStartNote}`);
          } else {
            console.warn(`PLANNING REDUCER: Slot bulunamadı, tarih: ${dateStr}, slot ID: ${slotId}`);
          }
        } else {
          console.warn(`PLANNING REDUCER: Bu tarih için slot verisi bulunamadı: ${dateStr}`);
        }
      } catch (error) {
        console.error('PLANNING REDUCER: Driver start note güncellenirken hata:', error);
      }
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchPlanningData.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPlanningData.fulfilled, (state, action) => {
        state.loading = false;
        // Destinations verilerini de state'e ekleyelim
        state.transports = action.payload.transports;
        state.drivers = action.payload.drivers;
        state.trucks = action.payload.trucks;
        state.trailers = action.payload.trailers;
        state.clients = action.payload.clients;
        state.quays = action.payload.quays;

        // Slot'ları tarih bazında grupla
        const slotsByDate = {};
        action.payload.slots.forEach(slot => {
          const dateStr = startOfDay(new Date(slot.date)).toISOString();
          if (!slotsByDate[dateStr]) {
            slotsByDate[dateStr] = [];
          }

          // Transport'ları sıralı olarak ekle
          const sortedTransports = slot.transports?.sort((a, b) => a.slotOrder - b.slotOrder) || [];
          
          slotsByDate[dateStr].push({
            ...slot,
            transports: sortedTransports
          });
        });

        state.slots = slotsByDate;
      })
      .addCase(fetchPlanningData.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
      })
      .addCase(addSlot.fulfilled, (state, action) => {
        const { slots } = action.payload;
        const dateStr = startOfDay(new Date(slots[0].date)).toISOString();
        
        // O tarihteki tüm slot'ları güncelle, ancak transport'ların trailer bilgilerini koru
        state.slots[dateStr] = slots.map(slot => {
          // Slot'taki her transport için
          const updatedTransports = slot.transports.map(ts => {
            // Eğer transport state'de varsa, state'deki trailer bilgisini kullan
            const existingTransport = state.transports.find(t => t.id === ts.transport.id);
            if (existingTransport && existingTransport.trailer) {
              return {
                ...ts,
                transport: {
                  ...ts.transport,
                  trailer: existingTransport.trailer
                }
              };
            }
            return ts;
          });
          
          return {
            ...slot,
            transports: updatedTransports
          };
        });
      })
      .addCase(removeSlot.fulfilled, (state, action) => {
        const dateStr = startOfDay(new Date(action.payload.slot.date)).toISOString();
        if (state.slots[dateStr]?.length > 0) {
          // Son slot'u kaldır
          state.slots[dateStr].pop();
          
          // Unassign edilen transport'ların trailer bilgilerini koru
          if (action.payload.unassignedTransports && action.payload.unassignedTransports.length > 0) {
            action.payload.unassignedTransports.forEach(ts => {
              const transportId = ts.transportId;
              // State'deki transport'u bul ve güncelle
              const transportIndex = state.transports.findIndex(t => t.id === transportId);
              if (transportIndex !== -1) {
                // Trailer bilgisini koru
                const existingTrailer = state.transports[transportIndex].trailer;
                if (existingTrailer) {
                  state.transports[transportIndex] = {
                    ...state.transports[transportIndex],
                    trailer: existingTrailer
                  };
                }
              }
            });
          }
        }
      })
      .addCase(reorderSlots.fulfilled, (state, action) => {
        // Sadece ilgili tarihteki slot'ları güncelle
        if (action.payload.slots) {
          const updatedSlots = action.payload.slots;
          const dateStr = Object.keys(updatedSlots)[0];
          if (dateStr && state.slots[dateStr]) {
            // Transport ve destination verilerini koruyarak güncelle
            state.slots[dateStr] = updatedSlots[dateStr].map(slot => ({
              ...slot,
              transports: slot.transports?.map(transport => ({
                ...transport,
                destinations: transport.destinations?.sort((a, b) => a.order - b.order) || []
              })) || []
            }));
          }
        }
      })
      .addCase(reorderSlots.rejected, (state, action) => {
        console.error('Failed to reorder slots:', action.error);
      })
      .addCase(addTransport.fulfilled, (state, action) => {
        const transport = action.payload;
        
        // Transport'u state'e ekle
        state.transports.push(transport);
      })
      .addCase(updateTransport.fulfilled, (state, action) => {
        const updatedTransport = action.payload;
        
        // Transports listesini güncelle
        state.transports = state.transports.map(t => 
          t.id === updatedTransport.id ? updatedTransport : t
        );
        
        // Slot'ları güncelle
        Object.keys(state.slots).forEach(dateStr => {
          state.slots[dateStr] = state.slots[dateStr].map(slot => ({
            ...slot,
            transports: slot.transports
              .filter(ts => ts.transport.id !== updatedTransport.id)
          }));
        });
      })
      .addCase(optimisticReorderThunk.fulfilled, (state, action) => {
        const { dateStr, slots } = action.payload;
        
        // Slots tarih anahtarını oluştur gerekirse
        if (!state.slots) {
          state.slots = {};
        }
        
        // Verilen tarih için slot dizisi oluştur gerekirse
        if (!state.slots[dateStr]) {
          state.slots[dateStr] = [];
        }
        
        // Mevcut slotların kopyasını al
        const currentSlots = [...(state.slots[dateStr] || [])];
        
        // Varsa mevcut slotları loglayalım
        console.log(`Redux state before update has ${currentSlots.length} slots for ${dateStr}`);
        
        // Güncellenmiş slotları loglayalım
        console.log(`Updating Redux state with ${slots.length} slots for ${dateStr}`);
        if (slots.length > 0) {
          console.log('Sample slots to be applied:', slots.slice(0, 3).map(s => ({
            id: s.id, 
            order: s.order,
            slotNumber: s.slotNumber
          })));
        }
        
        // Slotları doğru sıra ile uygula - sıralanmış şekilde
        state.slots[dateStr] = slots.sort((a, b) => a.order - b.order);
        
        // Başarılı olduğunda yükleme durumlarını sıfırla
        state.loading = false;
        state.error = null;
        
        // İşlem bittiğinde loglama yap
        console.log(`✅ OPTIMISTIC REORDER SUCCESS: Updated ${slots.length} slots for ${dateStr}`);
      })
      .addCase(optimisticReorderThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message;
        console.error('❌ OPTIMISTIC REORDER FAILED:', action.error.message);
      })
      .addCase(updateSlotTransports, (state, action) => {
        const { dateStr, slotId, updatedTransports } = action.payload;
        
        if (state.slots[dateStr]) {
          state.slots[dateStr] = state.slots[dateStr].map(slot => {
            if (slot.id === slotId) {
              return {
                ...slot,
                transports: updatedTransports.map(t => ({
                  transportId: t.id,
                  slotId: slot.id,
                  date: dateStr,
                  slotOrder: t.slotOrder,
                  transport: t
                }))
              };
            }
            return slot;
          });
        }
      })
      .addCase(updateSlotDriver, (state, action) => {
        const { dateStr, slotId, driverId } = action.payload;
        
        if (state.slots[dateStr]) {
          state.slots[dateStr] = state.slots[dateStr].map(slot =>
            slot.id === slotId ? { ...slot, driverId } : slot
          );
        }
      })
      .addCase(assignTruckToSlot.fulfilled, (state, action) => {
        const updatedSlot = action.payload;
        const dateStr = new Date(updatedSlot.date).toISOString().split('T')[0];
        
        if (state.slots[dateStr]) {
          state.slots[dateStr] = state.slots[dateStr].map(slot => 
            slot.id === updatedSlot.id 
              ? { ...slot, truckId: updatedSlot.truckId }
              : slot
          );
        }
      })
      .addCase(updateSlotTruck, (state, action) => {
        const { dateStr, slotId, truckId } = action.payload;
        
        if (state.slots[dateStr]) {
          state.slots[dateStr] = state.slots[dateStr].map(slot =>
            slot.id === slotId ? { 
              ...slot, 
              truckId,
              truck: truckId ? state.trucks.find(t => t.id === truckId) : null
            } : slot
          );
        }
      })
      .addCase(updateTransportStatus.fulfilled, (state, action) => {
        const updatedTransport = action.payload;
        
        // Transport bilgilerini loglayalım
        console.log('Transport status güncellendi:', {
          id: updatedTransport.id,
          status: updatedTransport.status,
          orderNumber: updatedTransport.transportOrderNumber
        });
        
        // Transport listesini güncelle
        state.transports = state.transports.map(t => {
          if (t.id === updatedTransport.id) {
            // ON_HOLD'dan ACTIVE'e geçerken tüm field'ları koru
            if (t.status === 'ON_HOLD' && updatedTransport.status === 'ACTIVE') {
              return {
                ...updatedTransport,
                // Arama için önemli alanları eski değerlerden al
                transportOrderNumber: updatedTransport.transportOrderNumber || t.transportOrderNumber,
                containerNumber: updatedTransport.containerNumber || t.containerNumber,
                bookingReference: updatedTransport.bookingReference || t.bookingReference,
                loadingReference: updatedTransport.loadingReference || t.loadingReference
              };
            }
            return updatedTransport;
          }
          return t;
        });

        // ON_HOLD durumuna alınan transport'u tüm slot'lardan kaldır
        if (updatedTransport.status === "ON_HOLD") {
          Object.keys(state.slots).forEach(dateStr => {
            state.slots[dateStr] = state.slots[dateStr].map(slot => ({
              ...slot,
              transports: slot.transports.filter(t => 
                t.transport.id !== updatedTransport.id
              )
            }));
          });
        }
      })
      .addCase(updateTransportCurrentStatus.pending, (state, action) => {
        // While the action is pending, do an optimistic update immediately
        // Extract the transportId and sentToDriver from the action meta
        const { transportId, currentStatus, sentToDriver } = action.meta.arg;
        
        // Apply optimistic update to transports array immediately
        state.transports = state.transports.map(t => {
          if (t.id === transportId) {
            return {
              ...t,
              currentStatus: currentStatus || t.currentStatus,
              sentToDriver: sentToDriver !== undefined ? sentToDriver : t.sentToDriver
            };
          }
          return t;
        });
        
        // Also update in slots immediately for UI refresh
        Object.keys(state.slots).forEach(dateStr => {
          state.slots[dateStr] = state.slots[dateStr].map(slot => ({
            ...slot,
            transports: slot.transports.map(ts => {
              if (ts.transport.id === transportId) {
                return {
                  ...ts,
                  transport: {
                    ...ts.transport,
                    currentStatus: currentStatus || ts.transport.currentStatus,
                    sentToDriver: sentToDriver !== undefined ? sentToDriver : ts.transport.sentToDriver
                  }
                };
              }
              return ts;
            })
          }));
        });
      })
      .addCase(updateTransportCurrentStatus.fulfilled, (state, action) => {
        const updatedTransport = action.payload;
        // Transports listesini güncelle
        state.transports = state.transports.map(t => 
          t.id === updatedTransport.id ? updatedTransport : t
        );
        
        // Slots içindeki transport'ları da güncelle
        Object.keys(state.slots).forEach(dateStr => {
          state.slots[dateStr] = state.slots[dateStr].map(slot => ({
            ...slot,
            transports: slot.transports.map(ts => 
              ts.transport.id === updatedTransport.id 
                ? { ...ts, transport: updatedTransport }
                : ts
            )
          }));
        });
      })
      .addCase(updateTransportEtas.fulfilled, (state, action) => {
        const updatedTransport = action.payload;
        // Transports listesini güncelle
        state.transports = state.transports.map(t => 
          t.id === updatedTransport.id ? updatedTransport : t
        );
        
        // Slots içindeki transport'ları da güncelle
        Object.keys(state.slots).forEach(dateStr => {
          state.slots[dateStr] = state.slots[dateStr].map(slot => ({
            ...slot,
            transports: slot.transports.map(ts => 
              ts.transport.id === updatedTransport.id 
                ? { 
                    ...ts, 
                    transport: {
                      ...updatedTransport,
                      destinations: updatedTransport.destinations.map(dest => ({
                        ...dest,
                        eta: dest.eta // ETA'ları koru
                      }))
                    }
                  }
                : ts
            )
          }));
        });
      })
      .addCase(updateTransportTrailer.fulfilled, (state, action) => {
        const updatedTransport = action.payload;
        state.transports = state.transports.map(t =>
          t.id === updatedTransport.id ? updatedTransport : t
        );
        
        // Also update the transport in slots
        Object.keys(state.slots).forEach(dateStr => {
          state.slots[dateStr] = state.slots[dateStr].map(slot => ({
            ...slot,
            transports: slot.transports.map(ts => 
              ts.transport.id === updatedTransport.id 
                ? { ...ts, transport: updatedTransport }
                : ts
            )
          }));
        });
      });
  },
});

export const { setSelectedDate, setFilter, clearFilters, updateTransportAssignment, updateSlotTransports, updateTransportsAndSlots, updateExistingTransport } = planningSlice.actions;
export default planningSlice.reducer; 