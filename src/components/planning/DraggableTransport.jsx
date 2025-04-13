"use client";
import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import {
  FiX,
  FiChevronUp,
  FiChevronDown,
  FiEdit2,
  FiMove,
  FiTrash2,
  FiActivity,
  FiAlertTriangle,
  FiTruck,
  FiHome,
  FiMapPin,
  FiPause,
  FiPlay,
  FiInfo,
  FiMoreVertical,
  FiToggleLeft,
  FiSend,
  FiClock,
  FiCpu,
  FiUserCheck,
  FiCheck,
  FiScissors,
} from "react-icons/fi";
import { FaTruckLoading } from "react-icons/fa";
import { format, addHours, startOfDay } from "date-fns";
import { isGensetRequired } from "@/lib/constants/containerTypes";
import { toast } from "react-toastify";
import { useState, useEffect, useRef, useMemo, Fragment } from "react";
import TransportTimeline from "./TransportTimeline";
import { getCountryCode } from "@/lib/constants/countries";
import TransportNoteModal from './TransportNoteModal';
import TransportTarModal from "./TransportTarModal";
import { useRouter } from "next/navigation";
import ScrCpuModal from "./ScrCpuModal";
import { Menu } from '@headlessui/react';
import { useDispatch, useSelector } from "react-redux";
import { useAppSelector } from "@/hooks/redux";
import { updateTransportStatus, updateTransportCurrentStatus, updateTransportEtas, updateTransportTrailer, updateTransportsAndSlots } from '@/redux/features/planningSlice';
import AssignDriverModal from './AssignDriverModal';
import ConfirmationModal from '@/components/ConfirmationModal';
import UnassignDriverConfirmModal from './UnassignDriverConfirmModal';
import { planningValidations, handleValidationResults } from '@/services/validations/planningValidations';
import { BsSnow2 } from 'react-icons/bs';
import { Listbox, Transition } from '@headlessui/react';
import { HiChevronUpDown, HiCheck } from 'react-icons/hi2';
import { isTrailerInUse, getAssignedTrailerIds, isTrailerInUseOnDate, isTrailerInUseOnDates, isTrailerInCutTransport } from './TrailerUtils';
import CutTransportModal from './CutTransportModal';
import { useSocket } from "@/context/SocketContext"; // Fix the import path

// T1 modülünde kullanılacak cn (classNames) yardımcı fonksiyonu
const cn = (...classes) => {
  return classes.filter(Boolean).join(' ');
};

const shouldShowTar = (quay, isPickup) => {
  if (!quay?.tarType || !quay?.defaultTar) return false;
  return quay.tarType === 'BOTH' || 
         (isPickup && quay.tarType === 'PICKUP') ||
         (!isPickup && quay.tarType === 'DROPOFF');
};

// Helper function to get TAR badge color based on status and quay settings
const getTarBadgeStyle = (transport, isPickup) => {
  const quay = isPickup ? transport.pickUpQuay : transport.dropOffQuay;
  const tar = isPickup ? transport.pickUpTar : transport.dropOffTar;
  const defaultTar = quay?.defaultTar;
  const isPositive = isPickup ? transport.pickUpTarPositive : transport.dropOffTarPositive;
  
  // If it's the default TAR or no custom TAR is set, always use negative color
  if (!tar || tar === defaultTar) {
    const negativeColorName = quay?.tarNegativeColor || 'RED';
    
    // Use a switch for the negative color
    switch (negativeColorName) {
      case 'RED':
        return 'bg-red-100 text-red-700';
      case 'ORANGE':
        return 'bg-orange-100 text-orange-700';
      case 'YELLOW':
        return 'bg-yellow-100 text-yellow-700';
      case 'GRAY':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-red-100 text-red-700';
    }
  }
  
  // Use a color based on positive/negative status
  if (isPositive) {
    const positiveColorName = quay?.tarPositiveColor || 'GREEN';
    
    // Use a switch for the positive color
    switch (positiveColorName) {
      case 'GREEN':
        return 'bg-green-100 text-green-700';
      case 'BLUE':
        return 'bg-blue-100 text-blue-700';
      case 'PURPLE':
        return 'bg-purple-100 text-purple-700';
      case 'TEAL':
        return 'bg-teal-100 text-teal-700';
      default:
        return 'bg-green-100 text-green-700';
    }
  } else {
    const negativeColorName = quay?.tarNegativeColor || 'RED';
    
    // Use a switch for the negative color
    switch (negativeColorName) {
      case 'RED':
        return 'bg-red-100 text-red-700';
      case 'ORANGE':
        return 'bg-orange-100 text-orange-700';
      case 'YELLOW':
        return 'bg-yellow-100 text-yellow-700';
      case 'GRAY':
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-red-100 text-red-700';
    }
  }
};

// SCR/CPU Badge'i için
const getBadgeStyle = (color) => {
  switch (color) {
    case 'RED':
      return 'bg-red-200 text-red-800';
    case 'ORANGE':
      return 'bg-orange-200 text-orange-800';
    case 'GREEN':
      return 'bg-green-200 text-green-800';
    default:
      return 'bg-red-200 text-red-800';
  }
};

// Son ETA'yı ve tipini bulan yardımcı fonksiyon
const getLastEta = (transport) => {
  if (transport.dropOffEta) {
    return {
      time: format(new Date(transport.dropOffEta), 'HH:mm'),
      type: 'dropOff',
      order: null
    };
  }
  
  const lastDestination = transport.destinations
    ?.slice()
    .reverse()
    .find(dest => dest.eta);
  
  if (lastDestination?.eta) {
    return {
      time: format(new Date(lastDestination.eta), 'HH:mm'),
      type: 'destination',
      order: lastDestination.order
    };
  }
  
  if (transport.pickUpEta) {
    return {
      time: format(new Date(transport.pickUpEta), 'HH:mm'),
      type: 'pickUp',
      order: null
    };
  }
  
  return null;
};

// ADR kontrolü için özel fonksiyon
const checkAdrRequirement = (transport, driver) => {
  if (transport.adr === 'YES' && driver?.adr === 'NO') {
    return {
      hasWarning: true,
      driverName: driver?.nickName || driver?.name
    };
  }
  return { hasWarning: false };
};

// Modern clipboard API ulaşılamadığında kullanılacak yardımcı fonksiyon
const fallbackCopyTextToClipboard = (text) => {
  const textArea = document.createElement('textarea');
  textArea.value = text;
  // Textareanın görünmez olmasını sağlıyoruz
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '0';
  textArea.style.width = '2em';
  textArea.style.height = '2em';
  textArea.style.padding = '0';
  textArea.style.border = 'none';
  textArea.style.outline = 'none';
  textArea.style.boxShadow = 'none';
  textArea.style.background = 'transparent';
  document.body.appendChild(textArea);
  textArea.focus();
  textArea.select();
  
  try {
    const successful = document.execCommand('copy');
    if (successful) {
      return true;
    } else {
      console.error('Fallback: Copying text failed');
      return false;
    }
  } catch (err) {
    console.error('Fallback: Unable to copy', err);
    return false;
  } finally {
    document.body.removeChild(textArea);
  }
};

// Kopyalama işlemi için birleşik fonksiyon
const copyToClipboard = (text, successMessage) => {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    navigator.clipboard.writeText(text)
      .then(() => {
        toast.success(successMessage);
      })
      .catch(err => {
        console.error("Modern API failed, trying fallback", err);
        if (fallbackCopyTextToClipboard(text)) {
          toast.success(successMessage);
        } else {
          toast.info(text);
        }
      });
  } else {
    // Modern API yok, fallback'i dene
    if (fallbackCopyTextToClipboard(text)) {
      toast.success(successMessage);
    } else {
      toast.info(text);
    }
  }
};

// Add this CSS to style the highlighted transports
const getHighlightStyle = (isHighlighted, isInOnHoldModal) => {
  if (!isHighlighted) return '';
  
  if (isInOnHoldModal) {
    return 'border-2 border-yellow-400 shadow-yellow-200 animate-pulse';
  }
  
  return 'ring-2 ring-yellow-400 shadow-yellow-200 animate-pulse';
};

