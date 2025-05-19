'use client';
import { useAppSelector, useAppDispatch } from '@/hooks/redux';
import { addSlot, removeSlot, reorderSlots, setSelectedDate, fetchPlanningData, optimisticReorderThunk, optimisticTransportAssign, updateSlotTransports, addTransport, updateTransportStatus, updateTransportCurrentStatus, updateTransportEtas, updateTransportTrailer, updateTransportsAndSlots } from '@/redux/features/planningSlice';
import { format, startOfDay, addDays, isSameDay } from 'date-fns';
import { FiPlusCircle, FiMinusCircle, FiPlus, FiMove, FiAlertCircle, FiMapPin, FiCalendar, FiChevronLeft, FiChevronRight, FiPause, FiInbox, FiAlertTriangle } from 'react-icons/fi';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragOverlay, rectIntersection, useDroppable } from '@dnd-kit/core';
import { restrictToVerticalAxis, restrictToWindowEdges } from '@dnd-kit/modifiers';
import { SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, horizontalListSortingStrategy } from '@dnd-kit/sortable';
import SortableSlot from './SortableSlot';
import { useState, useEffect, useRef, useCallback } from 'react';
import TransportForm from '@/components/forms/TransportForm';
import Modal from '@/components/Modal';
import DraggableTransport from './DraggableTransport';
import ConfirmationModal from '@/components/ConfirmationModal';
import { toast } from 'react-toastify';
import { planningValidations, handleValidationResults } from '@/services/validations/planningValidations';
import PlanningCalendar from './PlanningCalendar';
import OnHoldTransportsModal from './OnHoldTransportsModal';
import ActivateTransportModal from './ActivateTransportModal';
import UnassignDriverConfirmModal from './UnassignDriverConfirmModal';
import { scroller } from 'react-scroll';
import { useSelector } from 'react-redux';
import Spinner from '@/components/Spinner';

