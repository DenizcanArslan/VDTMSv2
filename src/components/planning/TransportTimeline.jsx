import { Dialog } from '@headlessui/react';
import { VerticalTimeline, VerticalTimelineElement } from 'react-vertical-timeline-component';
import 'react-vertical-timeline-component/style.min.css';
import { FiMapPin, FiTruck, FiBox, FiCalendar, FiCheck, FiRotateCcw } from 'react-icons/fi';
import { format } from 'date-fns';
import { useAppDispatch } from '@/hooks/redux';
import { updateTransportEtas, updateTransportCurrentStatus } from '@/redux/features/planningSlice';
import { toast } from 'react-toastify';
import { useState, useEffect, useRef } from 'react';
import { useSocket } from '@/context/SocketContext';

const isSpecialLocation = (locationName) => {
  const specialKeywords = ['SCAN LO', 'SCAN RO', 'SCAN', 'SCAN+FYSIEKE', 'CERTIWEIGHT', 'DOUANE STOP', 'FAVV LO', 'FAVV KEURPUNT MERKSEM'];
  return specialKeywords.some(keyword => locationName?.toUpperCase().includes(keyword));
};

// Önce CSS animasyonunu ekleyelim (component'in en üstüne)
const pulseAnimation = `
  @keyframes pulse {
    0% {
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0.7);
    }
    70% {
      box-shadow: 0 0 0 10px rgba(59, 130, 246, 0);
    }
    100% {
      box-shadow: 0 0 0 0 rgba(59, 130, 246, 0);
    }
  }
`;