export default function DraggableTransport({
  transport,
  isInDateRange,
  onUnassign,
  isFirst,
  isLast,
  onMoveUp,
  onMoveDown,
  onEdit,
  isReordering,
  onDelete,
  onHold,
  onActivate,
  slot,
  isHighlighted = false,
  isInOnHoldModal = false
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `transport-${transport.id}`,
      data: {
        type: "transport",
        transport,
      },
    });

  const style = {
    transform: CSS.Translate.toString(transform),
    opacity: isDragging ? 0.5 : 1,
  };

  const [isTimelineOpen, setIsTimelineOpen] = useState(false);
  const [isNoteModalOpen, setIsNoteModalOpen] = useState(false);
  const [notes, setNotes] = useState([]);
  const [tarModalConfig, setTarModalConfig] = useState({ isOpen: false, type: null });
  const router = useRouter();
  const [scrCpuStatus, setScrCpuStatus] = useState(transport.scrCpuStatus);
  const [scrCpuColor, setScrCpuColor] = useState(transport.scrCpuColor);
  const [isScrcpuModalOpen, setIsScrcpuModalOpen] = useState(false);
  const [scrCpuRequired, setScrCpuRequired] = useState(transport.requiresScrCpu);
  const [isScrCpuAssignedToDriver, setIsScrCpuAssignedToDriver] = useState(transport.scrCpuAssignedToDriver || false);
  const dispatch = useDispatch();
  const [isAssignDriverModalOpen, setIsAssignDriverModalOpen] = useState(false);
  const [currentSlotData, setCurrentSlotData] = useState(slot);
  const [isScrCpuReminderOpen, setIsScrCpuReminderOpen] = useState(false);
  const [reminderTimeLeft, setReminderTimeLeft] = useState(5);
  const allSlots = useAppSelector(state => state.planning.slots);
  const [showSlotDropdown, setShowSlotDropdown] = useState(false);
  const slotDropdownRef = useRef(null);
  const { slots, selectedDate, drivers, trailers, trucks } = useAppSelector(state => state.planning);
  const { on, off } = useSocket(); // Add this line to get socket hooks
  
  const [isCutModalOpen, setIsCutModalOpen] = useState(false);
  
  // Listen for real-time WebSocket updates on transport changes
  useEffect(() => {
    const handleTransportUpdate = (updatedTransport) => {
      // Only update if this is the same transport
      if (updatedTransport.id === transport.id) {
        console.log('WebSocket: Received transport update for current transport:', updatedTransport);
        
        // Update SCR/CPU states when transport is updated via WebSocket
        if (updatedTransport.scrCpuStatus !== scrCpuStatus) {
          setScrCpuStatus(updatedTransport.scrCpuStatus);
        }
        
        if (updatedTransport.scrCpuColor !== scrCpuColor) {
          setScrCpuColor(updatedTransport.scrCpuColor);
        }
        
        if (updatedTransport.requiresScrCpu !== scrCpuRequired) {
          setScrCpuRequired(updatedTransport.requiresScrCpu);
        }
        
        if (updatedTransport.scrCpuAssignedToDriver !== isScrCpuAssignedToDriver) {
          setIsScrCpuAssignedToDriver(updatedTransport.scrCpuAssignedToDriver);
        }
      }
    };
    
    // Subscribe to transport:update events
    const cleanup = on('transport:update', handleTransportUpdate);
    
    return () => {
      // Cleanup listener when component unmounts
      cleanup();
    };
  }, [transport.id, on, scrCpuStatus, scrCpuColor, scrCpuRequired, isScrCpuAssignedToDriver]);
  
  // Keep local state in sync with incoming transport props
  useEffect(() => {
    setScrCpuStatus(transport.scrCpuStatus);
    setScrCpuColor(transport.scrCpuColor);
    setScrCpuRequired(transport.requiresScrCpu);
    setIsScrCpuAssignedToDriver(transport.scrCpuAssignedToDriver || false);
  }, [transport.scrCpuStatus, transport.scrCpuColor, transport.requiresScrCpu, transport.scrCpuAssignedToDriver]);
  
  // Tarih formatını düzelt - Redux store'da ISO string'in tamamı kullanılıyor olabilir
  const currentDateStr = useMemo(() => {
    if (!selectedDate) return new Date().toISOString();
    
    // Tarih nesnesini oluştur ve gece yarısına ayarla (UTC)
    const date = new Date(selectedDate);
    date.setUTCHours(0, 0, 0, 0);
    
    // UTC formatında ISO string döndür
    return date.toISOString();
  }, [selectedDate]);
  
  // Mevcut tarih için tüm slotları filtrele
  const currentSlots = useMemo(() => {
    // Tüm slot anahtarlarını kontrol et
    console.log('Current Date:', currentDateStr);
    console.log('Slot Keys:', Object.keys(slots));
    
    // CompactDayView'da olduğu gibi currentDateStr'yi kullan
    const altDateStr = startOfDay(new Date(selectedDate)).toISOString();
    console.log('Alternative Date String:', altDateStr);
    
    // Önce doğrudan tarih anahtarını dene
    if (slots[altDateStr]) {
      console.log('Found slots with alternative date string:', slots[altDateStr]);
      return slots[altDateStr];
    }
    
    // Eğer doğrudan bulunamazsa, tarih kısmını içeren anahtarı bul
    const matchingDateKey = Object.keys(slots).find(key => 
      key.includes(altDateStr.split('T')[0])
    );
    
    console.log('Matching Date Key:', matchingDateKey);
    
    // Eğer eşleşen anahtar yoksa, boş dizi döndür
    if (!matchingDateKey) {
      console.log('No matching date key found');
      
      // Son çare olarak, allSlots'tan mevcut tarihe ait slotları bul
      console.log('Checking allSlots as last resort');
      console.log('allSlots:', allSlots);
      
      // allSlots'un yapısını kontrol et
      if (typeof allSlots === 'object' && allSlots !== null) {
        // Tüm slotları düz bir diziye dönüştür
        const allSlotsArray = Object.values(allSlots).flat();
        console.log('All Slots Array:', allSlotsArray);
        
        // Mevcut tarihe ait slotları filtrele
        const filteredSlots = allSlotsArray.filter(s => {
          if (!s || !s.date) return false;
          const slotDate = new Date(s.date).toISOString().split('T')[0];
          const currentDate = altDateStr.split('T')[0];
          return slotDate === currentDate;
        });
        
        console.log('Filtered Slots from allSlots:', filteredSlots);
        return filteredSlots;
      }
      
      return [];
    }
    
    const dateSlots = slots[matchingDateKey];
    console.log('Available Slots:', dateSlots);
    
    // Eğer dateSlots bir dizi değilse ve transports özelliği varsa
    if (dateSlots && !Array.isArray(dateSlots) && dateSlots.transports) {
      return dateSlots.transports;
    }
    
    // Eğer dateSlots bir dizi ise, doğrudan kullan
    return Array.isArray(dateSlots) ? dateSlots : [];
  }, [slots, currentDateStr, selectedDate, allSlots]);

  // Redux store'dan güncel transport verisini al
  const currentTransport = useSelector(state => 
    state.planning.transports.find(t => t.id === transport.id)
  );

  const isSpecialLocation = (locationName) => {
    const specialKeywords = [
      "SCAN LO",
      "SCAN RO",
      "SCAN",
     // "SCAN+FYSIEKE", SAATLI OLDUGU ICIN GOZUKMELI
      "CERTIWEIGHT",
      "DOUANE STOP",
      "FAVV LO",
      "FAVV KEURPUNT MERKSEM",
      "FAVV",
    ];
    return specialKeywords.some((keyword) => {
      return locationName?.toUpperCase().includes(keyword.toUpperCase());
    });
  };

  const getFirstNormalDestinationTime = (destinations) => {
    const firstNormalDest = destinations.find(
      (dest) => !isSpecialLocation(dest.frequentLocation?.name)
    );

    return firstNormalDest?.destinationTime
      ? firstNormalDest.destinationTime.substring(11, 16)
      : "";
  };

  const handleDelete = () => {
    onDelete(transport);
  };

  // Notları getir
  const fetchNotes = async () => {
    try {
      const response = await fetch(`/api/transport-notes?transportId=${transport.id}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setNotes(data);
    } catch (error) {
      console.error('Error fetching notes:', error);
    }
  };

  useEffect(() => {
    fetchNotes();
  }, [transport.id]);

  // Redux'taki notelar değiştiğinde local state'i güncelle
  useEffect(() => {
    if (currentTransport?.notes) {
      setNotes(currentTransport.notes);
    }
  }, [currentTransport?.notes]);

  const handleScrCpuToggle = async () => {
    try {
      // Provide immediate visual feedback
      const newRequiredState = !scrCpuRequired;
      setScrCpuRequired(newRequiredState);
      
      // Update status and color immediately based on the new required state
      if (newRequiredState) {
        setScrCpuStatus('SCRCPUNOK');
        setScrCpuColor('RED');
      } else {
        setScrCpuStatus(null);
        setScrCpuColor(null);
      }
      
      const response = await fetch(`/api/transports/${transport.id}/scrcpu-requirement`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ requiresScrCpu: newRequiredState }),
      });

      if (!response.ok) {
        // Revert changes if the request failed
        setScrCpuRequired(!newRequiredState);
        setScrCpuStatus(transport.scrCpuStatus);
        setScrCpuColor(transport.scrCpuColor);
        throw new Error('Failed to update SCR/CPU requirement');
      }

      toast.success('SCR/CPU requirement updated');
    } catch (error) {
      console.error('Error updating SCR/CPU requirement:', error);
      toast.error('Failed to update SCR/CPU requirement');
    }
  };

  // T1 durum değişikliği için state
  const [t1Required, setT1Required] = useState(transport.requiresT1);
  const [t1Received, setT1Received] = useState(transport.t1Received);

  // Redux store'dan her zaman taze T1 durumlarını al
  const currentT1Required = currentTransport?.requiresT1 || false;
  const currentT1Received = currentTransport?.t1Received || false;

  // T1 durumu için handler
  const handleT1Toggle = async () => {
    try {
      // T1 gerekli durum değişikliği
      const response = await fetch(`/api/planning/transports/${transport.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          requiresT1: !currentT1Required, // Mevcut durumun tersi
          t1Received: false // T1 gerekli durum değiştiğinde, t1Received'ı sıfırla
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update T1 requirement');
      }
      
      // Redux store'u güncelle - önemli
      const planningRes = await fetch('/api/planning');
      if (!planningRes.ok) throw new Error('Failed to fetch planning data');
      
      const planningData = await planningRes.json();
      dispatch({ type: 'planning/updateTransportsAndSlots', payload: planningData });
      
      toast.success('T1 requirement updated');
    } catch (error) {
      console.error('Error updating T1 requirement:', error);
      toast.error('Failed to update T1 requirement');
    }
  };

  // T1 alındı durumu için handler
  const handleT1Received = async () => {
    try {
      const response = await fetch(`/api/planning/transports/${transport.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          t1Received: !currentT1Received // Mevcut durumun tersi
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to update T1 received status');
      }
      
      // Redux store'u güncelle - önemli
      const planningRes = await fetch('/api/planning');
      if (!planningRes.ok) throw new Error('Failed to fetch planning data');
      
      const planningData = await planningRes.json();
      dispatch({ type: 'planning/updateTransportsAndSlots', payload: planningData });
      
      toast.success('T1 received status updated');
    } catch (error) {
      console.error('Error updating T1 received status:', error);
      toast.error('Failed to update T1 received status');
    }
  };

  const handleOpenModal = async () => {
    try {
      // Slot'ta driver ve truck kontrolü
      if (!slot?.driver || !slot?.truck) {
        toast.error('Please assign both driver and truck to the slot before sending transport to driver');
        return;
      }

      // Trailer kontrolü
      if (!transport.trailer) {
        toast.error('Please assign a trailer to the transport before sending to driver');
        return;
      }

      // Transport'un tüm destination tarihlerini kontrol et
      const destinationDates = transport.destinations.map(d => 
        format(new Date(d.destinationDate), 'yyyy-MM-dd')
      );

      // Her tarih için driver ve truck kontrolü yap
      const availabilityResponse = await fetch('/api/planning/slots/check-availability', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          dates: destinationDates,
          driverId: slot.driver.id,
          truckId: slot.truck.id,
          excludeTransportId: transport.id
        })
      });

      const { available, conflicts } = await availabilityResponse.json();

      if (!available) {
        toast.error(
          `Cannot assign: ${conflicts.map(c => {
            const assignment = c.assignments[0];
            return `${assignment.driverName} and ${assignment.truckName} are already assigned to another transport in Slot #${assignment.slotNumber} on ${format(new Date(c.date), 'dd/MM/yyyy')}`;
          }).join(' and ')}`
        );
        return;
      }

      await fetchCurrentSlotData();
      setIsAssignDriverModalOpen(true);
    } catch (error) {
      console.error('Error checking availability:', error);
      toast.error('Failed to check driver and truck availability');
    }
  };

  const handleAssignDriver = async () => {
    try {
      // Transport'un tüm slot atamalarını kontrol et
      const slotsResponse = await fetch(`/api/planning/transports/${transport.id}/slots`);
      const { slots } = await slotsResponse.json();
      
      // Slot ataması olmayan tarih var mı kontrol et
      const hasUnassignedSlots = slots.some(slotAssignment => !slotAssignment.slot);
      
      if (hasUnassignedSlots) {
        toast.error('Please assign all transport dates to slots before sending to driver');
        return;
      }

      // Truck ve driver'ın başka bir slotta atanmış olup olmadığını kontrol et
      if (slot.driver && slot.truck) {
        // Transport'un tüm günlerinde kontrol yap
        for (const slotAssignment of slots) {
          if (!slotAssignment.slot) continue;
          
          const slotDate = new Date(slotAssignment.date).toISOString().split('T')[0];
          
          // Driver kontrolü - aynı transport'a ait slotları hariç tut
          const driverCheckResponse = await fetch(
            `/api/planning/slots/check-driver?date=${slotDate}&driverId=${slot.driver.id}&excludeTransportId=${transport.id}`
          );
          const driverCheckResult = await driverCheckResponse.json();
          
          if (driverCheckResult.isAssigned) {
            toast.error(`Driver is already assigned to another transport on ${new Date(slotDate).toLocaleDateString()}`);
            return;
          }
          
          // Truck kontrolü - aynı transport'a ait slotları hariç tut
          const truckCheckResponse = await fetch(
            `/api/planning/slots/check-truck?date=${slotDate}&truckId=${slot.truck.id}&excludeTransportId=${transport.id}`
          );
          const truckCheckResult = await truckCheckResponse.json();
          
          if (truckCheckResult.isAssigned) {
            toast.error(`Truck is already assigned to another transport on ${new Date(slotDate).toLocaleDateString()}`);
            return;
          }
        }
      }

      await dispatch(updateTransportCurrentStatus({
        transportId: transport.id,
        currentStatus: 'ONGOING',
        sentToDriver: true,
        sourceSlotId: slot.id
      })).unwrap();
      
      setIsAssignDriverModalOpen(false);
      toast.success('Transport sent to driver successfully');
      
      // SCR-CPU hatırlatması göster (import ve SCR-CPU gerekli ise)
      if (transport.type === 'IMPORT' && transport.requiresScrCpu) {
        setIsScrCpuReminderOpen(true);
        setReminderTimeLeft(5);
        
        // 5 saniye sonra otomatik kapanma için zamanlayıcı
        const timer = setInterval(() => {
          setReminderTimeLeft(prev => {
            if (prev <= 1) {
              clearInterval(timer);
              setIsScrCpuReminderOpen(false);
              return 0;
            }
            return prev - 1;
          });
        }, 1000);
      }
    } catch (error) {
      console.error('Error:', error);
      toast.error('Failed to send transport to driver');
    }
  };

  const handleUnassignFromDriver = async () => {
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

      // Redux store'u güncelle
      const planningRes = await fetch('/api/planning');
      if (!planningRes.ok) throw new Error('Failed to fetch planning data');
      
      const planningData = await planningRes.json();
      dispatch({ type: 'planning/updateTransportsAndSlots', payload: planningData });

      toast.success('Transport unassigned from driver');
    } catch (error) {
      toast.error('Failed to unassign transport from driver');
    }
  };

  const handleUnassignFromTruck = async () => {
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

      // Redux store'u güncelle
      const planningRes = await fetch('/api/planning');
      if (!planningRes.ok) throw new Error('Failed to fetch planning data');
      
      const planningData = await planningRes.json();
      dispatch({ type: 'planning/updateTransportsAndSlots', payload: planningData });

      toast.success('Transport unassigned from truck');
    } catch (error) {
      toast.error('Failed to unassign transport from truck');
    }
  };

  const fetchCurrentSlotData = async () => {
    try {
      const response = await fetch(`/api/planning/slots/${slot.id}`);
      const data = await response.json();
      if (!response.ok) throw new Error('Failed to fetch slot data');
      setCurrentSlotData(data);
    } catch (error) {
      console.error('Error fetching slot data:', error);
      toast.error('Failed to fetch updated slot data');
      setCurrentSlotData(slot); // Hata durumunda mevcut slot'u kullan
    }
  };

  const handleCompleteTransport = async () => {
    try {
      await dispatch(updateTransportCurrentStatus({
        transportId: transport.id,
        currentStatus: 'COMPLETED',
        sentToDriver: true,
        sourceSlotId: slot.id
      })).unwrap();
      
      // Redux store'u güncelle
      const planningRes = await fetch('/api/planning');
      if (!planningRes.ok) throw new Error('Failed to fetch planning data');
      
      const planningData = await planningRes.json();
      dispatch({ type: 'planning/updateTransportsAndSlots', payload: planningData });
      
      toast.success('Transport completed successfully');
    } catch (error) {
      console.error('Error completing transport:', error);
      toast.error('Failed to complete transport');
    }
  };

  const handleMarkAsOngoing = async () => {
    try {
      await dispatch(updateTransportCurrentStatus({
        transportId: transport.id,
        currentStatus: 'ONGOING',
        sentToDriver: true,
        sourceSlotId: slot.id
      })).unwrap();
      
      // Redux store'u güncelle
      const planningRes = await fetch('/api/planning');
      if (!planningRes.ok) throw new Error('Failed to fetch planning data');
      
      const planningData = await planningRes.json();
      dispatch({ type: 'planning/updateTransportsAndSlots', payload: planningData });
      
      toast.success('Transport marked as ongoing successfully');
    } catch (error) {
      console.error('Error marking transport as ongoing:', error);
      toast.error('Failed to mark transport as ongoing');
    }
  };

  // TAR güncellemesi için yeni fonksiyon
  const handleTarUpdate = (updatedTransport) => {
    // TAR update edildiğinde lokal state'i güncelle
    console.log('TAR updated:', updatedTransport);
  };

  // Not modalı açıldığında notları yenile
  const handleOpenNoteModal = () => {
    // Not modalını açmadan önce notları yeniden çek
    fetchNotes();
    setIsNoteModalOpen(true);
  };

  const handleScrCpuDriverAssignment = async () => {
    try {
      // Provide immediate visual feedback to the current user
      const newAssignmentState = !isScrCpuAssignedToDriver;
      setIsScrCpuAssignedToDriver(newAssignmentState);
      
      // If assigning to driver, update the color as well
      if (newAssignmentState) {
        setScrCpuColor('GREEN');
      }
      
      const response = await fetch(`/api/transports/${transport.id}/scrcpu-driver-assignment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          scrCpuAssignedToDriver: newAssignmentState 
        }),
      });

      if (!response.ok) {
        // Revert changes if the request failed
        setIsScrCpuAssignedToDriver(!newAssignmentState);
        if (newAssignmentState) {
          setScrCpuColor(transport.scrCpuColor);
        }
        throw new Error('Failed to update SCR/CPU driver assignment');
      }

      const updatedTransport = await response.json();
      
      toast.success(
        newAssignmentState 
          ? 'SCR/CPU assigned to driver successfully' 
          : 'SCR/CPU unassigned from driver'
      );
    } catch (error) {
      console.error('Error updating SCR/CPU driver assignment:', error);
      toast.error('Failed to update SCR/CPU driver assignment');
    }
  };

  // Transport durumu değiştiğinde SCR/CPU durumunu kontrol et
  useEffect(() => {
    // Eğer transport PLANNED durumuna geçerse, SCR/CPU driver assignment'ı false yap
    if (transport.currentStatus === 'PLANNED' && isScrCpuAssignedToDriver) {
      handleResetScrCpuDriverAssignment();
    }
  }, [transport.currentStatus]);

  // SCR/CPU driver assignment'ı sıfırla
  const handleResetScrCpuDriverAssignment = async () => {
    try {
      const response = await fetch(`/api/transports/${transport.id}/scrcpu-driver-assignment`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          scrCpuAssignedToDriver: false 
        }),
      });

      if (!response.ok) throw new Error('Failed to reset SCR/CPU driver assignment');

      // Lokal state'i güncelle
      setIsScrCpuAssignedToDriver(false);
      
      // Redux store'u güncelle
      const planningRes = await fetch('/api/planning');
      if (!planningRes.ok) throw new Error('Failed to fetch planning data');
      
      const planningData = await planningRes.json();
      dispatch({ type: 'planning/updateTransportsAndSlots', payload: planningData });
    } catch (error) {
      console.error('Error resetting SCR/CPU driver assignment:', error);
    }
  };

  // Slot dropdown dışına tıklandığında kapanması için
  useEffect(() => {
    function handleClickOutside(event) {
      if (slotDropdownRef.current && !slotDropdownRef.current.contains(event.target)) {
        setShowSlotDropdown(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Modal states
  const [unassignDriverModal, setUnassignDriverModal] = useState({
    isOpen: false,
    targetSlotId: null,
    onConfirm: null
  });
  
  // Add state for trailer change confirmation modal
  const [trailerChangeModal, setTrailerChangeModal] = useState({
    isOpen: false,
    trailerId: null,
    selectedTrailer: null
  });
  
  // Ongoing/completed transport unassign modal
  const [unassignConfirmModal, setUnassignConfirmModal] = useState({
    isOpen: false,
    onConfirm: null
  });

  // Transport'u başka bir slot'a taşıma
  const handleMoveToSlot = async (targetSlotId) => {
    // Eğer transport zaten bu slotta ise, işlem yapma
    if (slot && targetSlotId === slot.id) {
      setShowSlotDropdown(false);
      return;
    }

    try {
      // Hedef slot'u tam bilgilerle birlikte getir
      // Önce API'den slot'un tam bilgilerini al
      const slotResponse = await fetch(`/api/planning/slots/${targetSlotId}`);
      if (!slotResponse.ok) {
        throw new Error('Failed to get slot details');
      }
      const targetSlotDetails = await slotResponse.json();
      
      // Yerel verileri de al - eğer API ile farklılık varsa, API verisi tercih edilir
      const localTargetSlot = currentSlots.find(s => s.id === targetSlotId);
      
      // İki veri kaynağını birleştir - API'den gelen veri tercih edilir
      const targetSlot = {
        ...localTargetSlot,
        ...targetSlotDetails,
        // Eğer driver varsa, direkt olarak drivers state'inden tam driver nesnesini ekle
        driver: targetSlotDetails.driverId ? 
          drivers.find(d => d.id === targetSlotDetails.driverId) || targetSlotDetails.driver : 
          null,
        // Eğer truck varsa, direkt olarak trucks state'inden tam truck nesnesini ekle
        truck: targetSlotDetails.truckId ? 
          trucks.find(t => t.id === targetSlotDetails.truckId) || targetSlotDetails.truck : 
          null
      };
      
      console.log('Complete Target Slot Info:', targetSlot);
      
      // Eğer transport bir driver'a atanmışsa, kullanıcıya sor
      if (transport.sentToDriver) {
        setUnassignDriverModal({
          isOpen: true,
          targetSlotId,
          onConfirm: async () => {
            try {
              // Önce driver'dan unassign et
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
              
              toast.info('Transport unassigned from driver and ETAs reset');
              
              // Mevcut slot'tan kaldır ve yeni slot'a taşı (tek bir API çağrısı ile)
              const response = await fetch(`/api/planning/transports/assign`, {
                method: 'PUT',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                  transportId: transport.id,
                  slotId: targetSlotId,
                  date: selectedDate, 
                  forceMove: true, // Zorla taşıma işareti
                }),
              });
              
              if (!response.ok) {
                throw new Error('Failed to move transport');
              }
              
              // Redux store'u güncellerken, güncel veriyi döndüren API yanıtını kullan
              const updatedTransport = await response.json();
              
              // WebSocket üzerinden diğer kullanıcılara iletilen güncelleme, lokal olarak da Redux store'a uygula
              dispatch(updateTransportsAndSlots({
                transportUpdates: [updatedTransport],
                type: 'update'
              }));
              
              toast.success('Transport moved successfully');
            } catch (error) {
              console.error('Error unassigning transport from driver:', error);
              toast.error('Failed to unassign transport from driver');
            } finally {
              setUnassignDriverModal({ isOpen: false, targetSlotId: null, onConfirm: null });
            }
          }
        });
        return;
      }

      // ADR kontrolü - Hedef slotta driver varsa
      if (targetSlot && targetSlot.driver) {
        console.log('Target Slot Driver for ADR check:', targetSlot.driver);
        
        // ADR validasyonu için planningValidations kullan
        const adrValidations = await planningValidations.validateTransportAssignment(
          transport,
          targetSlot,
          targetSlot.driver
        );
        
        console.log('ADR Validations:', adrValidations);
        
        if (adrValidations.length > 0) {
          const canProceed = await handleValidationResults(adrValidations);
          if (!canProceed) {
            setShowSlotDropdown(false);
            return;
          }
        }
      }

      // Genset kontrolü - Eğer transport genset gerektiriyorsa ve targetSlot'ta truck varsa
      if (transport.genset === 'YES' && targetSlot && targetSlot.truck) {
        console.log('Transport requires genset and target slot has truck:', targetSlot.truck);
        
        // Genset validasyonu
        const gensetValidations = await planningValidations.validateTransportGensetRequirement(
          transport,
          targetSlot
        );
        
        console.log('Genset Validations:', gensetValidations);
        
        if (gensetValidations.length > 0) {
          const canProceed = await handleValidationResults(gensetValidations);
          if (!canProceed) {
            setShowSlotDropdown(false);
            return;
          }
        }
      }

      await moveTransportToSlot(targetSlotId);
    } catch (error) {
      console.error('Error moving transport:', error);
      toast.error('Failed to move transport');
    } finally {
      setShowSlotDropdown(false);
    }
  };

  // Actual transport move function
  const moveTransportToSlot = async (targetSlotId) => {
    try {
      // Önce mevcut slot bilgisini al
      const currentSlotAssignment = transport.slotAssignments?.find(
        assignment => new Date(assignment.date).toDateString() === new Date(currentDateStr).toDateString()
      );
      
      console.log('Current slot assignment:', currentSlotAssignment);
      console.log('Target slot ID:', targetSlotId);
      
      // Doğrudan yeni slot'a taşı (tek bir API çağrısı ile)
      const response = await fetch(`/api/planning/transports/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transportId: transport.id,
          slotId: targetSlotId,
          date: selectedDate, // Normal sürükle-bırak işleminde olduğu gibi selectedDate kullan
          forceMove: true, // Zorla taşıma işareti
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to move transport');
      }

      // Redux store'u güncellerken, güncel veriyi döndüren API yanıtını kullan
      const updatedTransport = await response.json();
      
      // WebSocket üzerinden diğer kullanıcılara iletilen güncelleme, lokal olarak da Redux store'a uygula
      dispatch(updateTransportsAndSlots({
        transportUpdates: [updatedTransport],
        type: 'update'
      }));

      toast.success('Transport moved successfully');
    } catch (error) {
      console.error('Error moving transport:', error);
      toast.error('Failed to move transport');
    }
  };

  // Get all transports from the Redux store
  const allTransports = useSelector(state => state.planning.transports);

  // Add this function to handle trailer selection
  const handleTrailerChange = async (trailerId) => {
    try {
      // ON_HOLD durumunda trailer değişikliğini engelle
      if (transport.status === "ON_HOLD") {
        toast.error("Cannot change trailer while transport is on hold");
        return;
      }

      // Eğer aynı trailer seçildiyse hiçbir şey yapma
      if (trailerId === transport.trailer?.id) {
        return;
      }
      
      // If no trailer is selected, just unassign
      if (!trailerId) {
        // If transport is ongoing, show confirmation modal
        if (transport.currentStatus === 'ONGOING') {
          setTrailerChangeModal({
            isOpen: true,
            trailerId: null,
            selectedTrailer: null
          });
          return;
        }
        
        await dispatch(updateTransportTrailer({
          transportId: transport.id,
          trailerId: null
        })).unwrap();
        
        toast.success('Trailer unassigned successfully');
        return;
      }
      
      // Find the selected trailer
      const selectedTrailer = trailers.find(t => t.id === trailerId);
      if (!selectedTrailer) {
        toast.error('Selected trailer not found');
        return;
      }
      
      // Transportun tarihlerini al
      const transportDates = [];
      
      // Add departure date if it exists
      if (transport.departureDate) {
        transportDates.push(new Date(transport.departureDate).toISOString().split('T')[0]);
      }
      
      // Add return date if it exists
      if (transport.returnDate) {
        transportDates.push(new Date(transport.returnDate).toISOString().split('T')[0]);
      }
      
      // Add destination dates if they exist
      if (transport.destinations && transport.destinations.length > 0) {
        transport.destinations.forEach(dest => {
          if (dest.destinationDate) {
            transportDates.push(new Date(dest.destinationDate).toISOString().split('T')[0]);
          }
        });
      }
      
      // If no dates found, use today's date
      if (transportDates.length === 0) {
        transportDates.push(new Date().toISOString().split('T')[0]);
      }
      
      // Her tarih için kontrol et
      for (const date of transportDates) {
        if (isTrailerInUseOnDate(trailerId, allTransports, transport.id, date)) {
          toast.error(`This trailer is already assigned to another ongoing transport on ${new Date(date).toLocaleDateString()}`);
          return;
        }
      }
      
      // If transport is ongoing, show confirmation modal
      if (transport.currentStatus === 'ONGOING') {
        setTrailerChangeModal({
          isOpen: true,
          trailerId,
          selectedTrailer
        });
        return;
      }
      
      // Check if transport requires genset but trailer doesn't have one
      if (transport.genset === 'YES' && selectedTrailer.genset === 'NO') {
        // Get the truck in the slot
        const truckHasGenset = slot?.truck?.genset === 'YES';
        
        // If neither trailer nor truck has genset, show warning
        if (!truckHasGenset) {
          const validations = await planningValidations.validateGensetRequirement(transport, selectedTrailer);
          const canProceed = await handleValidationResults(validations);
          if (!canProceed) return;
        }
      }
      
      await dispatch(updateTransportTrailer({
        transportId: transport.id,
        trailerId: trailerId
      })).unwrap();
      
      toast.success('Trailer assigned successfully');
    } catch (error) {
      console.error('Error updating trailer:', error);
      toast.error('Failed to update trailer');
    }
  };

  // Add function to handle trailer change confirmation
  const handleConfirmTrailerChange = async () => {
    try {
      const { trailerId, selectedTrailer } = trailerChangeModal;
      
      // Check if transport requires genset but trailer doesn't have one
      if (trailerId && selectedTrailer && transport.genset === 'YES' && selectedTrailer.genset === 'NO') {
        // Get the truck in the slot
        const truckHasGenset = slot?.truck?.genset === 'YES';
        
        // If neither trailer nor truck has genset, show warning
        if (!truckHasGenset) {
          const validations = await planningValidations.validateGensetRequirement(transport, selectedTrailer);
          const canProceed = await handleValidationResults(validations);
          if (!canProceed) {
            setTrailerChangeModal({ isOpen: false, trailerId: null, selectedTrailer: null });
            return;
          }
        }
      }
      
      await dispatch(updateTransportTrailer({
        transportId: transport.id,
        trailerId: trailerId
      })).unwrap();
      
      toast.success(trailerId ? 'Trailer assigned successfully' : 'Trailer unassigned successfully');
      setTrailerChangeModal({ isOpen: false, trailerId: null, selectedTrailer: null });
    } catch (error) {
      console.error('Error updating trailer:', error);
      toast.error('Failed to update trailer');
      setTrailerChangeModal({ isOpen: false, trailerId: null, selectedTrailer: null });
    }
  };

  // Kesme işlemi tamamlandığında çağrılacak fonksiyon
  const handleCutComplete = (result) => {
    toast.success(`Transport ${transport.transportOrderNumber} has been cut successfully`);
    // Burada gerekirse Redux store'u güncelleyebilirsiniz
    // Örneğin: dispatch(fetchPlanningData());
  };

  // Unassign işlemi için wrapper fonksiyon
  const handleUnassign = (transport) => {
    // Transport ONGOING veya COMPLETED durumundaysa uyarı göster
    if (transport.currentStatus === 'ONGOING' || transport.currentStatus === 'COMPLETED') {
      setUnassignDriverModal({
        isOpen: true,
        targetSlotId: null,
        onConfirm: async () => {
          try {
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
            
            // Transport'u PLANNED durumuna getir
            await dispatch(updateTransportCurrentStatus({
              transportId: transport.id,
              currentStatus: 'PLANNED',
              sentToDriver: false
            })).unwrap();
            
            // Orijinal unassign fonksiyonunu çağır
            onUnassign?.(transport);
            
            // Modal'ı kapat
            setUnassignDriverModal({ isOpen: false, targetSlotId: null, onConfirm: null });
            
            // Başarı mesajı
            toast.success('Transport unassigned and ETAs reset');
            
          } catch (error) {
            console.error('Error unassigning transport:', error);
            toast.error('Failed to unassign transport');
            setUnassignDriverModal({ isOpen: false, targetSlotId: null, onConfirm: null });
          }
        }
      });
    } else {
      // Normal unassign işlemini çağır
      onUnassign?.(transport);
    }
  };

  // TAR düğmesine tıklandığında, TAR modali açılır
  const handleTarClick = (e, type) => {
    e.stopPropagation();
    setTarModalConfig({
      isOpen: true,
      type,
      onUpdate: (updatedTransport) => {
        console.log('Transport TAR updated:', updatedTransport);
        // Burada updateTransportsAndSlots çağırmaya gerek yok
        // Bu, TransportTarModal içinde zaten yapılıyor
      }
    });
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        data-transport-id={transport.id}
        className={cn(
          "bg-white rounded-lg border group relative transport-item",
          isDragging ? "border-blue-500 shadow-lg" : "border-gray-200",
          isReordering ? "opacity-50" : "",
          isInDateRange ? "opacity-600" : "",
          isHighlighted && isInOnHoldModal && "border-2 border-yellow-400 shadow-md shadow-yellow-200 animate-pulse",
          isHighlighted && !isInOnHoldModal && "ring-2 ring-yellow-400 shadow-md shadow-yellow-200"
        )}
      >
        {/* Move Up/Down butonları - Kenarlar */}
        {slot && (
          <div className="absolute -left-2 top-1/2 -translate-y-1/2 flex flex-col gap-0.5 z-10">
            <button
              onClick={(e) => {
    e.stopPropagation();
                onMoveUp?.(transport);
              }}
              disabled={isFirst}
              className={`p-0.5 rounded-full bg-white border border-gray-200 
                hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 shadow-sm
                ${
                  isFirst
                    ? "text-gray-300 cursor-not-allowed hover:bg-white"
                    : "text-gray-500 hover:text-blue-500 hover:border-blue-300"
                }`}
              title="Move up"
            >
              <FiChevronUp className="w-1.5 h-1.5" />
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onMoveDown?.(transport);
              }}
              disabled={isLast}
              className={`p-0.5 rounded-full bg-white border border-gray-200 
                hover:bg-gray-100 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-20 shadow-sm
                ${
                  isLast
                    ? "text-gray-300 cursor-not-allowed hover:bg-white"
                    : "text-gray-500 hover:text-blue-500 hover:border-blue-300"
                }`}
              title="Move down"
            >
              <FiChevronDown className="w-1.5 h-1.5" />
            </button>
          </div>
        )}

        <div className="px-1 py-0 flex items-center">
          <div className="flex items-center gap-0.5 flex-1 flex-wrap">
            {/* Time bilgisi */}
            <div className="w-6 mr-[4px] xl:mr-2 sm:w-7 text-[8px] sm:text-[10px] font-medium flex-shrink-0">
              <span className={transport.sentToDriver ? "text-sky-500" : "text-gray-900"}>
              {getFirstNormalDestinationTime(transport.destinations)}
              </span>
            </div>

            {/* Departure/Return göstergesi */}
            {(transport.departureDate || transport.returnDate) && (
              <div className="date-tooltip-group relative flex items-center gap-0.5 ml-0">
                {/* Tek tooltip tüm tarihler için */}
                <div className="absolute bottom-full left-0 mb-1 px-1.5 py-0.5 bg-gray-900 text-white text-[8px] 
                  rounded whitespace-nowrap opacity-0 invisible pointer-events-none date-tooltip-group-hover:opacity-100 date-tooltip-group-hover:visible 
                  transition-all duration-200 z-50">
                  {transport.departureDate && (
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <FiTruck className="w-2.5 h-2.5" />
                      <span>Departure: {format(new Date(transport.departureDate), 'dd MMMM yyyy')}</span>
                    </div>
                  )}
                  {transport.returnDate && (
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <FiHome className="w-2.5 h-2.5" />
                      <span>Return: {format(new Date(transport.returnDate), 'dd MMMM yyyy')}</span>
                    </div>
                  )}
                  {transport.destinations?.length > 0 && (
                    <div className="mt-0.5 pt-0.5 border-t border-gray-700">
                      <div className="flex items-center gap-1.5 mb-0.5">
                        <FiMapPin className="w-2.5 h-2.5" />
                        <span>Loading Points:</span>
                      </div>
                      {transport.destinations.map((dest, index) => (
                        <div key={index} className="ml-4 mb-0.5 last:mb-0">
                          <div className="flex items-start gap-0.5">
                            <span className="text-gray-400">{index + 1}.</span>
                            <div>
                              <div>{dest.frequentLocation?.name}</div>
                              {dest.destinationTime && (
                                <div className="text-gray-400">
                                  {format(addHours(new Date(dest.destinationTime), -1), 'dd MMM yyyy HH:mm')}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="absolute top-full left-4 -mt-px border-4 border-transparent border-t-gray-900"></div>
                </div>

                {transport.destinations?.[0]?.destinationTime && (
                  <div className="flex items-center gap-0.5 text-blue-600 bg-blue-50 px-0.5 py-0.5 rounded cursor-help">
                    <FaTruckLoading className="w-2 h-2" />
                    <span className="text-[8px] sm:text-[9px] font-medium">
                      {format(addHours(new Date(transport.destinations[0].destinationTime), -1), 'dd MMM')}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Müşteri */}
            <div className="w-14 sm:w-16 md:w-20 shrink-0 mr-0">
              <div className="text-[8px] sm:text-[10px] font-medium text-orange-600 truncate">
                {transport.client.name}
              </div>
              <div className={`text-[7px] sm:text-[9px] ${
                transport.hasTransportOrder 
                  ? 'font-bold text-gray-700' 
                  : 'text-gray-400'
              }`}>
                {transport.transportOrderNumber}
              </div>
            </div>

            {/* Pick up bilgisi */}
            <div className="flex-shrink-0 w-12 sm:w-14 md:w-[70px] ml-0">
              <div className="text-[7px] sm:text-[9px]">
                <span className="text-gray-500">PU:</span>{" "}
                <span className={`font-medium truncate ${transport.pickUpQuay?.isLoRo === "TBN" ? "text-red-500" : ""}`}>
                  {transport.pickUpQuay?.name}
                </span>
              </div>
            </div>

            {/* Destinations */}
            <div className="w-[70px] sm:w-[100px] md:w-[140px] lg:w-[160px] mr-0 overflow-hidden">
              <div className="text-[7px] sm:text-[9px] text-gray-500 flex items-center gap-0.5">
                <span>Destinations</span>
                {transport.destinations?.length > 1 && (
                  <span className="text-red-600 font-semibold text-[7px] sm:text-[9px]">
                    {transport.destinations.length}x STOP
                  </span>
                )}
              </div>
              <div className="text-[7px] sm:text-[9px] font-medium truncate">
                {transport.destinations?.slice(0, 2).map((dest, index) => {
                  let locationName = "-";
                  let isSpecial = false;

                  if (dest.frequentLocation) {
                    isSpecial = isSpecialLocation(dest.frequentLocation.name);
                    locationName = isSpecial
                      ? dest.frequentLocation.name
                      : `${dest.frequentLocation.name}, ${getCountryCode(
                          dest.frequentLocation.country
                        )} (${dest.frequentLocation.km}km)`;
                  } 

                  return (
                    <span key={dest.id || index}>
                      <span
                        className={
                          isSpecial
                            ? "text-red-600 font-bold tracking-wide"
                            : undefined
                        }
                      >
                        {locationName}
                      </span>
                      {index === 0 && " → "}
                      {index === 1 &&
                        transport.destinations.length > 2 &&
                        " ..."}
                    </span>
                  );
                })}
              </div>
            </div>

            {/* Drop off bilgisi */}
            <div className="flex-shrink-0 w-12 sm:w-14 md:w-[70px] ml-0">
              <div className="text-[7px] sm:text-[9px]">
                <span className="text-gray-500">DO:</span>{" "}
                <span className={`font-medium truncate ${transport.dropOffQuay?.isLoRo === "TBN" ? "text-red-500" : ""}`}>
                  {transport.dropOffQuay?.name}
                </span>
              </div>
            </div>

            {/* Booking Reference ve Container Number */}
            <div className="flex flex-row gap-1 ml-0 mr-1">
              {/* Left column: Booking and Container */}
              <div className="block min-w-[60px] max-w-[80px] sm:max-w-[100px] md:max-w-[120px]">
                <div className="text-[7px] sm:text-[8px] md:text-[9px] text-gray-500 flex items-center">
                  <span className="text-gray-500">Booking:</span>{" "}
                {transport.bookingReference ? (
                  <span
                      className="font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors truncate max-w-[40px] sm:max-w-[60px] md:max-w-[80px]"
                    onClick={(e) => {
    e.stopPropagation();
                      copyToClipboard(
                        transport.bookingReference, 
                        "Booking reference copied to clipboard"
                      );
                    }}
                      title={transport.bookingReference}
                  >
                    {transport.bookingReference}
                  </span>
                ) : (
                    <span className="text-gray-400">-</span>
                )}
              </div>
                <div className="text-[7px] sm:text-[8px] md:text-[9px] text-gray-500 flex items-center">
                <span className="text-gray-500">Container:</span>{" "}
                {transport.containerNumber ? (
                  <span
                      className="font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors truncate max-w-[40px] sm:max-w-[60px] md:max-w-[80px]"
                    onClick={(e) => {
                      e.stopPropagation();
                      copyToClipboard(
                        transport.containerNumber, 
                        "Container number copied to clipboard"
                      );
                    }}
                      title={transport.containerNumber}
                  >
                    {transport.containerNumber}
                  </span>
                ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              </div>
              
              {/* Right column: Loading Ref */}
              <div className="block min-w-[60px] max-w-[80px] sm:max-w-[100px] md:max-w-[120px]">
                <div className="text-[7px] sm:text-[8px] md:text-[9px] text-gray-500 flex items-center">
                  <span className="text-gray-500">Loading Ref:</span>{" "}
                  {transport.loadingUnloadingReference ? (
                    <span
                      className="font-medium text-gray-900 cursor-pointer hover:text-blue-600 transition-colors truncate max-w-[40px] sm:max-w-[60px] md:max-w-[80px]"
                      onClick={(e) => {
                        e.stopPropagation();
                        copyToClipboard(
                          transport.loadingUnloadingReference, 
                          "Loading reference copied to clipboard"
                        );
                      }}
                      title={transport.loadingUnloadingReference}
                    >
                      {transport.loadingUnloadingReference}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </div>
              </div>
              
              {/* Trailer Dropdown - Moved to be next to Loading Ref */}
              <div className="block min-w-[80px] max-w-[100px] sm:max-w-[120px] md:max-w-[140px] ml-1">
                <Listbox
                  value={transport.trailer?.id || ""}
                  onChange={handleTrailerChange}
                  disabled={transport.status === "ON_HOLD"}
                >
                  <div className="relative">
                    <Listbox.Button 
                      className={`relative w-full cursor-pointer rounded-md bg-white py-0.5 pl-2 pr-6 text-left text-[7px] sm:text-[8px] md:text-[9px] leading-4 border border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-1 focus:ring-blue-500 ${transport.status === "ON_HOLD" ? 'opacity-50 cursor-not-allowed' : ''}`}
                      disabled={transport.status === "ON_HOLD"}
                    >
                      <span
                        className={`block truncate ${
                          transport.trailer ? "text-violet-600 font-bold" : ""
                        }`}
                      >
                        {transport.trailer ? (
                          <>
                            {transport.trailer.nickName || transport.trailer.licensePlate}
                            {transport.trailer.genset === "YES" && (
                              <BsSnow2 className="inline-block ml-1 text-blue-500" />
                            )}
                          </>
                        ) : (
                          transport.status === "ON_HOLD" ? "No Trailer" : "Select Trailer"
                        )}
                      </span>
                      <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-1">
                        <HiChevronUpDown
                          className={`h-3 w-3 ${transport.status === "ON_HOLD" ? 'text-gray-300' : 'text-gray-400'}`}
                          aria-hidden="true"
                        />
                      </span>
                    </Listbox.Button>
                    <Transition
                      as={Fragment}
                      enter="transition ease-out duration-100"
                      enterFrom="transform opacity-0 scale-95"
                      enterTo="transform opacity-100 scale-100"
                      leave="transition ease-in duration-75"
                      leaveFrom="transform opacity-100 scale-100"
                      leaveTo="transform opacity-0 scale-95"
                    >
                      <Listbox.Options className="absolute z-10 mt-1 max-h-60 w-[120px] sm:w-[140px] md:w-[160px] overflow-auto rounded-md bg-white py-1 text-[7px] sm:text-[8px] md:text-[9px] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <Listbox.Option
                          value=""
                          className={({ active }) =>
                            `relative cursor-pointer select-none py-1 pl-8 pr-3 ${
                              active
                                ? "bg-blue-50 text-blue-900"
                                : "text-gray-900"
                            }`
                          }
                        >
                          {({ selected, active }) => (
                            <>
                              <span
                                className={`block truncate ${
                                  selected ? "font-medium" : "font-normal"
                                }`}
                              >
                                Select Trailer
                              </span>
                              {selected ? (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                  <HiCheck
                                    className="h-3 w-3"
                                    aria-hidden="true"
                                  />
                                </span>
                              ) : null}
                            </>
                          )}
                        </Listbox.Option>
                        {/* Trailerleri kriterlerimize göre sıralayalım */}
                        {/* 1. GENSET olup olmama durumu (GENSET olanlar önce) */}
                        {/* 2. Alfabetik sıralama (nickName veya licensePlate'e göre) */}
                        {trailers
                          .slice() // Orijinal diziyi değiştirmemek için kopyasını alalım
                          .sort((a, b) => {
                            // Önce GENSET kriterine göre sırala
                            if (a.genset === "YES" && b.genset !== "YES") return -1;
                            if (a.genset !== "YES" && b.genset === "YES") return 1;
                            
                            // GENSET durumu aynıysa, alfabetik sırala
                            const aName = a.nickName || a.licensePlate || "";
                            const bName = b.nickName || b.licensePlate || "";
                            return aName.localeCompare(bName);
                          })
                          .map((trailer) => {
                          // Bugünün tarihini al
                          const today = new Date().toISOString().split('T')[0];
                          
                          // Transportun tarihini al (destination, departure veya return date)
                          let transportDate = today;
                          
                          // Eğer transport'un destination tarihi varsa, onu kullan
                          if (transport.destinations && transport.destinations.length > 0) {
                            const firstDestWithDate = transport.destinations.find(dest => dest.destinationDate);
                            if (firstDestWithDate) {
                              transportDate = new Date(firstDestWithDate.destinationDate).toISOString().split('T')[0];
                            }
                          } 
                          // Eğer destination tarihi yoksa, departure date'i kontrol et
                          else if (transport.departureDate) {
                            transportDate = new Date(transport.departureDate).toISOString().split('T')[0];
                          }
                          // Eğer departure date de yoksa, return date'i kontrol et
                          else if (transport.returnDate) {
                            transportDate = new Date(transport.returnDate).toISOString().split('T')[0];
                          }
                          
                          // Sadece transportun tarihinde trailer'ın kullanımda olup olmadığını kontrol et
                          const inUse = isTrailerInUseOnDate(trailer.id, allTransports, transport.id, transportDate);
                          // Trailer'ın cut transportta olup olmadığını kontrol et
                          const isCut = isTrailerInCutTransport(trailer.id, allTransports);
                          
                          return (
                            <Listbox.Option
                              key={trailer.id}
                              value={trailer.id}
                              disabled={inUse}
                              className={({ active }) =>
                                `relative cursor-pointer select-none py-1 pl-8 pr-3 ${
                                  active
                                    ? inUse ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-blue-50 text-blue-900"
                                    : inUse ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "text-gray-900"
                                }`
                              }
                            >
                              {({ selected, active }) => (
                                <>
                                  <span
                                    className={`block truncate ${
                                      selected ? "font-medium" : "font-normal"
                                    } ${inUse ? "text-gray-400" : "text-violet-600"}`}
                                  >
                                    {trailer.nickName || trailer.licensePlate}
                                    {trailer.genset === "YES" && (
                                      <BsSnow2 className="inline-block ml-1 text-blue-500" />
                                    )}
                                    {inUse && (
                                      <span className={`ml-1 text-[6px] sm:text-[7px] ${isCut ? 'bg-red-100 text-red-500' : 'bg-gray-200 text-gray-500'} px-0.5 py-0.5 rounded`}>
                                        {isCut ? 'Cut' : 'In use'}
                                      </span>
                                    )}
                                  </span>
                                  {selected ? (
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                      <HiCheck
                                        className="h-3 w-3"
                                        aria-hidden="true"
                                      />
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </Listbox.Option>
                          );
                        })}
                      </Listbox.Options>
                    </Transition>
                  </div>
                </Listbox>
              </div>
            </div>

            {/* Konteyner Detayları */}
            <div className="flex items-center gap-0.5 flex-shrink-0 flex-nowrap ml-auto">
              {/* ETA Badge */}
              {getLastEta(transport) && (
                <>
                  <div className={`
                    flex items-center gap-0.5 px-0.5 py-0.5 rounded text-[7px] sm:text-[8px] font-medium
                    ${getLastEta(transport).type === 'dropOff' 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-orange-100 text-orange-800'
                    }
                  `}>
                             {getLastEta(transport).type === 'destination' && transport.destinations.length > 1 && (
                    <span>
                      {getLastEta(transport).order}.
                    </span>
                  )}
                    <FiClock className="w-1.5 h-1.5 sm:w-2 sm:h-2" />
                    <span className="hidden sm:inline">ETA</span> {getLastEta(transport).time}
                  </div>
                </>
              )}
              {transport.containerType && (
                <span className="bg-gray-100 px-0.5 py-0.5 rounded text-gray-600 flex-shrink-0 whitespace-nowrap text-[7px] sm:text-[8px] font-medium">
                  {transport.containerType}
                </span>
              )}
              {isGensetRequired(transport.containerType) && (
                <span className="bg-blue-100 text-blue-700 px-0.5 py-0.5 rounded text-[7px] sm:text-[8px] uppercase font-medium flex-shrink-0">
                  GENSET
                </span>
              )}
              {transport.adr === "YES" && (
                <span className="bg-red-100 text-red-700 px-0.5 py-0.5 rounded text-[7px] sm:text-[8px] uppercase font-medium flex items-center gap-0.5 flex-shrink-0">
                  <FiAlertTriangle className="w-1.5 h-1.5 sm:w-2 sm:h-2" />
                  ADR
                </span>
              )}
              {/* Transport Type */}
              <span className="bg-orange-100 text-orange-700 px-0.5 py-0.5 rounded text-[7px] sm:text-[8px] uppercase font-medium flex-shrink-0">
                {transport.type === "IMPORT" ? "IMP" : transport.type === "EXPORT" ? "EXP" : "SHUNT"}
              </span>
            </div>

            {/* TAR gösterimi */}
            <div className="flex gap-0.5 lg:gap-1 items-center ml-0.5 flex-shrink-0 flex-nowrap">
              {shouldShowTar(currentTransport.pickUpQuay, true) && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTarClick(e, 'pickup');
                  }}
                  className={`text-[7px] sm:text-[8px] lg:text-[9px] font-medium px-0.5 lg:px-1 py-0.5 rounded cursor-pointer hover:opacity-80 flex-shrink-0 ${
                    getTarBadgeStyle(currentTransport, true)
                  }`}
                >
                  {currentTransport.pickUpTar !== null ? currentTransport.pickUpTar : currentTransport.pickUpQuay?.defaultTar}
                </span>
              )}
              {shouldShowTar(currentTransport.dropOffQuay, false) && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    handleTarClick(e, 'dropoff');
                  }}
                  className={`text-[7px] sm:text-[8px] lg:text-[9px] font-medium px-0.5 lg:px-1 py-0.5 rounded cursor-pointer hover:opacity-80 flex-shrink-0 ${
                    getTarBadgeStyle(currentTransport, false)
                  }`}
                >
                  {currentTransport.dropOffTar !== null ? currentTransport.dropOffTar : currentTransport.dropOffQuay?.defaultTar}
                </span>
              )}

              {/* SCR/CPU Badge */}
              {transport.type === 'IMPORT' && scrCpuRequired && (
                <span
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsScrcpuModalOpen(true);
                  }}
                  className={`text-[7px] sm:text-[8px] lg:text-[9px] font-medium px-0.5 lg:px-1 py-0.5 rounded cursor-pointer hover:opacity-80 flex-shrink-0 ${getBadgeStyle(scrCpuColor)}`}
                >
                  {scrCpuStatus}
                </span>
              )}

              {/* T1 Badge */}
              {currentT1Required && (
                <span
                  className={`text-[7px] sm:text-[8px] lg:text-[9px] font-medium px-0.5 lg:px-1 py-0.5 rounded flex-shrink-0 ${
                    currentT1Received 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}
                >
                  {currentT1Received ? 'T1 ✓' : 'T1'}
                </span>
              )}
            </div>

            {/* Edit, Timeline ve Delete butonları */}
            <div className="flex items-center gap-0.5 lg:gap-1 ml-0.5 pr-0.5 lg:pr-2 flex-shrink-0 flex-nowrap">
              {/* Edit button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit?.(transport);
                }}
                className="p-0.5 sm:p-1 lg:p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-blue-500 flex items-center justify-center flex-shrink-0"
              >
                <FiEdit2 className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5" />
              </button>

              {/* Notes button */}
              <button
                onClick={() => handleOpenNoteModal()}
                className={`p-0.5 sm:p-1 lg:p-1 rounded hover:bg-gray-100 flex items-center justify-center flex-shrink-0 ${
                  notes.length > 0 
                    ? 'text-red-500 hover:text-red-600' 
                    : 'text-gray-400 hover:text-purple-500'
                }`}
                title={`Notes ${notes.length > 0 ? `(${notes.length})` : ''}`}
              >
                <FiInfo className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5" />
              </button>

              {/* SCR/CPU Driver Assignment button - Sadece IMPORT transportlarda görünür */}
              {transport.type === 'IMPORT' && scrCpuRequired && (
                <div className="relative inline-block flex-shrink-0">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleScrCpuDriverAssignment();
                    }}
                    className={`p-0.5 sm:p-1 lg:p-1 rounded hover:bg-gray-100 flex items-center justify-center ${
                      isScrCpuAssignedToDriver
                        ? 'text-green-500 hover:text-green-600' 
                        : 'text-gray-400 hover:text-blue-500'
                    } ${
                      transport.currentStatus !== 'ONGOING' && transport.currentStatus !== 'COMPLETED'
                        ? 'opacity-50 cursor-not-allowed'
                        : ''
                    }`}
                    id="scrcpu-button"
                    disabled={transport.currentStatus !== 'ONGOING' && transport.currentStatus !== 'COMPLETED'}
                  >
                    <FiCpu className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5" />
                  </button>
                  
                  {/* SCR/CPU Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-1 px-1 py-0.5 bg-gray-900 text-white text-[7px] sm:text-[8px] lg:text-[9px] 
                    rounded whitespace-nowrap opacity-0 invisible pointer-events-none transition-all duration-200 z-50
                    [#scrcpu-button:hover+&]:opacity-100 [#scrcpu-button:hover+&]:visible">
                    <div className="flex flex-col">
                      <span>SCR/CPU Status: {scrCpuStatus}</span>
                      <span>Assigned to Driver: {isScrCpuAssignedToDriver ? 'Yes' : 'No'}</span>
                      <span className="text-gray-300 text-[6px] sm:text-[7px] lg:text-[8px] mt-0.5">
                        {transport.currentStatus === 'ONGOING' || transport.currentStatus === 'COMPLETED'
                          ? 'Click to toggle driver assignment'
                          : 'Only available for ongoing or completed transports'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Timeline button */}
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsTimelineOpen(true);
                }}
                className={`p-0.5 sm:p-1 lg:p-1 rounded hover:bg-gray-100 flex items-center justify-center flex-shrink-0 ${
                  transport.currentStatus === 'ONGOING' || transport.currentStatus === 'COMPLETED'
                    ? 'text-green-500 hover:text-green-600'
                    : 'text-gray-400 hover:text-blue-500'
                }`}
                title={`View Timeline${transport.currentStatus === 'ONGOING' || transport.currentStatus === 'COMPLETED' ? ' (Assigned to driver)' : ''}`}
              >
                <FiActivity className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5" />
              </button>

              {/* Drag handle */}
              <div 
                ref={slotDropdownRef}
                className="relative flex-shrink-0"
              >
              <div
                {...attributes}
                {...listeners}
                  className="p-0.5 sm:p-1 lg:p-1 cursor-move hover:bg-gray-100 rounded text-gray-400 hover:text-gray-600 flex items-center justify-center"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    setShowSlotDropdown(true);
                  }}
                >
                  <FiMove className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5" />
                </div>
                
                {/* Slot Dropdown */}
                {showSlotDropdown && (
                  <div className="absolute right-0 mt-1 w-28 sm:w-32 lg:w-36 bg-white rounded-md shadow-lg z-50 py-0.5 lg:py-1 text-[7px] sm:text-[8px] lg:text-[9px]">
                    <div className="px-1 lg:px-2 py-0.5 lg:py-1 text-[6px] sm:text-[7px] lg:text-[8px] font-medium text-gray-500 border-b border-gray-100">
                      Move to Slot:
                    </div>
                    <div className="max-h-36 sm:max-h-40 lg:max-h-48 overflow-y-auto">
                      {currentSlots && currentSlots.length > 0 ? (
                        currentSlots.map((targetSlot) => (
                          <button
                            key={targetSlot.id}
                            onClick={() => handleMoveToSlot(targetSlot.id)}
                            className={`w-full text-left px-1 sm:px-1.5 lg:px-2 py-0.5 sm:py-1 lg:py-1 text-[7px] sm:text-[8px] lg:text-[9px] hover:bg-gray-100 flex items-center justify-between ${
                              slot && targetSlot.id === slot.id ? 'bg-gray-50 text-gray-400' : 'text-gray-700'
                            }`}
                            disabled={slot && targetSlot.id === slot.id}
                          >
                            <span>Truck {targetSlot.slotNumber}</span>
                            {slot && targetSlot.id === slot.id && (
                              <span className="text-[6px] sm:text-[7px] lg:text-[8px] text-gray-400">(current)</span>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-1 sm:px-1.5 lg:px-2 py-0.5 sm:py-1 lg:py-1 text-[7px] sm:text-[8px] lg:text-[9px] text-gray-500">No slots available</div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Üç nokta menüsü - En sağda */}
              <Menu as="div" className="relative flex-shrink-0">
                <Menu.Button className="p-0.5 sm:p-1 lg:p-1 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-600 flex items-center justify-center">
                  <FiMoreVertical className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5" />
                </Menu.Button>
                
                <Menu.Items className="absolute right-0 mt-1 w-28 sm:w-32 lg:w-36 bg-white rounded-md shadow-lg z-50 py-0.5 lg:py-1 text-[7px] sm:text-[8px] lg:text-[9px]">
                  {/* Delete option */}
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete();
                        }}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } flex items-center gap-0.5 lg:gap-1 w-full px-1 sm:px-1.5 lg:px-2 py-0.5 sm:py-1 lg:py-1 text-red-600`}
                      >
                        <FiTrash2 className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5" />
                        Delete Transport
                      </button>
                    )}
                  </Menu.Item>

                  {/* Hold/Activate option */}
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          transport.status === "ACTIVE" ? onHold?.(transport) : onActivate?.(transport);
                        }}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } flex items-center gap-0.5 lg:gap-1 w-full px-1 sm:px-1.5 lg:px-2 py-0.5 sm:py-1 lg:py-1 text-gray-700`}
                      >
                        {transport.status === "ACTIVE" ? (
                          <>
                            <FiPause className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5" />
                            Put on Hold
                          </>
                        ) : (
                          <>
                            <FiPlay className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5" />
                            Activate Transport
                          </>
                        )}
                      </button>
                    )}
                  </Menu.Item>

                  {/* SCR/CPU Requirement toggle - Sadece IMPORT transportlarda görünür */}
                  {transport.type === 'IMPORT' && (
                    <Menu.Item>
                      {({ active }) => (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleScrCpuToggle();
                          }}
                          className={`${
                            active ? 'bg-gray-100' : ''
                          } flex items-center gap-0.5 lg:gap-1 w-full px-1 sm:px-1.5 lg:px-2 py-0.5 sm:py-1 lg:py-1 text-gray-700`}
                        >
                          <FiToggleLeft className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5" />
                          {scrCpuRequired ? 'Disable SCR/CPU' : 'Enable SCR/CPU'}
                        </button>
                      )}
                    </Menu.Item>
                  )}

                  {/* Cut Transport option */}
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setIsCutModalOpen(true);
                        }}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } flex items-center gap-0.5 lg:gap-1 w-full px-1 sm:px-1.5 lg:px-2 py-0.5 sm:py-1 lg:py-1 text-gray-700`}
                      >
                        <FiScissors className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5" />
                        Cut Transport
                      </button>
                    )}
                  </Menu.Item>

                  {/* Send to Driver option */}
                  <Menu.Item>
                    {({ active }) => (
                      <button
                        onClick={() => {
                          if (transport.sentToDriver) {
                            handleUnassignFromDriver();
    } else {
                            handleOpenModal();
                          }
                        }}
                        className={`${
                          active ? 'bg-gray-100' : ''
                        } flex items-center gap-0.5 lg:gap-1 w-full px-1 sm:px-1.5 lg:px-2 py-0.5 sm:py-1 lg:py-1 ${
                          (!slot?.driver || !slot?.truck || !transport.trailer) ? 'text-gray-400 cursor-not-allowed' : 'text-gray-700'
                        }`}
                        disabled={!slot?.driver || !slot?.truck || !transport.trailer}
                      >
                        <FiSend className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5" />
                        {transport.sentToDriver ? 'Unassign from Driver' : 'Send to Driver'}
                      </button>
                    )}
                  </Menu.Item>
                </Menu.Items>
              </Menu>
            </div>
          </div>
        </div>

        {/* Unassign butonu */}
        {slot && (
          <button
            onClick={(e) => {
    e.stopPropagation();
              handleUnassign(transport);
            }}
            className="absolute -top-1 -right-1 sm:-top-1.5 sm:-right-1.5 lg:-top-2 lg:-right-2 p-0.5 sm:p-0.5 lg:p-1 rounded-full bg-white border border-gray-200 
              hover:bg-red-100 hover:border-red-300 hover:text-red-500 
              opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-30
              shadow-sm"
            title="Unassign transport"
          >
            <FiX className="w-1.5 h-1.5 sm:w-2 sm:h-2 lg:w-2.5 lg:h-2.5" />
          </button>
        )}

    
      </div>

      <TransportTimeline
        isOpen={isTimelineOpen}
        onClose={() => setIsTimelineOpen(false)}
        transport={transport}
      />

      {isNoteModalOpen && (
      <TransportNoteModal
        isOpen={isNoteModalOpen}
        onClose={() => setIsNoteModalOpen(false)}
        transportId={transport.id}
        notes={notes}
        onNotesChange={fetchNotes}
          currentTransport={currentTransport}
      />
      )}

      {tarModalConfig.isOpen && (
        <TransportTarModal
          isOpen={tarModalConfig.isOpen}
          onClose={() => setTarModalConfig({ isOpen: false, type: null })}
          transport={currentTransport}
          type={tarModalConfig.type}
          onUpdate={handleTarUpdate}
        />
      )}

      <ScrCpuModal
        isOpen={isScrcpuModalOpen}
        onClose={() => setIsScrcpuModalOpen(false)}
        transport={{
          ...transport,
          scrCpuStatus: scrCpuStatus,
          scrCpuColor: scrCpuColor
        }}
        onUpdate={(updatedStatus, updatedColor) => {
          setScrCpuStatus(updatedStatus);
          setScrCpuColor(updatedColor);
          setIsScrcpuModalOpen(false);
        }}
      />

      <AssignDriverModal
        isOpen={isAssignDriverModalOpen}
        onClose={() => setIsAssignDriverModalOpen(false)}
        handleConfirm={handleAssignDriver}
        selectedTruck={currentSlotData?.truck || null}
        slot={currentSlotData}
        transport={transport}
      />
      
      {/* SCR-CPU Hatırlatma Modalı */}
      {isScrCpuReminderOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-medium text-red-600">SCR-CPU Reminder</h3>
              <button 
                onClick={() => setIsScrCpuReminderOpen(false)}
                className="text-gray-400 hover:text-gray-500"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mt-4 text-center">
              <div className="flex items-center justify-center mb-4">
                <FiAlertTriangle className="w-12 h-12 text-amber-500" />
              </div>
              <p className="text-lg font-medium mb-4">
                Please assign SCR-CPU to the driver!
              </p>
              
              {/* Zamanlayıcı çubuğu */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-2">
                <div 
                  className="bg-blue-600 h-2.5 rounded-full transition-all duration-1000 ease-linear" 
                  style={{ width: `${(reminderTimeLeft / 5) * 100}%` }}
                ></div>
              </div>
              <p className="text-sm text-gray-500">
                This message will automatically close in {reminderTimeLeft} seconds
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Unassign Driver Confirmation Modal */}
      <UnassignDriverConfirmModal
        isOpen={unassignDriverModal.isOpen}
        onClose={() => setUnassignDriverModal({ isOpen: false, targetSlotId: null, onConfirm: null })}
        onConfirm={unassignDriverModal.onConfirm}
      />

      {/* Trailer Change Confirmation Modal */}
      {trailerChangeModal.isOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-medium text-amber-600">Change Trailer Warning</h3>
              <button 
                onClick={() => setTrailerChangeModal({ isOpen: false, trailerId: null, selectedTrailer: null })}
                className="text-gray-400 hover:text-gray-500"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mt-4">
              <div className="flex items-center justify-center mb-4">
                <FiAlertTriangle className="w-12 h-12 text-amber-500" />
              </div>
              <p className="text-base mb-4 text-center">
                This trailer is currently assigned to an ongoing transport. Are you sure you want to change it?
              </p>
              
              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={() => setTrailerChangeModal({ isOpen: false, trailerId: null, selectedTrailer: null })}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmTrailerChange}
                  className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white rounded-md transition-colors"
                >
                  Proceed Anyway
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <CutTransportModal
        isOpen={isCutModalOpen}
        onClose={() => setIsCutModalOpen(false)}
        transport={currentTransport || transport}
        onCut={handleCutComplete}
      />

      {/* Unassign Confirmation Modal for Ongoing/Completed Transports */}
      {unassignConfirmModal.isOpen && (
        <div className="fixed inset-0 bg-black/30 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
            <div className="flex justify-between items-start">
              <h3 className="text-lg font-medium text-red-600">Warning</h3>
              <button 
                onClick={() => setUnassignConfirmModal({ isOpen: false, onConfirm: null })}
                className="text-gray-400 hover:text-gray-500"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>
            
            <div className="mt-4">
              <div className="flex items-center justify-center mb-4">
                <FiAlertTriangle className="w-12 h-12 text-red-500" />
              </div>
              <p className="text-base mb-4 text-center">
                This transport is {transport.currentStatus === 'ONGOING' ? 'ongoing' : 'completed'}. 
                Unassigning it will reset all ETAs and remove it from the driver's assignment.
              </p>
              <p className="text-sm text-center text-gray-500 mb-6">
                Are you sure you want to proceed?
              </p>
              
              <div className="flex justify-center gap-4 mt-6">
                <button
                  onClick={() => setUnassignConfirmModal({ isOpen: false, onConfirm: null })}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 rounded-md transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={unassignConfirmModal.onConfirm}
                  className="px-4 py-2 bg-red-500 hover:bg-red-600 text-white rounded-md transition-colors"
                >
                  Unassign Transport
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
