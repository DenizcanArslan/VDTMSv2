import { useAppSelector } from '@/hooks/redux';
import { startOfDay } from 'date-fns';
import { FiAlertTriangle, FiAlertCircle, FiTruck, FiMapPin, FiBox, FiClock, FiCheck } from 'react-icons/fi';
import { useEffect, useState } from 'react';
import { scroller } from 'react-scroll';
import { format } from 'date-fns';

// shouldShowTar fonksiyonunu ekleyelim
const shouldShowTar = (quay, isPickup) => {
  if (!quay?.tarType || !quay?.defaultTar) return false;
  return quay.tarType === 'BOTH' || 
         (isPickup && quay.tarType === 'PICKUP') ||
         (!isPickup && quay.tarType === 'DROPOFF');
};

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

// Destination saatini kontrol eden fonksiyon
const isBeforeNoon = (destinationTime) => {
  if (!destinationTime) return null; // Saat bilgisi yoksa null döndür
  
  const timeStr = destinationTime.substring(11, 16);
  const [hours] = timeStr.split(':').map(Number);
  
  return hours < 12;
};

// Add the getTarBadgeStyle helper function
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

const CompactDayView = ({ onSlotClick, highlightedTransports = [] }) => {
  const [showProblematicOnly, setShowProblematicOnly] = useState(false);
  const [quayHighlight, setQuayHighlight] = useState(null);
  const [selectedQuay, setSelectedQuay] = useState(null); // Seçilen quay için state
  const [timeFilter, setTimeFilter] = useState('all'); // 'all', 'before-noon', 'after-noon'
  const [showDropOffEta, setShowDropOffEta] = useState(false); // Drop-off ETA filtresi
  const { slots, selectedDate, quays } = useAppSelector(state => state.planning);
  
  // Redux store'daki değişiklikleri izle
  useEffect(() => {
    // slots veya selectedDate değiştiğinde component yeniden render olacak
  }, [slots, selectedDate]);

  // Scroll to highlighted transport
  useEffect(() => {
    if (highlightedTransports.length > 0) {
      const firstHighlightedId = highlightedTransports[0];
      setTimeout(() => {
        const element = document.getElementById(`transport-${firstHighlightedId}`);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
      }, 100);
    }
  }, [highlightedTransports]);

  const currentDateStr = startOfDay(new Date(selectedDate)).toISOString();
  const currentSlots = slots[currentDateStr] || [];

  // Debug için
  console.log('Current Slots:', currentSlots);
  
  // Quay'ları isime göre sırala
  const sortedQuays = [...(quays || [])].sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const allItems = currentSlots.flatMap(slot => {
    if (slot.transports && slot.transports.length > 0) {
      return slot.transports.map(ts => {
        // İlk destinationın saatini kontrol et
        const firstDestTime = ts.transport.destinations && ts.transport.destinations.length > 0 
          ? ts.transport.destinations[0].destinationTime 
          : null;
        
        const beforeNoon = isBeforeNoon(firstDestTime);
        
        return {
          isTransport: true,
          ...ts.transport,
          slotNumber: slot.slotNumber,
          truck: slot.truck,
          driver: slot.driver,
          trailer: ts.transport.trailer,
          beforeNoon // Öğleden önce mi sonra mı bilgisini ekle
        };
      });
    }

    return [{
      isTransport: false,
      slotNumber: slot.slotNumber,
      truck: slot.truck,
      driver: slot.driver,
      trailer: null
    }];
  });

  // Filtreleme mantığı
  let filteredItems = allItems;
  
  // Problematik filtreleme
  if (showProblematicOnly) {
    filteredItems = filteredItems.filter(item => 
      item.isTransport && (
        // TBN olan quay'ler
        item.pickUpQuay?.isLoRo === "TBN" || 
        item.dropOffQuay?.isLoRo === "TBN" ||
        // Sadece SCR/CPU durumu SCRCPUNOK olanlar
        (item.type === 'IMPORT' && 
         item.requiresScrCpu && 
         item.scrCpuStatus === 'SCRCPUNOK') ||
        // TAR durumu default olanlar (girilmemiş olanlar)
        (shouldShowTar(item.pickUpQuay, true) && 
         (!item.pickUpTar || item.pickUpTar === item.pickUpQuay?.defaultTar)) ||
        (shouldShowTar(item.dropOffQuay, false) && 
         (!item.dropOffTar || item.dropOffTar === item.dropOffQuay?.defaultTar)) ||
        // Export ise booking reference kontrolü
        (item.type === 'EXPORT' && (!item.bookingReference || item.bookingReference.trim() === '')) ||
        // Import ise container number kontrolü
        (item.type === 'IMPORT' && (!item.containerNumber || item.containerNumber.trim() === '')) ||
        // Transport order alınmadı
        (!item.hasTransportOrder) ||
        // T1 gerekli ama henüz alınmadı
        (item.requiresT1 && !item.t1Received)
      )
    );
  }
  
  // Saat filtresine göre filtreleme
  if (timeFilter !== 'all') {
    filteredItems = filteredItems.filter(item => {
      if (!item.isTransport) return true;
      
      // Normal destination'ın saatini al (special location olmayanlar)
      const normalDestTime = getFirstNormalDestinationTime(item.destinations);
      
      // Saat bilgisi yoksa veya 00:00 ise her iki durumda da göster
      if (!normalDestTime || normalDestTime === '00:00') return true;
      
      // Saat değerini al ve öğleden önce mi sonra mı kontrol et
      const [hours] = normalDestTime.split(':').map(Number);
      const isBeforeNoonValue = hours < 12;
      
      // Saat filtresine göre kontrol et
      if (timeFilter === 'before-noon') {
        return isBeforeNoonValue === true;
      } else if (timeFilter === 'after-noon') {
        return isBeforeNoonValue === false;
      }
      
      return true;
    });
  }
  
  // Drop-off ETA filtresi
  if (showDropOffEta) {
    // Önce her slottaki en son transport'u bulalım
    const lastTransportsBySlot = {};
    
    allItems.forEach(item => {
      if (item.isTransport) {
        const slotNumber = item.slotNumber;
        
        // Bu slot için daha önce bir transport kaydedilmemiş veya
        // bu transport'un slotOrder'ı daha büyükse, bu transport'u kaydedelim
        if (!lastTransportsBySlot[slotNumber] || 
            item.slotOrder > lastTransportsBySlot[slotNumber].slotOrder) {
          lastTransportsBySlot[slotNumber] = item;
        }
      }
    });
    
    // Şimdi sadece her slottaki son transport'un drop-off ETA'sı veya son destination ETA'sı varsa o transport'u gösterelim
    filteredItems = filteredItems.filter(item => {
      if (!item.isTransport) return true;
      
      const slotNumber = item.slotNumber;
      const isLastTransportInSlot = lastTransportsBySlot[slotNumber]?.id === item.id;
      
      // Eğer bu transport, slottaki son transport ise ve drop-off ETA'sı veya son destination ETA'sı varsa göster
      if (isLastTransportInSlot) {
        const lastEta = getLastEta(item);
        // Drop-off ETA'sı ya da son destination'ın ETA'sı varsa göster
        return lastEta && (lastEta.type === 'dropOff' || lastEta.type === 'destination');
      }
      
      return false;
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1 sm:gap-2 justify-start">
        {/* Problematik filtreleme butonu */}
        <button
          onClick={() => setShowProblematicOnly(!showProblematicOnly)}
          className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors duration-200 ${
            showProblematicOnly 
              ? 'bg-red-500 text-white hover:bg-red-600' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <FiAlertCircle className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          {showProblematicOnly ? 'Show All' : 'Show Problematic Only'}
        </button>

        {/* Drop-off ETA filtresi butonu */}
        <button
          onClick={() => setShowDropOffEta(!showDropOffEta)}
          className={`flex items-center gap-0.5 sm:gap-1 px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium transition-colors duration-200 ${
            showDropOffEta 
              ? 'bg-green-500 text-white hover:bg-green-600' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
          }`}
        >
          <FiCheck className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
          {showDropOffEta ? 'All Transports' : 'With Final ETA'}
        </button>

        {/* Quay highlight dropdown - LO/RO */}
        <select
          value={quayHighlight || ''}
          onChange={(e) => setQuayHighlight(e.target.value || null)}
          className={`px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium border border-gray-300 ${
            quayHighlight
              ? 'bg-yellow-100 text-yellow-800' 
              : ''
          }`}
        >
          <option value="">Highlight Quays LO/RO</option>
          <option value="LO">LO Quays</option>
          <option value="RO">RO Quays</option>
        </select>
        
        {/* Quay highlight by specific quay dropdown */}
        <select
          value={selectedQuay || ''}
          onChange={(e) => setSelectedQuay(e.target.value || null)}
          className={`px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium border border-gray-300 ${
            selectedQuay
              ? 'bg-yellow-100 text-yellow-800' 
              : ''
          }`}
        >
          <option value="">Highlight by Quay</option>
          {sortedQuays.map(quay => (
            <option key={quay.id} value={quay.id}>
              {quay.name}
            </option>
          ))}
        </select>
        
        {/* Saat filtresi dropdown */}
        <select
          value={timeFilter}
          onChange={(e) => setTimeFilter(e.target.value)}
          className={`px-1.5 sm:px-2 py-1 sm:py-1.5 rounded-md text-[10px] sm:text-xs font-medium border border-gray-300 ${
            timeFilter !== 'all'
              ? 'bg-blue-500 text-white' 
              : ''
          }`}
        >
          <option value="all">All Times</option>
          <option value="before-noon">Before 12:00</option>
          <option value="after-noon">After 12:00 </option>
        </select>
      </div>

      <div className="bg-white p-1 rounded-lg shadow overflow-x-auto">
        <div className="space-y-0 min-w-[600px] sm:min-w-[800px]">
          {(() => {
            // Group items by slot number
            const itemsBySlot = {};
            filteredItems.forEach(item => {
              const slotNumber = item.slotNumber;
              if (!itemsBySlot[slotNumber]) {
                itemsBySlot[slotNumber] = [];
              }
              itemsBySlot[slotNumber].push(item);
            });
            
            // Create an array of elements with separators
            const elementsWithSeparators = [];
            
            Object.entries(itemsBySlot).forEach(([slotNumber, slotItems], slotIndex) => {
              // Add a separator before each slot group (except the first one)
              if (slotIndex > 0) {
                elementsWithSeparators.push(
                  <div key={`separator${slotNumber}`} className="h-[1px] bg-[#254795] rounded-sm "></div>
                );
              }
              
              // Add the slot items
              slotItems.forEach(item => {
                // Check if this transport is in highlighted transports
                const isHighlighted = item.isTransport && highlightedTransports.includes(item.id);
                
                elementsWithSeparators.push(
                  <div 
                    key={item.isTransport ? item.id : `empty-slot-${item.slotNumber}`}
                    id={item.isTransport ? `transport-${item.id}` : `empty-slot-${item.slotNumber}`}
                    className={`flex items-center justify-between gap-0.5 px-0.5 py-0.5 text-[7px] sm:text-[8px] border-b border-gray-100 hover:bg-blue-100 cursor-pointer ${
                      item.slotNumber % 2 === 0 ? 'bg-gray-100' : 'bg-white'
                    } ${isHighlighted ? 'bg-yellow-100 border-l-4 border-yellow-500' : ''}`}
                    onClick={() => onSlotClick(item.slotNumber)}
                  >
                    <div className="flex items-center gap-0.5 flex-wrap md:flex-nowrap overflow-hidden max-w-[calc(100%-100px)] sm:max-w-[calc(100%-120px)] xl:max-w-[calc(100%-150px)]">
                      <div className="w-auto flex-shrink-0 font-medium text-gray-600 flex items-center gap-1">
                        #{item.slotNumber}
                        {item.driver && (
                          <span className="ml-1 text-blue-700 font-medium">{item.driver.nickName}</span>
                        )}
                        {item.truck && (
                          <span className="ml-1 text-green-700 font-medium">{item.truck.nickName}</span>
                        )}
                        {item.trailer && (
                          <span className="ml-1 text-yellow-700 font-medium">{item.trailer.nickName}</span>
                        )}
                      </div>

                      {item.isTransport ? (
                        <>
                          <div className="w-6 sm:w-7 xl:w-8 flex-shrink-0">
                            <span className={item.sentToDriver ? "text-sky-500 font-medium" : "text-gray-500"}>
                              {getFirstNormalDestinationTime(item.destinations)}
                            </span>
                          </div>

                          <div className="w-14 sm:w-16 xl:w-20 flex-shrink-0 truncate">
                            <span className="font-medium text-orange-600">{item.client?.name}</span>
                            <span className={`ml-0.5 ${
                              item.hasTransportOrder 
                                ? 'font-bold text-gray-700' 
                                : 'text-gray-400'
                            }`}>
                              {item.transportOrderNumber}
                            </span>
                          </div>

                          <div className="w-16 sm:w-20 xl:w-24 flex-shrink-0">
                            <span className="font-medium">PU:</span>
                            <span className={`${
                              (quayHighlight && item.pickUpQuay?.isLoRo === quayHighlight) || 
                              (selectedQuay && item.pickUpQuay && item.pickUpQuay.id === parseInt(selectedQuay))
                                ? 'bg-yellow-200 '
                                : ''
                            }`}>
                               {item.pickUpQuay?.name && (
                              <span className={`text-gray-500 ml-0.5 ${item.pickUpQuay?.isLoRo === "TBN" ? "text-red-500" : ""}`}>({item.pickUpQuay?.name})</span>
                            )}
                            </span>
                           
                          </div>

                          <div className="w-24 sm:w-32 xl:w-40 2xl:w-64 flex-shrink-0 overflow-hidden">
                            <div className="flex items-center gap-0.5 flex-wrap">
                              {[...(item.destinations || [])]
                                .sort((a, b) => a.order - b.order)
                                .map((dest, idx) => (
                                  <span key={dest.id} className="flex items-center">
                                    <span className="text-gray-400">{idx + 1}.</span>
                                    <span className="truncate max-w-[40px] sm:max-w-[60px] xl:max-w-[80px] 2xl:max-w-[150px]">
                                      {dest.frequentLocation?.name  || dest.location?.name}
                                    </span>
                                    <span className="text-gray-400 ml-0.5">{dest.destinationTime?.substring(11, 16)}</span>
                                    {idx < item.destinations.length - 1 && (
                                      <span className="mx-0.5 text-gray-400">→</span>
                                    )}
                                  </span>
                                ))}
                            </div>
                          </div>

                          <div className="w-16 sm:w-20 xl:w-24 flex-shrink-0">
                            <span className="font-medium">DO:</span>
                            <span className={`${
                              (quayHighlight && item.dropOffQuay?.isLoRo === quayHighlight) ||
                              (selectedQuay && item.dropOffQuay && item.dropOffQuay.id === parseInt(selectedQuay))
                                ? 'bg-yellow-200'
                                : ''
                            }`}>
                              {item.dropOffQuay?.name && (
                              <span className={`text-gray-500 ml-0.5 ${item.dropOffQuay?.isLoRo === "TBN" ? "text-red-500" : ""}`}>
                                ({item.dropOffQuay?.name})
                              </span>
                            )}
                            </span>
                            
                          </div>

                          {/* Booking Reference */}
                          <div className="w-14 sm:w-16 xl:w-20 2xl:w-28 flex-shrink-0">
                            <span className="font-medium">Booking:</span>
                            <span className={`ml-0.5 ${!item.bookingReference && item.type === 'EXPORT' ? 'text-red-500' : 'text-gray-500'} truncate max-w-[30px] sm:max-w-[40px] xl:max-w-[60px] 2xl:max-w-[100px] inline-block align-bottom`}>
                              {item.bookingReference || (item.type === 'EXPORT' ? 'No Booking' : '-')}
                            </span>
                          </div>

                          {/* Container Number */}
                          <div className="w-14 sm:w-16 xl:w-20 2xl:w-28 flex-shrink-0">
                            <span className="font-medium">Container:</span>
                            <span className={`ml-0.5 ${!item.containerNumber && item.type === 'IMPORT' ? 'text-red-500' : 'text-gray-500'} truncate max-w-[30px] sm:max-w-[40px] xl:max-w-[60px] 2xl:max-w-[100px] inline-block align-bottom`}>
                              {item.containerNumber || (item.type === 'IMPORT' ? 'No Container' : '-')}
                            </span>
                          </div>
                        </>
                      ) : (
                        <div className="text-gray-400 italic">
                          No transports assigned
                        </div>
                      )}
                    </div>

                    {item.isTransport && (
                      <div className="flex items-center gap-0.5 ml-auto text-[6px] sm:text-[7px] flex-shrink-0 flex-nowrap min-w-[90px] sm:min-w-[110px] xl:min-w-[140px]">
                        {/* Container Type Badge */}
                        {item.containerType && (
                          <span className="px-0.5 bg-gray-100 text-gray-700 rounded whitespace-nowrap">
                            {item.containerType}
                          </span>
                        )}

                        {/* Genset Badge */}
                        {item.genset === 'YES' && (
                          <span className="px-0.5 bg-blue-100 text-blue-700 rounded whitespace-nowrap">
                            Genset
                          </span>
                        )}

                        {/* Import/Export Badge */}
                        {item.type === 'IMPORT' ? (
                          <span className="px-0.5 bg-orange-100 text-orange-700 rounded whitespace-nowrap">IMP</span>
                        ) : item.type === 'EXPORT' && (
                          <span className="px-0.5 bg-orange-100 text-orange-700 rounded whitespace-nowrap">EXP</span>
                        )}

                        {/* ADR Badge */}
                        {item.adr === 'YES' && (
                          <span className="px-0.5 bg-red-100 text-red-700 rounded whitespace-nowrap">
                            ADR
                          </span>
                        )}

                        {/* SCR/CPU Badge - sadece IMPORT için göster */}
                        {item.type === 'IMPORT' && item.requiresScrCpu && (
                          <span className={`px-0.5 rounded whitespace-nowrap ${getBadgeStyle(item.scrCpuColor)}`}>
                            {item.scrCpuStatus}
                          </span>
                        )}

                        {/* TAR Badges */}
                        {shouldShowTar(item.pickUpQuay, true) && (
                          <span className={`px-0.5 rounded whitespace-nowrap ${
                            getTarBadgeStyle(item, true)
                          }`}>
                            {item.pickUpTar !== null ? item.pickUpTar : item.pickUpQuay?.defaultTar}
                          </span>
                        )}
                        {shouldShowTar(item.dropOffQuay, false) && (
                          <span className={`px-0.5 rounded whitespace-nowrap ${
                            getTarBadgeStyle(item, false)
                          }`}>
                            {item.dropOffTar !== null ? item.dropOffTar : item.dropOffQuay?.defaultTar}
                          </span>
                        )}

                        {/* T1 Badge */}
                        {item.requiresT1 && (
                          <span className={`px-0.5 rounded whitespace-nowrap ${
                            item.t1Received
                              ? 'bg-green-100 text-green-700' 
                              : 'bg-orange-100 text-orange-700'
                          }`}>
                            T1{item.t1Received ? ' ✓' : ''}
                          </span>
                        )}

                        {/* Last ETA Badge */}
                        {(item.currentStatus === 'ONGOING' || item.currentStatus === 'COMPLETED' ||  item.currentStatus === 'PLANNED') && (
                          <div className={`
                            flex items-center gap-0.5 px-0.5 py-0.5 rounded text-[6px] sm:text-[7px] font-medium whitespace-nowrap
                            ${
                              item.currentStatus === 'PLANNED'
                                ? 'bg-gray-100 text-gray-700'  // Not assigned yet
                                : !getLastEta(item)?.time 
                                  ? 'bg-gray-100 text-gray-700'  // No ETA
                                  : getLastEta(item)?.type === 'dropOff'
                                    ? 'bg-green-100 text-green-700'  // Drop-off ETA
                                    : 'bg-orange-100 text-orange-700'  // Pick-up/Destination ETA
                            }
                          `}>
                            {getLastEta(item)?.type === 'destination' && getLastEta(item)?.order && item.destinations.length > 1 && (
                              <span className="mr-0.5">{getLastEta(item).order}.</span>
                            )}
                            <FiClock className="w-1.5 h-1.5 xl:w-2 xl:h-2" />
                            <span>
                              {item.currentStatus === 'PLANNED' 
                                ? 'Not assigned'
                                : getLastEta(item)?.time || 'No ETA'
                              }
                            </span>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              });
            });
            
            return elementsWithSeparators;
          })()}

          {filteredItems.length === 0 && (
            <div className="text-center py-2 text-gray-500 text-xs">
              {showProblematicOnly 
                ? 'No problematic transports found' 
                : showDropOffEta
                  ? 'No transports with final ETA'
                  : 'No slots for this day'}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CompactDayView; 