export default function TransportTimeline({ isOpen, onClose, transport }) {
  const dispatch = useAppDispatch();
  const { on, off } = useSocket();
  const transportIdRef = useRef(null);
  
  const formatDate = (date) => {
    if (!date) return '';
    return format(new Date(date), "yyyy-MM-dd'T'HH:mm");
  };

  // Modal kapanırken state'i sıfırlamak için useEffect
  useEffect(() => {
    if (isOpen) {
      // Modal açıldığında database'den gelen veriyle state'i güncelle
      setPickUpEta(formatDate(transport.pickUpEta));
      setDestinationEtas(
        transport.destinations?.map(d => ({ 
          destinationId: d.id, 
          eta: formatDate(d.eta)
        })) || []
      );
      setDropOffEta(formatDate(transport.dropOffEta));
      
      // Store the current transport ID for Socket.IO filtering
      transportIdRef.current = transport.id;
    }
  }, [isOpen, transport]);
  
  // Listen for real-time ETA updates via Socket.IO
  useEffect(() => {
    // Only set up listeners when the modal is open
    if (!isOpen || !transport) return;
    
    const handleEtaUpdate = (updatedTransport) => {
      // Only update if this is the same transport we're viewing
      if (updatedTransport.id !== transport.id) return;
      
      console.log('Received ETA update for current transport:', updatedTransport.id);
      
      // Update the modal state with new ETAs
      if (updatedTransport.pickUpEta !== undefined) {
        setPickUpEta(formatDate(updatedTransport.pickUpEta));
      }
      
      if (updatedTransport.dropOffEta !== undefined) {
        setDropOffEta(formatDate(updatedTransport.dropOffEta));
      }
      
      if (updatedTransport.destinations) {
        const newDestinationEtas = updatedTransport.destinations.map(dest => ({
          destinationId: dest.id,
          eta: formatDate(dest.eta)
        }));
        
        // Update destinations with care to not interfere with user's current edits
        setDestinationEtas(prevEtas => {
          // If no previous ETAs or if destinations count is different, use new values
          if (!prevEtas || prevEtas.length === 0 || prevEtas.length !== newDestinationEtas.length) {
            return newDestinationEtas;
          }
          
          // Otherwise, update each destination ETA individually
          return newDestinationEtas;
        });
      }
      
  
    };
    
    // Set up Socket.IO listeners
    const etaUpdateCleanup = on('transport:eta-update', handleEtaUpdate);
    const transportUpdateCleanup = on('transport:update', (data) => {
      // Only handle transport updates that include ETA changes
      if (data.id === transport.id && 
         (data.pickUpEta !== undefined || 
          data.dropOffEta !== undefined || 
          data.destinations)) {
        handleEtaUpdate(data);
      }
    });
    
    // Clean up listeners when component unmounts or modal closes
    return () => {
      etaUpdateCleanup();
      transportUpdateCleanup();
    };
  }, [isOpen, transport, on, formatDate]);

  const [pickUpEta, setPickUpEta] = useState('');

  const [destinationEtas, setDestinationEtas] = useState([]);

  const [dropOffEta, setDropOffEta] = useState('');

  const isPickUpDisabled = () => {
    return transport.currentStatus === 'PLANNED' || !transport.sentToDriver;
  };

  const isDestinationDisabled = (index) => {
    // Basic check for all transport types
    if (transport.currentStatus === 'PLANNED' || !transport.sentToDriver) return true;
    
    // For SHUNT transports with no pick-up quay
    if (transport.type === 'SHUNT' && !transport.pickUpQuay) {
      // If this is the first destination, it's always enabled
      if (index === 0) return false;
      
      // Otherwise, check if the previous destination has an ETA
      return !destinationEtas[index - 1]?.eta;
    }
    
    // For all other cases (including SHUNT with pick-up quay)
    if (index === 0) return !pickUpEta;
    return !destinationEtas[index - 1]?.eta;
  };

  const isDropOffDisabled = () => {
    // Basic check for all transport types
    if (transport.currentStatus === 'PLANNED' || !transport.sentToDriver) return true;
    
    // For SHUNT transports
    if (transport.type === 'SHUNT') {
      // If there are no destinations, check if pick-up exists and has ETA
      if (!transport.destinations || transport.destinations.length === 0) {
        return transport.pickUpQuay ? !pickUpEta : false;
      }
      
      // If there are destinations, check if the last one has an ETA
      // Filter to only include destinations that have a frequentLocation
      const validDestinations = transport.destinations.filter(dest => dest.frequentLocation);
      if (validDestinations.length === 0) {
        return transport.pickUpQuay ? !pickUpEta : false;
      }
      
      // Find the last valid destination's ETA
      const lastDestIndex = destinationEtas.findIndex(
        d => d.destinationId === validDestinations[validDestinations.length - 1].id
      );
      return lastDestIndex === -1 || !destinationEtas[lastDestIndex]?.eta;
    }
    
    // For non-SHUNT transports, use the original logic
    if (transport.destinations?.length === 0) return !pickUpEta;
    return !destinationEtas[destinationEtas.length - 1]?.eta;
  };

  // ETA'ların geçerli olup olmadığını kontrol eden fonksiyon
  const validateEtas = () => {
    console.log("Transport type:", transport.type);
    console.log("Pick Up ETA:", pickUpEta);
    console.log("Drop Off ETA:", dropOffEta);
    console.log("Destination ETAs:", destinationEtas);

    // For SHUNT transports, all ETAs are optional
    if (transport.type === 'SHUNT') {
      console.log("SHUNT transport - all ETAs are optional");
      return true;
    }

    const pickUpTime = pickUpEta ? new Date(pickUpEta).getTime() : null;
    const dropOffTime = dropOffEta ? new Date(dropOffEta).getTime() : null;
    const destinationTimes = destinationEtas.map(d => d.eta ? new Date(d.eta).getTime() : null);
    
    // For non-SHUNT transports, check if at least one ETA is present
    if (!pickUpEta && !dropOffEta && !destinationEtas.some(d => d.eta)) {
      console.log("Non-SHUNT transport missing all ETAs");
      toast.error('At least one ETA is required');
      return false;
    }
    
    // Sıralama kontrolleri - sadece doldurulmuş alanlar için
    
    // Pick Up ETA'sı varsa kontroller
    if (pickUpTime) {
      // Destinationlar Pick Up'tan sonra olmalı
      if (destinationTimes.some(time => time && time < pickUpTime)) {
        toast.error('Stop ETAs cannot be before Pick Up ETA');
        return false;
      }
      // Drop Off Pick Up'tan sonra olmalı
      if (dropOffTime && dropOffTime < pickUpTime) {
        toast.error('Drop Off ETA cannot be before Pick Up ETA');
        return false;
      }
    }
    
    // Destinationların sıralaması kontrol edilmeli
    for (let i = 0; i < destinationTimes.length - 1; i++) {
      const currentTime = destinationTimes[i];
      const nextTime = destinationTimes[i + 1];
      if (currentTime && nextTime && nextTime < currentTime) {
        toast.error(`Stop ${i + 2} ETA cannot be before Stop ${i + 1} ETA`);
        return false;
      }
    }
    
    // Son destination varsa, Drop Off ondan sonra olmalı
    const lastDestTime = destinationTimes[destinationTimes.length - 1];
    if (lastDestTime && dropOffTime && dropOffTime < lastDestTime) {
      toast.error('Drop Off ETA cannot be before last Stop ETA');
      return false;
    }
    
    return true;
  };

  const handleEtaChange = (type, value, destinationId = null) => {
    // For all transport types, if an ETA is cleared, reset subsequent ETAs
    if (!value || value.trim() === '') {
      if (type === 'pickUp') {
        // Pick up silinirse tüm destination ve drop off eta'ları sıfırlanır
        setDestinationEtas(destinationEtas.map(d => ({ ...d, eta: '' })));
        setDropOffEta('');
      } else if (type === 'destination') {
        // Bir destination silinirse, o indexten sonraki tüm destination'lar ve drop off sıfırlanır
        const currentIndex = destinationEtas.findIndex(d => d.destinationId === destinationId);
        setDestinationEtas(
          destinationEtas.map((d, index) => ({
            ...d,
            eta: index > currentIndex ? '' : d.eta
          }))
        );
        setDropOffEta('');
      }
    }

    // Normal eta güncelleme işlemi
    if (type === 'pickUp') {
      setPickUpEta(value);
    } else if (type === 'destination') {
      setDestinationEtas(
        destinationEtas.map(d =>
          d.destinationId === destinationId
            ? { ...d, eta: value }
            : d
        )
      );
    } else if (type === 'dropOff') {
      setDropOffEta(value);
    }
  };

  const handleEtaUpdate = async () => {
    try {
      // ETA'ları kontrol et
      if (!validateEtas()) {
        return;
      }

      // For SHUNT transports, only include ETAs for steps that exist
      const pickUpDate = pickUpEta ? new Date(pickUpEta).toISOString() : null;
      const dropOffDate = dropOffEta ? new Date(dropOffEta).toISOString() : null;
      
      // Filter destination ETAs to only include those with frequentLocation for SHUNT transports
      let updatedDestinationEtas = destinationEtas;
      if (transport.type === 'SHUNT') {
        updatedDestinationEtas = destinationEtas.filter((d, index) => {
          const dest = transport.destinations[index];
          return dest && dest.frequentLocation;
        });
      }
      
      // Convert to ISO strings
      updatedDestinationEtas = updatedDestinationEtas.map(d => ({
        ...d,
        eta: d.eta ? new Date(d.eta).toISOString() : null
      }));

      // For SHUNT transports, only include pickUpEta if pickUpQuay exists
      // and only include dropOffEta if dropOffQuay exists
      const updateData = {
        transportId: transport.id,
        destinationEtas: updatedDestinationEtas
      };
      
      if (transport.type !== 'SHUNT' || transport.pickUpQuay) {
        updateData.pickUpEta = pickUpDate;
      }
      
      if (transport.type !== 'SHUNT' || transport.dropOffQuay) {
        updateData.dropOffEta = dropOffDate;
      }

      // Show immediate loading notification
      toast.info('Updating ETAs...', { autoClose: 1000 });
      
      // Call the API to update ETAs
      const result = await dispatch(updateTransportEtas(updateData)).unwrap();
      
      // Success message
      toast.success('ETAs updated successfully');
      
      // We don't close the modal anymore so users can continue working
      // and see real-time updates from other users
      console.log('ETA update successful, modal remains open', result);
    } catch (error) {
      console.error('Error updating ETAs:', error);
      toast.error('Failed to update ETAs');
    }
  };

  const handleCompleteTransport = async () => {
    try {
      await dispatch(updateTransportCurrentStatus({
        transportId: transport.id,
        currentStatus: transport.currentStatus === 'COMPLETED' ? 'ONGOING' : 'COMPLETED',
        sentToDriver: true
      })).unwrap();
      
      toast.success(
        transport.currentStatus === 'COMPLETED' 
          ? 'Transport status changed to ongoing' 
          : 'Transport marked as completed'
      );
    } catch (error) {
      console.error('Error updating transport status:', error);
      toast.error('Failed to update transport status');
    }
  };

  const isCompleteButtonEnabled = () => {
    // ETA kontrollerini kaldırdık - transport'u istediği zaman tamamlayabilmek için
    return true;
  };

  return (
    <>
      <style>{pulseAnimation}</style>
      <Dialog
        open={isOpen}
        onClose={onClose}
        className="relative z-50"
      >
        <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Dialog.Panel className="mx-auto max-w-3xl w-full bg-white rounded-lg shadow-xl p-6 max-h-[90vh] overflow-y-auto">
            <Dialog.Title className="text-lg font-medium mb-4 text-van-dijle">
              <div className="flex items-center justify-between">
                <span>Transport Timeline - {transport.transportOrderNumber}</span>
                {(transport.bookingReference || transport.containerNumber) && (
                  <span className="text-sm flex items-center gap-2">
                    {transport.bookingReference && `• Booking ref: ${transport.bookingReference}`}
                    {transport.containerNumber && ` • Container: ${transport.containerNumber}`}
                  </span>
                )}
              </div>
            </Dialog.Title>

            <div className="timeline-wrapper relative">
              <div className="absolute left-0 top-4 bottom-4 flex flex-col items-center w-8">
                <div className="h-full w-0.5 bg-gray-200"></div>
                <div className="absolute inset-0 flex flex-col justify-around items-center">
                  {(transport.pickUpQuay || transport.type !== 'SHUNT') && (
                    <div className={`w-8 h-8 rounded-full 
                      ${pickUpEta ? 'bg-blue-500' : 'bg-gray-400'}
                      ${pickUpEta && !destinationEtas.some(d => d.eta) && !dropOffEta ? 'animate-[pulse_2s_infinite]' : ''}
                      border-2 border-white shadow-sm flex items-center justify-center`}>
                      <FiTruck className="w-4 h-4 text-white" />
                    </div>
                  )}
                  
                  {transport.destinations?.filter(dest => dest.frequentLocation || transport.type !== 'SHUNT').map((dest, index) => (
                    <div 
                      key={index} 
                      className={`w-8 h-8 rounded-full 
                        ${destinationEtas[index]?.eta ? 'bg-amber-500' : 'bg-gray-400'}
                        ${destinationEtas[index]?.eta && 
                          !destinationEtas.slice(index + 1).some(d => d.eta) && 
                          !dropOffEta ? 'animate-[pulse_2s_infinite]' : ''}
                        border-2 border-white shadow-sm flex items-center justify-center 
                        transition-colors duration-200`}
                    >
                      <FiMapPin className="w-4 h-4 text-white" />
                    </div>
                  ))}
                  
                  {(transport.dropOffQuay || transport.type !== 'SHUNT') && (
                    <div className={`w-8 h-8 rounded-full 
                      ${dropOffEta ? 'bg-green-500' : 'bg-gray-400'}
                      ${dropOffEta ? 'animate-[pulse_2s_infinite]' : ''}
                      border-2 border-white shadow-sm flex items-center justify-center 
                      transition-colors duration-200`}
                    >
                      <FiBox className="w-4 h-4 text-white" />
                    </div>
                  )}
                </div>
              </div>

              <VerticalTimeline animate={false} layout="1-column" lineColor="#e5e7eb">
                {(transport.pickUpQuay || transport.type !== 'SHUNT') && (
                  <VerticalTimelineElement
                    className="vertical-timeline-element"
                    contentStyle={{ 
                      background: '#f3f4f6', 
                      color: '#111827',
                      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                      padding: '0.75rem',
                      minHeight: 'auto'
                    }}
                    contentArrowStyle={{ borderRight: '7px solid #f3f4f6' }}
                  >
                    <h3 className="font-medium text-van-dijle">Pick Up</h3>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">{transport.pickUpQuay?.name}</p>
                      <div className="ml-4 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiCalendar className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="datetime-local"
                          value={pickUpEta}
                          onChange={(e) => handleEtaChange('pickUp', e.target.value)}
                          disabled={isPickUpDisabled()}
                          className={`pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg shadow-sm 
                            ${isPickUpDisabled()
                              ? 'bg-gray-100 cursor-not-allowed' 
                              : 'bg-white hover:border-gray-400'} 
                            focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-56`}
                        />
                      </div>
                    </div>
                  </VerticalTimelineElement>
                )}

                {transport.destinations?.filter(dest => dest.frequentLocation || transport.type !== 'SHUNT').map((dest, index) => (
                  <VerticalTimelineElement
                    key={dest.id}
                    className="vertical-timeline-element"
                    contentStyle={{ 
                      background: '#f3f4f6', 
                      color: '#111827',
                      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                      padding: '0.75rem',
                      minHeight: 'auto'
                    }}
                    contentArrowStyle={{ borderRight: '7px solid #f3f4f6' }}
                    iconStyle={{ 
                      background: '#f59e0b', 
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    icon={<FiMapPin className="w-4 h-4" />}
                  >
                    <h3 className="font-medium text-van-dijle">Stop {index + 1}</h3>
                    <div className="flex items-center justify-between">
                      <p className={`text-sm ${isSpecialLocation(dest.frequentLocation?.name) ? 'text-red-600' : 'text-gray-600'}`}>
                        { (dest.frequentLocation 
                          ? `${dest.frequentLocation.name}, ${dest.frequentLocation.country.substring(0, 2)}${dest.frequentLocation.km ? ` (${dest.frequentLocation.km}km)` : ''}`
                          : '-'
                        )}
                      </p>
                      <div className="ml-4 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiCalendar className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="datetime-local"
                          value={destinationEtas[index]?.eta || ''}
                          onChange={(e) => handleEtaChange('destination', e.target.value, dest.id)}
                          disabled={isDestinationDisabled(index)}
                          className={`pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg shadow-sm 
                            ${isDestinationDisabled(index)
                              ? 'bg-gray-100 cursor-not-allowed' 
                              : 'bg-white hover:border-gray-400'} 
                            focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-56`}
                        />
                      </div>
                    </div>
                    <div className="mt-1 text-xs text-gray-500">
                      <p className="font-medium">
                        {dest.destinationDate
                          ? format(new Date(dest.destinationDate), 'dd MMM yyyy')
                          : 'Date not set'
                        }
                        {dest.destinationTime && (
                          <span className="ml-2">
                            {dest.destinationTime.substring(11, 16)}
                          </span>
                        )}
                      </p>
                    </div>
                  </VerticalTimelineElement>
                ))}

                {(transport.dropOffQuay || transport.type !== 'SHUNT') && (
                  <VerticalTimelineElement
                    className="vertical-timeline-element"
                    contentStyle={{ 
                      background: '#f3f4f6', 
                      color: '#111827',
                      boxShadow: '0 1px 3px 0 rgb(0 0 0 / 0.1)',
                      padding: '0.75rem',
                      minHeight: 'auto'
                    }}
                    contentArrowStyle={{ borderRight: '7px solid #f3f4f6' }}
                    iconStyle={{ 
                      background: '#ef4444', 
                      color: '#fff',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}
                    icon={<FiBox className="w-4 h-4" />}
                  >
                    <h3 className="font-medium text-van-dijle">Drop Off</h3>
                    <div className="flex items-center justify-between">
                      <p className="text-sm text-gray-600">{transport.dropOffQuay?.name}</p>
                      <div className="ml-4 relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <FiCalendar className="h-4 w-4 text-gray-400" />
                        </div>
                        <input
                          type="datetime-local"
                          value={dropOffEta}
                          onChange={(e) => handleEtaChange('dropOff', e.target.value)}
                          disabled={isDropOffDisabled()}
                          className={`pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg shadow-sm 
                            ${isDropOffDisabled()
                              ? 'bg-gray-100 cursor-not-allowed' 
                              : 'bg-white hover:border-gray-400'} 
                            focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 w-56`}
                        />
                      </div>
                    </div>
                  </VerticalTimelineElement>
                )}
              </VerticalTimeline>
            </div>

            <div className="mt-6 flex justify-between items-center">
              <div className="flex gap-2">
                {/* Complete Transport button */}
                <button
                  onClick={handleCompleteTransport}
                  disabled={!isCompleteButtonEnabled()}
                  className={`
                    inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md
                    ${!isCompleteButtonEnabled() 
                      ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                      : transport.currentStatus === 'COMPLETED'
                        ? 'bg-orange-600 text-white hover:bg-orange-700'
                        : 'bg-green-600 text-white hover:bg-green-700'
                    }
                    transition-colors duration-200
                  `}
                >
                  {transport.currentStatus === 'COMPLETED' ? (
                    <>
                      <FiRotateCcw className="w-4 h-4" />
                      Mark as Ongoing
                    </>
                  ) : (
                    <>
                      <FiCheck className="w-4 h-4" />
                      Complete Transport
                    </>
                  )}
                </button>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={onClose}
                  className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
                >
                  Close
                </button>
                
                <button
                  onClick={handleEtaUpdate}
                  className="inline-flex justify-center px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition-colors duration-200"
                >
                  Update ETAs
                </button>
              </div>
            </div>
          </Dialog.Panel>
        </div>
      </Dialog>
    </>
  );
} 