const TransportsList = ({ 
  selectedSlotNumber, 
  setSelectedSlotNumber,
  highlightedTransports = [],
  isOnHoldModalOpen = false,
  setIsOnHoldModalOpen
}) => {
  const dispatch = useAppDispatch();
  const { transports, selectedDate, slots, drivers, trucks } = useAppSelector(state => state.planning);
  const currentDateStr = startOfDay(new Date(selectedDate)).toISOString();
  const currentSlots = slots[currentDateStr] || [];
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [activeId, setActiveId] = useState(null);
  const [activeDragData, setActiveDragData] = useState(null);
  const [isReordering, setIsReordering] = useState(false);
  const [editingTransport, setEditingTransport] = useState(null);
  const [unassignConfirmation, setUnassignConfirmation] = useState({
    isOpen: false,
    transportId: null,
    transportData: null
  });
  const [reorderingSlotId, setReorderingSlotId] = useState(null);
  const [deleteSlotConfirmation, setDeleteSlotConfirmation] = useState({
    isOpen: false,
    slot: null
  });
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [transportToDelete, setTransportToDelete] = useState(null);
  const [activatingTransport, setActivatingTransport] = useState(null);
  const [showHoldModal, setShowHoldModal] = useState(false);
  const [transportToHold, setTransportToHold] = useState(null);
  const [unassignModalConfig, setUnassignModalConfig] = useState({
    isOpen: false,
    transportData: null,
    onConfirm: null
  });
  const [isSetSlotsModalOpen, setIsSetSlotsModalOpen] = useState(false);
  const [totalSlotCount, setTotalSlotCount] = useState(0);
  const [isSettingSlots, setIsSettingSlots] = useState(false);
  const [showSetTotalSlotsModal, setShowSetTotalSlotsModal] = useState(false);
  const [isDateChanging, setIsDateChanging] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        delay: 0,
        tolerance: 5,
        distance: 10,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const filteredTransports = transports.filter(transport => {
    const hasDestinationOnDate = transport.destinations?.some(dest => 
      startOfDay(new Date(dest.destinationDate)).getTime() === startOfDay(new Date(selectedDate)).getTime()
    ) || false;

    const isDepartureDate = transport.departureDate && 
      startOfDay(new Date(transport.departureDate)).getTime() === startOfDay(new Date(selectedDate)).getTime();

    const isReturnDate = transport.returnDate && 
      startOfDay(new Date(transport.returnDate)).getTime() === startOfDay(new Date(selectedDate)).getTime();

    const isInDateRange = transport.departureDate && transport.returnDate && 
      new Date(selectedDate) >= startOfDay(new Date(transport.departureDate)) && 
      new Date(selectedDate) <= startOfDay(new Date(transport.returnDate));

    const assignmentOnDate = transport.slotAssignments?.find(assignment => 
      startOfDay(new Date(assignment.date)).getTime() === startOfDay(new Date(selectedDate)).getTime()
    );

    return transport.status === "ACTIVE" && 
      (hasDestinationOnDate || isDepartureDate || isReturnDate || isInDateRange) && 
      (!assignmentOnDate || !assignmentOnDate.slotId) &&
      !transport.isCut &&
      transport.currentStatus !== "CUT";
  });

  const handleAddSlot = async () => {
    try {
      // Make direct API call to add a slot
      const response = await fetch('/api/planning/slots', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ date: selectedDate }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to add slot');
      }

      // Refresh planning data after successful API call
      await dispatch(fetchPlanningData());
      toast.success('Slot added successfully');
    } catch (error) {
      console.error('Failed to add slot:', error);
      toast.error(error.message || 'Failed to add slot');
    }
  };

  const handleRemoveSlot = async () => {
    try {
      const currentDateStr = startOfDay(new Date(selectedDate)).toISOString();
      const currentSlots = slots[currentDateStr] || [];
      
      if (currentSlots.length === 0) {
        toast.error('No slots to remove');
        return;
      }

      const lastSlot = currentSlots[currentSlots.length - 1];

      if (lastSlot && lastSlot.transports?.length > 0) {
        setDeleteSlotConfirmation({
          isOpen: true,
          slot: lastSlot
        });
        return;
      }

      // Make API call to remove the specific slot
      const response = await fetch(`/api/planning/slots/${lastSlot.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedDate
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove slot');
      }

      await dispatch(fetchPlanningData());
      toast.success('Slot removed successfully');
    } catch (error) {
      console.error('Failed to remove slot:', error);
      toast.error(error.message || 'Failed to remove slot');
    }
  };

  const handleConfirmSlotDelete = async () => {
    try {
      if (!deleteSlotConfirmation.slot) {
        toast.error('No slot selected for deletion');
        return;
      }

      const response = await fetch(`/api/planning/slots/${deleteSlotConfirmation.slot.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedDate
        })
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to remove slot');
      }

      await dispatch(fetchPlanningData());
      setDeleteSlotConfirmation({ isOpen: false, slot: null });
      toast.success('Slot removed and transports unassigned successfully');
    } catch (error) {
      console.error('Failed to remove slot:', error);
      toast.error(error.message || 'Failed to remove slot');
    }
  };

  const handleDragStart = (event) => {
    setActiveId(event.active.id);
    setActiveDragData(event.active.data.current);
  };

  const handleDragCancel = () => {
    setActiveId(null);
    setActiveDragData(null);
  };

  const handleDragEnd = async (event) => {
    const { active, over } = event;

    if (!over) return;

    try {
      // Slot'ları yeniden sıralama
      if (!active.id.toString().includes('transport-') && !over.id.toString().includes('transport-')) {
        const oldIndex = currentSlots.findIndex(slot => slot.id.toString() === active.id);
        const newIndex = currentSlots.findIndex(slot => slot.id.toString() === over.id);

        if (oldIndex !== -1 && newIndex !== -1) {
          try {
            setIsReordering(true);
            
            // Optimistic update - UI'ı hemen güncelle
            const newSlots = [...currentSlots];
            const [movedSlot] = newSlots.splice(oldIndex, 1);
            newSlots.splice(newIndex, 0, movedSlot);
            
            // Slot numaralarını güncelle
            const updatedSlots = newSlots.map((slot, index) => ({
              ...slot,
              order: index,
              slotNumber: `${index + 1}`
            }));
            
            // Redux state'i güncelle
            await dispatch(optimisticReorderThunk({
              dateStr: currentDateStr,
              slots: updatedSlots
            })).unwrap();

            // API çağrısını yap
            const result = await dispatch(reorderSlots({
              date: selectedDate,
              oldIndex,
              newIndex,
            })).unwrap();

            console.log('Slot reordering completed, result:', result);
            
            // Socket.IO olayı slots:reorder ile gönderilecek, diğer kullanıcıların
            // ekranı otomatik olarak güncellenecek.

          } catch (error) {
            console.error('Failed to reorder slots:', error);
            // Hata durumunda orijinal state'e geri dön
            await dispatch(fetchPlanningData()).unwrap();
          } finally {
            setIsReordering(false);
          }
        }
        return;
      }

      // Sürükleme işlemi başladığında loading state'i aktif et
      setIsReordering(true);

      // Transport'u slot'a taşıma veya slot'tan çıkarma
      if (active.data.current?.type === 'transport') {
        const transportId = parseInt(active.id.split('-')[1]);
        const slotId = over.data.current?.type === 'slot' ? parseInt(over.id.split('-')[1]) : null;
        
        try {
          const currentTransport = transports.find(t => t.id === transportId);
          if (!currentTransport) return;

          // Check if the transport is being dropped back into its original slot
          const currentSlotAssignment = currentTransport.slotAssignments?.find(
            sa => startOfDay(new Date(sa.date)).getTime() === startOfDay(new Date(selectedDate)).getTime()
          );
          
          // Get the current slotId from the assignment
          const currentSlotId = currentSlotAssignment?.slot?.id;
          
          console.log('Drag check:', { 
            transportId, 
            currentSlotId, 
            targetSlotId: slotId,
            isSameSlot: currentSlotId === slotId,
            slotAssignments: currentTransport.slotAssignments
          });
          
          // If the transport is being dropped back into its original slot, do nothing
          if (currentSlotId === slotId) {
            console.log('Transport dropped back into its original slot. No action needed.');
            setIsReordering(false);
            return;
          }

          // Transport'un bilgilerini konsola yazdır
          console.log('Dropped Transport Info:', {
            id: currentTransport.id,
            reference: currentTransport.reference,
            adr: currentTransport.adr,
            pickUpQuay: currentTransport.pickUpQuay?.name,
            dropOffQuay: currentTransport.dropOffQuay?.name,
            client: currentTransport.client?.name,
            destinations: currentTransport.destinations?.map(d => ({
              name: d.frequentLocation?.name,
              time: d.destinationTime
            }))
          });

          // Hedef slot'u ve driver'ı bul
          const targetSlot = currentSlots.find(s => s.id === slotId);
          
          // Eğer transport bir driver'a atanmışsa, kullanıcıya sor
          if (currentTransport.sentToDriver) {
            setUnassignModalConfig({
              isOpen: true,
              transportData: currentTransport,
              onConfirm: async () => {
                try {
                  // Önce driver'dan unassign et
                  await dispatch(updateTransportCurrentStatus({
                    transportId: currentTransport.id,
                    currentStatus: 'PLANNED',
                    sentToDriver: false
                  })).unwrap();
                  
                  // ETA'ları sıfırla
                  await dispatch(updateTransportEtas({
                    transportId: currentTransport.id,
                    pickUpEta: null,
                    dropOffEta: null,
                    destinationEtas: currentTransport.destinations.map(dest => ({
                      destinationId: dest.id,
                      eta: null
                    }))
                  })).unwrap();
                  
                  // Eğer transport'un truck'ı varsa, truck'tan da unassign et
                  if (currentTransport.truck) {
                    await handleUnassignFromTruck(currentTransport);
                  }
                  
                  toast.info('Transport unassigned from driver and ETAs reset');
                  
                  // Yeni slot'a atama işlemini yap
                  const response = await fetch('/api/planning/transports/assign', {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      transportId: transportId,
                      slotId: slotId,
                      date: selectedDate
                    }),
                  });

                  if (!response.ok) throw new Error('Failed to assign transport');

                  // Redux store'u güncelle
                  const planningRes = await fetch('/api/planning');
                  const planningData = await planningRes.json();
                  
                  // updateTransportsAndSlots action'ını kullanarak Redux store'u güncelle
                  dispatch(updateTransportsAndSlots({
                    transportUpdates: planningData.transports,
                    slotUpdates: planningData.slots,
                    type: 'update'
                  }));
                  
                  toast.success('Transport moved successfully');
                  setUnassignModalConfig({ isOpen: false, transportData: null, onConfirm: null });
                } catch (error) {
                  console.error('Error unassigning transport:', error);
                  toast.error('Failed to unassign transport from driver');
                }
              }
            });
            return;
          }

          if (targetSlot && targetSlot.driverId) {
            const driver = drivers.find(d => d.id === targetSlot.driverId);
            
            // ADR kontrolü
            const validations = await planningValidations.validateTransportAssignment(
              currentTransport,
              targetSlot,
              driver
            );
            
            const canProceed = await handleValidationResults(validations);
            if (!canProceed) {
              setIsReordering(false);
              return;
            }
          }

          // Genset kontrolü
          if (targetSlot && targetSlot.truckId && currentTransport.genset === 'YES') {
            // Slot'a truck ekle
            const targetSlotWithTruck = {
              ...targetSlot,
              truck: trucks.find(t => t.id === targetSlot.truckId)
            };
            
            // Genset validasyonu
            const gensetValidations = await planningValidations.validateTransportGensetRequirement(
              currentTransport,
              targetSlotWithTruck
            );
            
            const canProceed = await handleValidationResults(gensetValidations);
            if (!canProceed) {
              setIsReordering(false);
              return;
            }
          }

          // API çağrısı
          const response = await fetch('/api/planning/transports/assign', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              transportId: transportId,
              slotId: slotId,
              date: selectedDate
            }),
          });

          if (!response.ok) throw new Error('Failed to assign transport');

          // Redux store'u direkt güncelle
          const planningRes = await fetch('/api/planning');
          if (!planningRes.ok) throw new Error('Failed to fetch planning data');
          
          const planningData = await planningRes.json();
          
          // updateTransportsAndSlots action'ını kullanarak Redux store'u güncelle
          dispatch(updateTransportsAndSlots({
            transportUpdates: planningData.transports,
            slotUpdates: planningData.slots,
            type: 'update'
          }));

          toast.success('Transport assigned successfully');
        } catch (error) {
          console.error('Error in drag and drop:', error);
          toast.error(error.message || 'Failed to assign transport');
        } finally {
          // İşlem bittiğinde loading state'i kapat
          setIsReordering(false);
        }
      }
    } catch (error) {
      console.error('Error in drag and drop:', error);
      toast.error(error.message || 'Failed to assign transport');
    }
  };

  const handleEditTransport = async (transport) => {
    try {
      console.log("Editing transport:", transport); // Transport verilerini kontrol et
      setEditingTransport(transport);
      setIsModalOpen(true);
    } catch (error) {
      console.error("Error setting up edit:", error);
    }
  };

  const handleUpdateTransport = async (data) => {
    try {
      console.log("Updating transport with data:", data);
      console.log("Editing transport ID:", editingTransport.id);
      
      // Eğer loading reference değeri varsa, benzersiz mi kontrol et
      if (data.loadingUnloadingReference) {
        // Mevcut loading reference değeri ile aynı değilse kontrol yap
        if (data.loadingUnloadingReference !== editingTransport.loadingUnloadingReference) {
          // Aynı loading reference'a sahip başka bir transport var mı kontrol et
          const checkResponse = await fetch('/api/planning/transports/check-reference', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              reference: data.loadingUnloadingReference,
              excludeId: editingTransport.id
            }),
          });
          
          const checkResult = await checkResponse.json();
          
          if (checkResult.exists) {
            throw new Error('Loading/Unloading Reference must be unique. Another transport is already using this reference.');
          }
          
          // Eğer aynı kökten gelen (cut edilmiş) transport ile ortak ref var, bilgilendir
          if (checkResult.isCutRelated) {
            toast.info('This reference is also used by a related transport in the same cut group.', {
              autoClose: 5000
            });
          }
        }
      }
      
      const response = await fetch(`/api/planning/transports/${editingTransport.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error("API Error Response:", errorData);
        
        // Loading ref hatası için özel mesaj
        if (errorData.error && errorData.error.includes('Loading/Unloading Reference must be unique')) {
          throw new Error('Loading/Unloading Reference must be unique. Another transport is already using this reference.');
        }
        
        // Container number hatası için özel mesaj
        if (errorData.error && errorData.error.includes('Container number')) {
          throw new Error(errorData.error);
        }
        
        throw new Error(errorData.error || 'Failed to update transport');
      }

      const updatedTransport = await response.json();
      console.log("Updated Transport Response:", updatedTransport);

      // Redux store'u direkt güncelle
      const planningRes = await fetch('/api/planning');
      if (!planningRes.ok) throw new Error('Failed to fetch planning data');
      
      const planningData = await planningRes.json();
      
      // updateTransportsAndSlots action'ını kullanarak Redux store'u güncelle
      dispatch(updateTransportsAndSlots({
        transportUpdates: planningData.transports,
        slotUpdates: planningData.slots,
        type: 'update'
      }));

      // İşlem başarılı olduğunda modali kapat
      setIsModalOpen(false);
      setEditingTransport(null);
      toast.success('Transport updated successfully');
      return true; // İşlem başarılı
    } catch (error) {
      console.error("Error updating transport:", error);
      
      // API'den gelen detaylı hata mesajını kontrol et
      if (error.message && error.message.includes('Loading/Unloading Reference must be unique')) {
        toast.error(error.message, {
          autoClose: 6000
        });
      } else if (error.message && error.message.includes('Container number')) {
        toast.error(error.message, {
          autoClose: 6000
        });
      } else {
        toast.error(error.message || 'Failed to update transport');
      }
      
      // Hatayı dışarı fırlat ki form kapanmasın
      return Promise.reject(error);
    }
  };

  // Unassigned Transports için drop alanı
  const { 
    setNodeRef: setUnassignedDropRef,
    isOver: isOverUnassigned,
    active: activeUnassigned,
  } = useDroppable({
    id: 'unassigned-area',
    data: {
      type: 'unassigned',
    },
  });

  // Transport sürüklendiğinde drop alanını vurgula
  const isTransportDrag = activeUnassigned?.data?.current?.type === 'transport';
  const isValidUnassignedDrop = isTransportDrag && isOverUnassigned;

  const handleUnassign = async (transport) => {
    try {
      const response = await fetch('/api/planning/transports/assign', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transportId: transport.id,
          slotId: null,
          date: selectedDate,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to unassign transport');
      }

      // Planlamayı yenile
      dispatch(fetchPlanningData());
    } catch (error) {
      console.error('Error unassigning transport:', error);
      toast.error('Failed to unassign transport');
    }
  };

  // Unassign confirmation handler
  const handleUnassignConfirm = (transport) => {
    setUnassignConfirmation({
      isOpen: true,
      transportId: transport.id,
      transportData: transport
    });
  };

  // Actual unassign handler
  const handleUnassignConfirmed = async () => {
    const transportId = unassignConfirmation.transportId;
    try {
      await handleUnassign(transportId);
      setUnassignConfirmation({
        isOpen: false,
        transportId: null,
        transportData: null
      });
    } catch (error) {
      console.error('Error unassigning transport:', error);
    }
  };

  const handleAddTransport = async (data) => {
    try {
      // Eğer loading reference değeri varsa, benzersiz mi kontrol et
      if (data.loadingUnloadingReference) {
        const checkResponse = await fetch('/api/planning/transports/check-reference', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            reference: data.loadingUnloadingReference
          }),
        });
        
        const checkResult = await checkResponse.json();
        
        if (checkResult.exists) {
          throw new Error('Loading/Unloading Reference must be unique. Another transport is already using this reference.');
        }
        
        // Eğer aynı kökten gelen (cut edilmiş) transport ile ortak ref var, bilgilendir
        if (checkResult.isCutRelated) {
          toast.info('This reference is also used by a related transport in the same cut group.', {
            autoClose: 5000
          });
        }
      }
      
      const response = await fetch('/api/planning/transports', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        console.error('API Error Response:', errorData);
        
        // Loading ref hatası için özel mesaj
        if (errorData.error && errorData.error.includes('Loading/Unloading Reference must be unique')) {
          throw new Error('Loading/Unloading Reference must be unique. Another transport is already using this reference.');
        }
        
        // Container number hatası için özel mesaj
        if (errorData.error && errorData.error.includes('Container number')) {
          throw new Error(errorData.error);
        }
        
        throw new Error(errorData.error || 'Failed to add transport');
      }

      // Redux store'u direkt güncelle
      const planningRes = await fetch('/api/planning');
      if (!planningRes.ok) throw new Error('Failed to fetch planning data');
      
      const planningData = await planningRes.json();
      
      // updateTransportsAndSlots action'ını kullanarak Redux store'u güncelle
      dispatch(updateTransportsAndSlots({
        transportUpdates: planningData.transports,
        slotUpdates: planningData.slots,
        type: 'add'
      }));

      // İşlem başarılı olduğunda, başarılı olduğunu bildiriyoruz
      setIsModalOpen(false);
      toast.success('Transport added successfully');
      return true; // İşlem başarılı
    } catch (error) {
      console.error('Failed to add transport:', error);
      
      // API'den gelen detaylı hata mesajını kontrol et
      if (error.message && error.message.includes('Loading/Unloading Reference must be unique')) {
        toast.error(error.message, {
          autoClose: 6000
        });
      } else if (error.message && error.message.includes('Container number')) {
        toast.error(error.message, {
          autoClose: 6000
        });
      } else {
        toast.error(error.message || 'Failed to add transport');
      }
      
      // Hatayı dışarı fırlat ki form kapanmasın
      return Promise.reject(error);
    }
  };

  const renderTransport = (transport) => {
    return (
      <div key={transport.id} className="bg-white p-4 rounded-lg shadow space-y-4">
        {/* ... mevcut transport bilgileri ... */}

        {/* Destinations Section */}
        {transport.destinations && transport.destinations.length > 0 && (
          <div className="mt-2">
            <div className="text-sm font-medium text-gray-500 mb-2">Stops:</div>
            <div className="space-y-2">
              {transport.destinations
                .sort((a, b) => a.order - b.order)
                .map((dest, index) => (
                  <div 
                    key={dest.id} 
                    className="flex items-center text-sm text-gray-600"
                  >
                    <FiMapPin className="w-4 h-4 mr-2 text-gray-400" />
                    <span>
                      {index + 1}. {dest.destination.city}, {dest.destination.country}
                      {dest.destination.postalCode && ` (${dest.destination.postalCode})`}
                    </span>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ... diğer transport detayları ... */}
      </div>
    );
  };

  const handleMove = async (transportId, direction) => {
    try {
      const dateStr = startOfDay(new Date(selectedDate)).toISOString();
      const currentSlots = slots[dateStr] || [];
      const slotIndex = currentSlots.findIndex(slot => 
        slot.transports.some(t => t.id === transportId)
      );
      
      if (slotIndex === -1) return;
      
      const slot = currentSlots[slotIndex];
      const transportIndex = slot.transports.findIndex(t => t.id === transportId);
      
      // Sınırları kontrol et
      if (direction === 'up' && transportIndex <= 0) return;
      if (direction === 'down' && transportIndex >= slot.transports.length - 1) return;

      setReorderingSlotId(slot.id);

      // Optimistik güncelleme için yeni sıralamayı hesapla
      const sortedTransports = [...slot.transports].sort((a, b) => a.slotOrder - b.slotOrder);
      const newTransports = [...sortedTransports];
      const [movedTransport] = newTransports.splice(transportIndex, 1);
      const newIndex = direction === 'up' ? transportIndex - 1 : transportIndex + 1;
      newTransports.splice(newIndex, 0, movedTransport);

      // Optimistik güncelleme
      dispatch(updateSlotTransports({
        dateStr,
        slotId: slot.id,
        updatedTransports: newTransports
      }));
      
      const response = await fetch(`/api/planning/slots/${slot.id}/reorder-transports`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transportId,
          direction
        })
      });

      const data = await response.json();
      
      if (!response.ok) {
        // Hata durumunda orijinal sıralamaya geri dön
        dispatch(updateSlotTransports({
          dateStr,
          slotId: slot.id,
          updatedTransports: sortedTransports
        }));
        throw new Error(data.error || 'Failed to reorder');
      }

      // Backend'den gelen güncel veriyi kullan
      dispatch(updateSlotTransports({
        dateStr,
        slotId: slot.id,
        updatedTransports: data.transports
      }));

      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error('Failed to update transport order:', error);
      toast.error(error.message || 'Failed to reorder transport');
    } finally {
      setReorderingSlotId(null);
    }
  };

  const handleMoveUp = (transportId) => handleMove(transportId, 'up');
  const handleMoveDown = (transportId) => handleMove(transportId, 'down');

  // Delete confirmation handler
  const handleDeleteConfirm = (transport) => {
    console.log('Setting transport to delete:', transport);
    setTransportToDelete(transport.id);
    setShowDeleteModal(true);
  };

  // Actual delete handler
  const handleDelete = async (transportId) => {
    try {
      // API çağrısı
      const response = await fetch(`/api/planning/transports/${transportId}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        throw new Error('Failed to delete transport');
      }

      // Silinen transport'un verisini al
      const deletedTransport = await response.json();

      // Redux store'u güncelle - sayfa yenilenmeden UI'ı güncelle
      dispatch({ 
        type: 'planning/deleteTransport', 
        payload: transportId 
      });

      // Modal'ı kapat
      setShowDeleteModal(false);
      setTransportToDelete(null);
      
      // Kullanıcıya bildir
      toast.success('Transport deleted successfully');
    } catch (error) {
      console.error('Error deleting transport:', error);
      toast.error(error.message || 'Failed to delete transport');
    }
  };

  const handleDeleteSlot = async () => {
    if (!deleteSlotConfirmation.slot) return;

    try {
      const response = await fetch(`/api/planning/slots/${deleteSlotConfirmation.slot.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          date: selectedDate
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to delete slot');
      }

      // Redux state'i güncelle
      dispatch(fetchPlanningData());
      
      setDeleteSlotConfirmation({
        isOpen: false,
        slot: null
      });

      toast.success('Slot deleted successfully');
    } catch (error) {
      console.error('Error deleting slot:', error);
      toast.error(error.message || 'Failed to delete slot');
    }
  };

  // Toplam slot sayısını ayarlama fonksiyonu
  const handleSetTotalSlots = async () => {
    try {
      const targetCount = parseInt(totalSlotCount);
      if (isNaN(targetCount) || targetCount < 0 || targetCount > 50) {
        toast.error('Please enter a valid number between 0-50');
        return;
      }

      setIsSettingSlots(true);
      
      // Yeni API endpoint'ini kullan
      const response = await fetch('/api/planning/slots/setTotalSlots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          date: selectedDate,
          totalSlots: targetCount
        }),
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        if (data.error === 'Cannot reduce slots as some have assigned transports') {
          toast.error(`Cannot delete slots with assigned transports. There are ${data.emptySlotCount} empty slots but ${data.requiredEmptySlots} slots need to be removed.`);
        } else {
          throw new Error(data.error || 'Operation failed');
        }
      } else {
        toast.success(data.message || 'Slot count updated successfully');
        setShowSetTotalSlotsModal(false);
        
        // Redux state'i güncelle
        await dispatch(fetchPlanningData());
      }
    } catch (error) {
      console.error('Error setting total slots:', error);
      toast.error(error.message || 'Failed to set slot count');
    } finally {
      setIsSettingSlots(false);
    }
  };

  const handleDateChange = (days) => {
    const newDate = addDays(new Date(selectedDate), days);
    setIsDateChanging(true);
    dispatch(setSelectedDate(newDate.toISOString()));
    dispatch(fetchPlanningData()).finally(() => {
      setIsDateChanging(false);
    });
  };

  const handleHoldConfirm = (transport) => {
    setTransportToHold(transport);
    setShowHoldModal(true);
  };

  const handleHold = async () => {
    try {
      // Eğer transport ongoing veya completed ise önce status ve ETA'ları sıfırla
      if (transportToHold.currentStatus === 'ONGOING' || transportToHold.currentStatus === 'COMPLETED') {
        await dispatch(updateTransportCurrentStatus({
          transportId: transportToHold.id,
          currentStatus: 'PLANNED',
          sentToDriver: false
        })).unwrap();
        
        await dispatch(updateTransportEtas({
          transportId: transportToHold.id,
          pickUpEta: null,
          dropOffEta: null,
          destinationEtas: transportToHold.destinations.map(dest => ({
            destinationId: dest.id,
            eta: null
          }))
        })).unwrap();
      }

      // Eğer transport'un bir trailer'ı varsa, onu kaldır
      if (transportToHold.trailer) {
        await dispatch(updateTransportTrailer({
          transportId: transportToHold.id,
          trailerId: null
        })).unwrap();
      }

      setShowHoldModal(false);
      await dispatch(updateTransportStatus({
        transportId: transportToHold.id,
        status: "ON_HOLD",
      })).unwrap();

      toast.success('Transport put on hold');
    } catch (error) {
      console.error('Error putting transport on hold:', error);
      toast.error('Failed to put transport on hold');
    }
  };

  const handleActivate = async (transportId, dates) => {
    try {
      console.log('Activating transport with dates:', dates);
      
      // ACTIVATE API isteği
      const updateResponse = await fetch(`/api/planning/transports/${transportId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: "ACTIVE",
          dates: {
            departureDate: dates.departureDate,
            returnDate: dates.returnDate,
            destinations: dates.destinations
          }
        }),
      });

      if (!updateResponse.ok) {
        throw new Error('Failed to activate transport');
      }

      console.log('Transport activated successfully, refreshing data');
      
      // Close OnHold modal first
      setIsOnHoldModalOpen(false);
      
      // Tüm planning verilerini tamamen yeniden çek
      // Bu, Redux'taki tüm transport ve slot verilerini yenileyecek
      await dispatch(fetchPlanningData());
      
      toast.success("Transport activated");
      setActivatingTransport(null);
    } catch (error) {
      console.error('Error activating transport:', error);
      toast.error("Failed to activate transport");
    }
  };

  // Click handler'ı ekle
  const handleClick = (e) => {
    // Eğer tıklanan element highlight'lı slot değilse highlight'ı kaldır
    if (!e.target.closest(`#slot-${selectedSlotNumber}`)) {
      setSelectedSlotNumber(null);
    }
  };

  useEffect(() => {
    if (selectedSlotNumber) {
      setTimeout(() => {
        const element = document.getElementById(`slot-${selectedSlotNumber}`);
        if (element) {
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center'
          });
        }
      }, 100);
    }

    document.addEventListener('click', handleClick);
    return () => {
      document.removeEventListener('click', handleClick);
    };
  }, [selectedSlotNumber]);

  const handleUnassignFromTruck = async (transport) => {
    try {
      // Önce transport'un status'ünü güncelle
      await dispatch(updateTransportCurrentStatus({
        transportId: transport.id,
        currentStatus: 'PLANNED',
        sentToDriver: false
      })).unwrap();

      // ETA'ları sıfırla
      await dispatch(updateTransportEtas({
        transportId: transport.id,
        pickUpEta: null,
        dropOffEta: null,
        destinationEtas: transport.destinations.map(dest => ({
          destinationId: dest.id,
          eta: null
        }))
      })).unwrap();

      toast.success('Transport unassigned from truck');
    } catch (error) {
      toast.error('Failed to unassign transport from truck');
    }
  };

  // Scroll to highlighted transport
  useEffect(() => {
    if (highlightedTransports.length > 0) {
      const firstHighlightedId = highlightedTransports[0];
      setTimeout(() => {
        // Try to find the transport in unassigned area
        let element = document.getElementById(`unassigned-transport-${firstHighlightedId}`);
        
        // If not found, try in slots
        if (!element) {
          element = document.getElementById(`slot-transport-${firstHighlightedId}`);
        }
        
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [highlightedTransports]);

  return (
    <div className={`bg-white p-4 rounded-lg shadow transition-opacity duration-200 ${isReordering ? 'opacity-50' : ''}`}>
      <div className="flex justify-between items-center mb-4">
        <div className="flex items-center gap-3">
          <h2 className="text-lg font-bold text-gray-900">
            <span className="text-[#1B6090]">
              {format(new Date(selectedDate), 'dd MMM yyyy')}
            </span>
            <span className="ml-2 text-sm font-medium text-gray-500">
              {format(new Date(selectedDate), 'EEEE')}
            </span>
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={() => handleDateChange(-1)}
              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              disabled={isDateChanging}
            >
              <FiChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => handleDateChange(1)}
              className="p-1 rounded hover:bg-gray-100 text-gray-500 hover:text-gray-700 disabled:opacity-50"
              disabled={isDateChanging}
            >
              <FiChevronRight className="w-4 h-4" />
            </button>
            {isDateChanging && (
              <Spinner size="sm" className="ml-2" />
            )}
          </div>
        </div>
        <div className="flex items-center gap-4">
          <button
            onClick={() => setIsOnHoldModalOpen(true)}
            className="flex items-center gap-1 px-3 py-2 text-xs bg-orange-100 text-orange-700 rounded-md hover:bg-orange-200"
            title="View On Hold Transports"
          >
            <FiPause className="w-3 h-3" />
            On Hold
          </button>
          <div className="flex items-center gap-2 bg-gray-100 p-1.5 rounded-lg">
            <button
              onClick={handleRemoveSlot}
              disabled={currentSlots.length === 0}
              className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
            >
              <FiMinusCircle className="w-4 h-4 text-red-500" />
            </button>
            <span className="font-medium text-sm">{currentSlots.length} slots</span>
            <button
              onClick={handleAddSlot}
              className="p-1.5 rounded hover:bg-gray-100"
            >
              <FiPlusCircle className="w-4 h-4 text-green-500" />
            </button>
            
            {/* Yeni Ekledğimiz Buton: Toplam Slot Sayısını Ayarla */}
            <button
              onClick={() => {
                setTotalSlotCount(currentSlots.length);
                setShowSetTotalSlotsModal(true);
              }}
              className="ml-1 bg-gradient-to-r from-blue-50 to-indigo-50 text-xs px-2 py-1 rounded-md border border-indigo-100 text-indigo-600 font-medium shadow-sm hover:shadow-md transition-all duration-200 hover:from-blue-100 hover:to-indigo-100"
              title="Set total slots"
            >
              Total Slots
            </button>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700"
          >
            <FiPlus className="w-4 h-4" />
            Add Transport
          </button>
        </div>
      </div>

      <DndContext
        sensors={sensors}
        collisionDetection={rectIntersection}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
        modifiers={[restrictToVerticalAxis, restrictToWindowEdges]}
      >
        <div className="flex flex-col gap-6">
          <div 
            ref={setUnassignedDropRef}
            className={`border-2 transition-all duration-200 rounded-lg p-4
              ${isValidUnassignedDrop
                ? 'border-green-500 bg-green-50 scale-102 shadow-lg' 
                : 'border-gray-200 bg-slate-100'}`}
          >
            <h3 className="font-medium text-gray-700 text-xs mb-3">Unassigned Transports</h3>
            <SortableContext
              items={filteredTransports.map(t => `transport-${t.id}`)}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-2">
                {filteredTransports.map(transport => {
                  // Seçili tarih departure ve return arasında mı kontrol et
                  const selectedDateObj = startOfDay(new Date(selectedDate));
                  const isInDateRange = transport.departureDate && transport.returnDate && 
                    selectedDateObj > startOfDay(new Date(transport.departureDate)) && 
                    selectedDateObj < startOfDay(new Date(transport.returnDate));
                  
                  // Check if this transport is highlighted from search
                  const isHighlighted = highlightedTransports.includes(transport.id);

                  return (
                    <div 
                      key={transport.id}
                      id={`unassigned-transport-${transport.id}`}
                      className={isHighlighted ? 'ring-2 ring-yellow-400 rounded-lg shadow-md shadow-yellow-200 animate-pulse' : ''}
                    >
                      <DraggableTransport 
                        transport={transport}
                        isInDateRange={isInDateRange}
                        onEdit={handleEditTransport}
                        onDelete={handleDeleteConfirm}
                        onHold={handleHoldConfirm}
                        onUnassign={handleUnassign}
                        isHighlighted={isHighlighted}
                      />
                    </div>
                  );
                })}
                {filteredTransports.length === 0 && (
                  <div className="text-center text-xs text-gray-500 py-2">
                    No unassigned transports
                  </div>
                )}
              </div>
            </SortableContext>
          </div>

          <div>
            <SortableContext
              items={currentSlots.map(s => s.id.toString())}
              strategy={verticalListSortingStrategy}
            >
              <div className="space-y-4">
                {currentSlots.map((slot, index) => (
                  <div 
                    key={slot.id}
                    id={`slot-${slot.slotNumber}`}
                    className={`${slot.slotNumber === selectedSlotNumber ? 'ring-2 ring-blue-500' : ''}`}
                  >
                    <SortableSlot
                      slot={slot}
                      index={index}
                      onUnassign={handleUnassignConfirm}
                      onEdit={handleEditTransport}
                      onMoveUp={handleMoveUp}
                      onMoveDown={handleMoveDown}
                      onDelete={(transport) => {
                        setTransportToDelete(transport.id);
                        setShowDeleteModal(true);
                      }}
                      slots={currentSlots}
                      transports={transports}
                      isReordering={reorderingSlotId === slot.id}
                      dateStr={currentDateStr}
                      onHold={handleHoldConfirm}
                      allSlots={currentSlots}
                      highlightedTransports={highlightedTransports}
                      selectedDate={selectedDate}
                    />
                  </div>
                ))}

                {currentSlots.length === 0 && (
                  <div className="text-center text-gray-500 py-4">
                    No slots available. Click the plus button to add a slot.
                  </div>
                )}
              </div>
            </SortableContext>
          </div>
        </div>

        <DragOverlay>
          {activeId && activeDragData?.type === 'transport' && (
            <div className="opacity-80 bg-white shadow-lg border-2 border-blue-400 rounded-lg p-2 scale-95">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-medium text-sm">{activeDragData.transport.client.name}</h4>
                  <p className="text-xs text-gray-600">
                    Order: {activeDragData.transport.transportOrderNumber}
                  </p>
                </div>
              </div>
            </div>
          )}
          {activeId && !activeDragData?.type && (
            <div className="w-56 opacity-90 bg-white shadow-lg border-2 border-blue-400 rounded-lg p-1.5 scale-95">
              <div className="flex items-center gap-2">
                <FiMove className="text-gray-500 w-3 h-3" />
                <h3 className="font-medium text-xs">
                  Truck {currentSlots.find(s => s.id.toString() === activeId)?.slotNumber}
                </h3>
              </div>
            </div>
          )}
        </DragOverlay>
      </DndContext>

      {isModalOpen && (
        <Modal
          isOpen={isModalOpen}
          onClose={() => {
            setIsModalOpen(false);
            setEditingTransport(null);
          }}
          title={editingTransport ? "Edit Transport" : "Create Transport"}
        >
          <TransportForm
            initialData={editingTransport}
            onSubmit={editingTransport ? handleUpdateTransport : handleAddTransport}
            onClose={() => {
              setIsModalOpen(false);
              setEditingTransport(null);
            }}
          />
        </Modal>
      )}

      {/* Unassign Confirmation Modal'ı için Modal yerine ConfirmationModal kullanalım */}
      <ConfirmationModal
        isOpen={unassignConfirmation.isOpen}
        onClose={() => setUnassignConfirmation({ isOpen: false, transportId: null, transportData: null })}
        title="Confirm Unassign"
        onConfirm={handleUnassignConfirmed}
      >
        <div className="p-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 mr-3">
              <FiAlertCircle className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Unassign Transport
              </h3>
              <p className="text-sm text-gray-500">
                Are you sure you want to unassign this transport?
              </p>
              {unassignConfirmation.transportData && (
                <div className="mt-2 p-3 bg-gray-50 rounded-lg text-sm">
                  <p><span className="font-medium">Client:</span> {unassignConfirmation.transportData.client.name}</p>
                  <p><span className="font-medium">Order:</span> {unassignConfirmation.transportData.transportOrderNumber}</p>
                </div>
              )}
            </div>
          </div>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => setUnassignConfirmation({ isOpen: false, transportId: null, transportData: null })}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleUnassignConfirmed}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Unassign
            </button>
          </div>
        </div>
      </ConfirmationModal>

      {/* Slot Silme Confirmation Modal'ı */}
      <ConfirmationModal
        isOpen={deleteSlotConfirmation.isOpen}
        onClose={() => setDeleteSlotConfirmation({ isOpen: false, slot: null })}
        title={`Delete Slot ${deleteSlotConfirmation.slot?.slotNumber}`}
        onConfirm={handleDeleteSlot}
      >
        <div className="p-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 mr-3">
              <FiAlertCircle className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Warning: Slot Contains Transports
              </h3>
              <p className="text-sm text-gray-500">
                This slot contains {deleteSlotConfirmation.slot?.transports?.length} transport(s).
                If you remove this slot, all transports will be moved to Unassigned Transports.
              </p>
              <div className="mt-3 p-3 bg-gray-50 rounded-lg">
                <p className="text-sm font-medium text-gray-700">Affected transports:</p>
                <ul className="mt-2 text-sm text-gray-600">
                  {deleteSlotConfirmation.slot?.transports.map(ts => (
                    <li key={ts.id} className="flex items-center gap-2">
                      <span>• {ts.transport.client.name}</span>
                      <span className="text-gray-400">|</span>
                      <span>Order: {ts.transport.transportOrderNumber}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setDeleteSlotConfirmation({ isOpen: false, slot: null })}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleDeleteSlot}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Delete Slot
            </button>
          </div>
        </div>
      </ConfirmationModal>

      {/* Transport Silme Confirmation Modal'ı */}
      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        title="Delete Transport"
        onConfirm={() => handleDelete(transportToDelete)}
      >
        <div className="p-6">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 mr-3">
              <FiAlertCircle className="w-6 h-6 text-yellow-500" />
            </div>
            <div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                Are you sure you want to delete this transport?
              </h3>
              <p className="text-sm text-gray-500">
                {transports.find(t => t.id === transportToDelete)?.slotId 
                  ? "This transport is currently assigned to a slot. If you delete it, it will be removed from the slot."
                  : "This action cannot be undone."
                }
              </p>
            </div>
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <button
              onClick={() => setShowDeleteModal(false)}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={() => handleDelete(transportToDelete)}
              className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md hover:bg-red-700"
            >
              Delete Transport
            </button>
          </div>
        </div>
      </ConfirmationModal>

      <OnHoldTransportsModal
        isOpen={isOnHoldModalOpen}
        onClose={() => setIsOnHoldModalOpen(false)}
        transports={transports}
        onEdit={handleEditTransport}
        onDelete={(transport) => {
          setTransportToDelete(transport.id);
          setShowDeleteModal(true);
        }}
        onActivate={(transport) => setActivatingTransport(transport)}
        highlightedTransports={highlightedTransports}
      />

      <ActivateTransportModal
        isOpen={!!activatingTransport}
        onClose={() => setActivatingTransport(null)}
        transport={activatingTransport}
        onActivate={handleActivate}
      />

      <ConfirmationModal
        isOpen={showHoldModal}
        onClose={() => {
          setShowHoldModal(false);
          setTransportToHold(null);
        }}
        title="Put Transport On Hold?"
      >
        <div className="px-6 py-4">
          <div className="flex items-start mb-4">
            <div className="flex-shrink-0 mr-3">
              <FiPause className="w-6 h-6 text-orange-500" />
            </div>
            <div>
              <p className="text-sm text-gray-500">
                This transport will be removed from its current slot and moved to the On Hold list. 
                You can reactivate it later from the On Hold section.
              </p>
            </div>
          </div>
          <div className="mt-4 flex justify-end gap-3">
            <button
              onClick={() => {
                setShowHoldModal(false);
                setTransportToHold(null);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleHold}
              className="px-4 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700"
            >
              Put On Hold
            </button>
          </div>
        </div>
      </ConfirmationModal>

      <UnassignDriverConfirmModal
        isOpen={unassignModalConfig.isOpen}
        onClose={() => setUnassignModalConfig({ isOpen: false, transportData: null, onConfirm: null })}
        onConfirm={unassignModalConfig.onConfirm}
      />
      
      {/* Toplam Slot Sayısı Ayarlama Modal'ı */}
      <Modal
        isOpen={isSetSlotsModalOpen || showSetTotalSlotsModal}
        onClose={() => {
          setIsSetSlotsModalOpen(false);
          setShowSetTotalSlotsModal(false);
        }}
        title="Set Total Slots"
      >
        <div className="p-6">
          <div className="mb-6">
            <label htmlFor="totalSlots" className="block text-sm font-medium text-gray-700 mb-2">
              Total Number of Slots
            </label>
            <div className="flex items-center">
              <input
                type="number"
                id="totalSlots"
                value={totalSlotCount}
                onChange={(e) => setTotalSlotCount(e.target.value)}
                min="0"
                max="50"
                className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="Ex: 10"
                disabled={isSettingSlots}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Current slot count: {currentSlots.length}
            </p>
            
            {/* Uyarı Mesajı */}
            <div className="mt-4 p-3 bg-yellow-50 border border-yellow-100 rounded-md">
              <div className="flex">
                <div className="flex-shrink-0">
                  <FiAlertTriangle className="h-5 w-5 text-yellow-400" />
                </div>
                <div className="ml-3">
                  <p className="text-sm text-yellow-700">
                    <strong>Important:</strong> If you set a lower number of slots than currently exist, the system will remove slots starting from the highest number. Any transports in these slots will be moved to the Unassigned Transports section.
                  </p>
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-8 flex justify-end gap-3">
            <button
              onClick={() => {
                setIsSetSlotsModalOpen(false);
                setShowSetTotalSlotsModal(false);
              }}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              disabled={isSettingSlots}
            >
              Cancel
            </button>
            <button
              onClick={handleSetTotalSlots}
              className={`px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 flex items-center ${isSettingSlots ? 'opacity-70 cursor-not-allowed' : ''}`}
              disabled={isSettingSlots}
            >
              {isSettingSlots ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Processing...
                </>
              ) : (
                'Save'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TransportsList; 