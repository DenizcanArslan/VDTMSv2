'use client';

import { useEffect, useState } from 'react';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { fetchPlanningData, setSelectedDate, updateTransportsAndSlots } from '@/redux/features/planningSlice';
import PlanningCalendar from '@/components/planning/PlanningCalendar';
import TransportsList from '@/components/planning/TransportsList';
import CompactDayView from '@/components/planning/CompactDayView';
import { FiMaximize2, FiMinimize2, FiCalendar, FiScissors, FiSearch, FiX, FiPause, FiMapPin, FiClock, FiRefreshCw } from 'react-icons/fi';
import { format, startOfDay, parseISO } from 'date-fns';
import Link from 'next/link';
import TrailerLocationsModal from '@/components/planning/TrailerLocationsModal';
import SortConfirmModal from '@/components/planning/SortConfirmModal';
import { toast } from 'react-toastify';
import useRealTimeUpdates from '@/hooks/useRealTimeUpdates';
import Spinner from '@/components/Spinner';

const PlanningPage = () => {
  const dispatch = useAppDispatch();
  const { loading, error, selectedDate, slots, transports } = useAppSelector(state => state.planning);
  const [isCompactView, setIsCompactView] = useState(false);
  const [selectedSlotNumber, setSelectedSlotNumber] = useState(null);
  const [isCalendarOpen, setIsCalendarOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [onHoldSearchResults, setOnHoldSearchResults] = useState([]);
  const [highlightedTransports, setHighlightedTransports] = useState([]);
  const [isOnHoldModalOpen, setIsOnHoldModalOpen] = useState(false);
  const [isTrailerLocationsModalOpen, setIsTrailerLocationsModalOpen] = useState(false);
  const [isSortingSlots, setIsSortingSlots] = useState(false);
  const [isSortConfirmModalOpen, setIsSortConfirmModalOpen] = useState(false);

  // Socket.IO hook'unu başlat
  useRealTimeUpdates();
  
  useEffect(() => {
    console.log('Planning Page - Sayfa yüklendiğinde çalışıyor');
    
    // İlk yüklemede timestamp senkronizasyonunu başlat
    if (typeof window !== 'undefined' && !window._lastPlanningUpdateTimestamp) {
      window._lastPlanningUpdateTimestamp = Date.now();
    }
    
    // First, load data with the standard Redux thunk
    dispatch(fetchPlanningData());
    
    // Sayfa yüklendikten sonra, localStorage'dan kaydedilmiş tarihi kontrol et
    const savedDate = localStorage.getItem('planningSelectedDate');
    if (savedDate) {
      // Kaydedilmiş tarihi kullan ve localStorage'dan temizle
      dispatch(setSelectedDate(savedDate));
      localStorage.removeItem('planningSelectedDate');
    }
    
    // Event listener ekle - manuel olarak veri yenilemek için
    const handleDataRefresh = () => {
      console.log('Manuel veri yenileme istendi');
      dispatch(fetchPlanningData());
    };
    
    window.addEventListener('manual-refresh-planning', handleDataRefresh);
    
    return () => {
      window.removeEventListener('manual-refresh-planning', handleDataRefresh);
    };
  }, [dispatch]);

  // Modal açma işlevi
  const openSortModal = () => {
    setIsSortConfirmModalOpen(true);
  };

  // Sıralama işlemini gerçekleştiren fonksiyon
  const handleSortSlotsByDestination = async () => {
    setIsSortingSlots(true);
    
    try {
      // Seçili tarihi localStorage'a kaydet
      localStorage.setItem('planningSelectedDate', selectedDate);
      
      const response = await fetch('/api/planning/slots/sort-by-destination', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          date: selectedDate 
        }),
      });
      
      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }
      
      toast.success('Slots sorted successfully by first destination time!');
      
      // Doğrudan taze veri al - standart fetchPlanningData yerine
      dispatch(fetchPlanningData());
      
    } catch (error) {
      console.error("Failed to sort slots:", error);
      toast.error(`Failed to sort slots: ${error.message}`);
    } finally {
      setIsSortingSlots(false);
      setIsSortConfirmModalOpen(false); // Modalı kapat
    }
  };

  // Function to search across all days
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setSearchResults([]);
      setOnHoldSearchResults([]);
      setHighlightedTransports([]);
      return;
    }
    
    const lowerQuery = query.toLowerCase().trim();
    
    // Group results by date
    const resultsByDate = {};
    // Array for ON_HOLD transports
    const onHoldResults = [];
    
    // Debug logs
    console.log('Searching with query:', lowerQuery);
    console.log('Transport array length:', transports.length);
    
    // First, scan all slots to collect transport IDs with their corresponding dates
    const transportDates = new Map(); // Map<transportId, Set<dateStr>>
    
    // Scan slots first to get date information for each transport
    Object.entries(slots).forEach(([dateStr, slotsForDate]) => {
      // Check assigned transports in slots
      slotsForDate.forEach(slot => {
        slot.transports?.forEach(ts => {
          if (!transportDates.has(ts.transport.id)) {
            transportDates.set(ts.transport.id, new Set());
          }
          transportDates.get(ts.transport.id).add(dateStr);
        });
      });
      
      // Check for unassigned transports on this date
      // Unassigned transports appear directly in the date's data outside of slots
      const dateObj = new Date(dateStr);
      const formattedDate = format(dateObj, 'yyyy-MM-dd');
      
      // Scan the transport array for transports that might be unassigned
      transports.forEach(transport => {
        if (transport.status === "ACTIVE") {
          // Check if this transport has slotAssignments for this date but no slot
          let hasAssignmentForDate = false;
          
          if (transport.slotAssignments?.length) {
            transport.slotAssignments.forEach(assignment => {
              const assignmentDate = new Date(assignment.date);
              const assignmentFormatted = format(assignmentDate, 'yyyy-MM-dd');
              
              if (assignmentFormatted === formattedDate && !assignment.slotId) {
                hasAssignmentForDate = true;
              }
            });
          }
          
          // If dateStr matches unassigned transports on this date, add it
          if (hasAssignmentForDate) {
            if (!transportDates.has(transport.id)) {
              transportDates.set(transport.id, new Set());
            }
            transportDates.get(transport.id).add(dateStr);
          }
        }
      });
    });
    
    // Step 2: Search through transports with our query
    transports.forEach(transport => {
      // Check if matches query
      const isMatch = 
        // Client name
        transport.client?.name?.toLowerCase().includes(lowerQuery) ||
        // Transport order number
        transport.transportOrderNumber?.toLowerCase().includes(lowerQuery) ||
        // Pickup/dropoff quay names
        transport.pickUpQuay?.name?.toLowerCase().includes(lowerQuery) ||
        transport.dropOffQuay?.name?.toLowerCase().includes(lowerQuery) ||
        // Booking reference
        transport.bookingReference?.toLowerCase().includes(lowerQuery) ||
        // Container number
        transport.containerNumber?.toLowerCase().includes(lowerQuery) ||
        // Loading reference
        transport.loadingUnloadingReference?.toLowerCase().includes(lowerQuery) ||
        // Destinations
        transport.destinations?.some(dest => 
          dest.frequentLocation?.name?.toLowerCase().includes(lowerQuery) ||
          dest.location?.name?.toLowerCase().includes(lowerQuery)
        );
      
      if (isMatch) {
        console.log("Transport arama eşleşmesi:", {
          id: transport.id,
          status: transport.status,
          orderNumber: transport.transportOrderNumber,
          isMatch
        });
        
        // Handle ON_HOLD transports
        if (transport.status === "ON_HOLD") {
          onHoldResults.push(transport.id);
          return; // Skip further processing
        }
        
        // If transport has dates from our previous scan, use those
        if (transportDates.has(transport.id)) {
          transportDates.get(transport.id).forEach(dateStr => {
            if (!resultsByDate[dateStr]) {
              resultsByDate[dateStr] = [];
            }
            if (!resultsByDate[dateStr].includes(transport.id)) {
              resultsByDate[dateStr].push(transport.id);
            }
          });
        } 
        // If transport has no dates mapped but has slotAssignments, use those dates
        else if (transport.slotAssignments?.length > 0) {
          transport.slotAssignments.forEach(assignment => {
            const dateStr = startOfDay(new Date(assignment.date)).toISOString();
            if (!resultsByDate[dateStr]) {
              resultsByDate[dateStr] = [];
            }
            if (!resultsByDate[dateStr].includes(transport.id)) {
              resultsByDate[dateStr].push(transport.id);
            }
          });
        } 
        // Fallback: add to current selected date if it's an active transport with no dates
        else if (transport.status === "ACTIVE") {
          // Use the current selected date
          const currentDateStr = startOfDay(new Date(selectedDate)).toISOString();
          if (!resultsByDate[currentDateStr]) {
            resultsByDate[currentDateStr] = [];
          }
          if (!resultsByDate[currentDateStr].includes(transport.id)) {
            resultsByDate[currentDateStr].push(transport.id);
          }
        }
      }
    });
    
    // Handle special case: If searching for an exact transport number match
    // This ensures unassigned transports are found even if they don't appear in any slot
    if (lowerQuery.trim().length > 0) {
      // Look for exact transport order number matches in unassigned area
      transports.forEach(transport => {
        if (transport.transportOrderNumber && 
            transport.transportOrderNumber.toLowerCase() === lowerQuery &&
            transport.status === "ACTIVE") {
          
          // Check if this transport has already been added to any date
          let alreadyListed = false;
          Object.values(resultsByDate).forEach(transportIds => {
            if (transportIds.includes(transport.id)) {
              alreadyListed = true;
            }
          });
          
          // If not already listed, add to a special "unassigned" date or to the selected date
          if (!alreadyListed) {
            const dateStr = startOfDay(new Date(selectedDate)).toISOString();
            if (!resultsByDate[dateStr]) {
              resultsByDate[dateStr] = [];
            }
            console.log(`Adding unassigned transport ${transport.transportOrderNumber} to results for date ${dateStr}`);
            resultsByDate[dateStr].push(transport.id);
          }
        }
      });
    }
    
    const results = Object.entries(resultsByDate).map(([date, transportIds]) => ({
      date,
      formattedDate: format(parseISO(date), 'd MMM yyyy'),
      transportIds
    }));
    
    console.log('Final search results:', results);
    setSearchResults(results);
    setOnHoldSearchResults(onHoldResults);
  };
  
  // Function to navigate to a date with search results
  const navigateToDateWithResults = (dateStr) => {
    // Navigate to the selected date
    dispatch(setSelectedDate(dateStr));
    
    // Set highlighted transports for this date
    const transportIdsToHighlight = searchResults.find(r => r.date === dateStr)?.transportIds || [];
    setHighlightedTransports(transportIdsToHighlight);
    
    // For all search results, switch to detailed view for better visibility
    setIsCompactView(false);
    
    // Force scroll after a short delay
    if (transportIdsToHighlight.length > 0) {
      // Create a unique ID for this click event
      const scrollId = Math.random().toString(36).substr(2, 9);
      console.log(`Starting scroll operation ${scrollId} for transport ${transportIdsToHighlight[0]}`);
      
      setTimeout(() => {
        // Try to find the transport element by its data attribute
        const element = document.querySelector(`[data-transport-id="${transportIdsToHighlight[0]}"]`);
        
        if (element) {
          console.log(`Found element for scroll operation ${scrollId}, scrolling now`);
          // Use scrollIntoView with specific options
          element.scrollIntoView({
            behavior: 'smooth',
            block: 'center',
            inline: 'start'
          });
        } else {
          console.log(`Element not found for scroll operation ${scrollId}`);
        }
      }, 500); // Longer delay to ensure render is complete
    }
  };
  
  // Function to scroll badge container
  const scrollBadges = (direction) => {
    const container = document.getElementById('badge-container');
    if (container) {
      const scrollAmount = container.clientWidth * 0.8;
      container.scrollBy({
        left: direction === 'left' ? -scrollAmount : scrollAmount,
        behavior: 'smooth'
      });
    }
  };
  
  // Function to clear search
  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setOnHoldSearchResults([]);
    setHighlightedTransports([]);
  };

  const handleSlotClick = (slotNumber) => {
    setSelectedSlotNumber(slotNumber);
    setIsCompactView(false);
    
    // 3 saniye sonra highlight'ı kaldır
    setTimeout(() => {
      setSelectedSlotNumber(null);
    }, 3000);
  };

  const formattedDate = selectedDate ? format(new Date(selectedDate), 'd MMM yyyy') : '';

  if (loading) return (
    <div className="flex flex-col items-center justify-center h-[80vh]">
      <Spinner size="lg" text="Loading planning data..." />
    </div>
  );
  if (error) return (
    <div className="flex flex-col items-center justify-center h-[80vh] text-red-600">
      <div className="text-xl font-semibold mb-2">Error</div>
      <div>{error}</div>
    </div>
  );

  return (
    <div className="p-4">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
          <h1 className="text-2xl font-bold">Planning</h1>
          
          {/* Search bar - positioned next to the Planning heading */}
          <div className="relative w-80">
            <div className="flex items-center border border-gray-300 rounded-md overflow-hidden bg-white">
              <span className="pl-2 text-gray-400">
                <FiSearch className="w-3.5 h-3.5" />
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search..."
                className="w-full px-2 py-1.5 text-xs focus:outline-none"
              />
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="px-2 text-gray-400 hover:text-gray-600"
                >
                  <FiX className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          {/* Slot Sıralama Butonu */}
          <button 
            onClick={openSortModal}
            className="flex items-center justify-center gap-1 px-2 py-1 text-xs bg-green-600 text-white rounded-md hover:bg-green-700 h-8 min-w-[100px]"
            disabled={isSortingSlots}
          >
            <FiClock className={`w-3.5 h-3.5 ${isSortingSlots ? 'animate-spin' : ''}`} />
            {isSortingSlots ? 'Sorting...' : 'Sort by Dest. Time'}
          </button>

          {/* Yeni Trailer Locations Butonu */}
          <button 
            onClick={() => setIsTrailerLocationsModalOpen(true)}
            className="flex items-center justify-center gap-1 px-2 py-1 text-xs bg-purple-600 text-white rounded-md hover:bg-purple-700 h-8 min-w-[100px]"
          >
            <FiMapPin className="w-3.5 h-3.5" />
            Trailer Locations
          </button>

          {/* Kesme sayfasına bağlantı */}
          <Link href="/cut-transports" className="flex items-center justify-center gap-1 px-2 py-1 text-xs bg-red-600 text-white rounded-md hover:bg-red-700 h-8 min-w-[100px]">
            <FiScissors className="w-3.5 h-3.5" />
            Cut Transports
          </Link>
          
          {/* Tarih seçme butonu */}
          <button
            onClick={() => setIsCalendarOpen(true)}
            className="flex items-center justify-center gap-1 px-2 py-1 text-xs bg-blue-600 text-white rounded-md hover:bg-blue-700 h-8 min-w-[100px]"
          >
            <FiCalendar className="w-3.5 h-3.5" />
            {formattedDate}
          </button>
          
          {/* Toggle butonu */}
          <button
            onClick={() => setIsCompactView(!isCompactView)}
            className="flex items-center justify-center gap-1 px-2 py-1 text-xs bg-dijle-dark-blue text-white rounded-md hover:bg-dijle-light-blue h-8 min-w-[100px]"
          >
            {isCompactView ? (
              <>
                <FiMaximize2 className="w-3.5 h-3.5" />
                Detailed View
              </>
            ) : (
              <>
                <FiMinimize2 className="w-3.5 h-3.5" />
                Compact View
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search results badges with scroll arrows */}
      {(searchResults.length > 0 || onHoldSearchResults.length > 0) && (
        <div className="mb-4 relative">
          <button 
            onClick={() => scrollBadges('left')}
            className="absolute left-0 top-1/2 -translate-y-1/2 bg-white z-10 shadow-md rounded-full p-1 hover:bg-gray-100"
            aria-label="Scroll left"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6"></polyline>
            </svg>
          </button>
          
          <div 
            id="badge-container"
            className="flex gap-2 overflow-x-auto px-8 py-1 scrollbar-hide"
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {searchResults.map(result => (
              <button
                key={result.date}
                onClick={() => navigateToDateWithResults(result.date)}
                className={`px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 ${
                  (result.date === startOfDay(new Date(selectedDate)).toISOString()) ||
                  (result.date === 'unassigned' && !isCompactView)
                    ? 'bg-blue-500 text-white' 
                    : 'bg-blue-100 text-blue-800 hover:bg-blue-200'
                }`}
              >
                {result.formattedDate} ({result.transportIds.length})
              </button>
            ))}
            
            {/* On Hold Results Badge */}
            {onHoldSearchResults.length > 0 && (
              <button
                onClick={() => {
                  setIsOnHoldModalOpen(true);
                  setHighlightedTransports(onHoldSearchResults);
                }}
                className="px-2 py-1 rounded-full text-xs font-medium flex-shrink-0 bg-orange-100 text-orange-800 hover:bg-orange-200 flex items-center gap-1"
              >
                <FiPause className="w-3 h-3" />
                On Hold ({onHoldSearchResults.length})
              </button>
            )}
          </div>
          
          <button 
            onClick={() => scrollBadges('right')}
            className="absolute right-0 top-1/2 -translate-y-1/2 bg-white z-10 shadow-md rounded-full p-1 hover:bg-gray-100"
            aria-label="Scroll right"
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="9 18 15 12 9 6"></polyline>
            </svg>
          </button>
        </div>
      )}
      
      {/* No results message */}
      {searchQuery && searchResults.length === 0 && onHoldSearchResults.length === 0 && (
        <div className="mt-2 text-sm text-gray-500 text-center">
          No matching transports found
        </div>
      )}

      <div className="flex flex-col lg:flex-row gap-4">
        <div className="w-full">
          {isCompactView ? (
            <CompactDayView 
              onSlotClick={handleSlotClick}
              highlightedTransports={highlightedTransports}
            />
          ) : (
            <TransportsList 
              selectedSlotNumber={selectedSlotNumber}
              setSelectedSlotNumber={setSelectedSlotNumber}
              highlightedTransports={highlightedTransports}
              isOnHoldModalOpen={isOnHoldModalOpen}
              setIsOnHoldModalOpen={setIsOnHoldModalOpen}
            />
          )}
        </div>
      </div>
      
      <PlanningCalendar 
        isOpen={isCalendarOpen} 
        onClose={() => setIsCalendarOpen(false)} 
      />

      {/* Trailer Locations Modal render ediliyor */}
      {isTrailerLocationsModalOpen && (
        <TrailerLocationsModal 
          isOpen={isTrailerLocationsModalOpen} 
          onClose={() => setIsTrailerLocationsModalOpen(false)} 
        />
      )}

      {/* Sort Confirmation Modal */}
      <SortConfirmModal
        isOpen={isSortConfirmModalOpen}
        onClose={() => setIsSortConfirmModalOpen(false)}
        onConfirm={handleSortSlotsByDestination}
        isLoading={isSortingSlots}
      />
    </div>
  );
};

export default PlanningPage;