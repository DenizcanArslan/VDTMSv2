import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState, useEffect } from 'react';
import { FiScissors, FiX, FiCalendar, FiMapPin, FiInfo } from 'react-icons/fi';
import { format } from 'date-fns';
import { toast } from 'react-toastify';

export default function CutTransportModal({ isOpen, onClose, transport, onCut }) {
  const [cutDate, setCutDate] = useState('');
  const [cutType, setCutType] = useState('TRAILER');
  const [locationId, setLocationId] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [notes, setNotes] = useState('');
  const [locations, setLocations] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [showFuturePlanningsWarning, setShowFuturePlanningsWarning] = useState(false);
  const [futurePlannings, setFuturePlannings] = useState([]);

  // Modal açıldığında varsayılan değerleri ayarla
  useEffect(() => {
    if (isOpen && transport) {
      // Bugünün tarihini varsayılan olarak ayarla
      const today = new Date();
      setCutDate(format(today, 'yyyy-MM-dd'));
      
      // Varsayılan kesme tipini transport içeriğine göre ayarla
      let defaultCutType = 'TRAILER';
      if (transport.containerNumber && transport.trailer) {
        defaultCutType = 'BOTH';
      } else if (transport.containerNumber) {
        defaultCutType = 'CONTAINER';
      } else if (transport.trailer) {
        defaultCutType = 'TRAILER';
      }
      
      setCutType(defaultCutType);
      
      // Diğer alanları sıfırla
      setLocationId('');
      setCustomLocation('');
      setNotes('');
      setUseCustomLocation(false);
      
      // Lokasyonları yükle
      fetchLocations();
    }
  }, [isOpen, transport]);

  // Kesme lokasyonlarını getir
  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/planning/cut-locations');
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      const data = await response.json();
      setLocations(data);
      
      // Varsayılan lokasyonu seç
      const defaultLocation = data.find(loc => loc.isDefault);
      if (defaultLocation) {
        setLocationId(defaultLocation.id.toString());
      }
    } catch (error) {
      console.error('Error fetching locations:', error);
      toast.error('Failed to load locations');
    }
  };

  // Transport'un gelecek günlerdeki planlamalarını kontrol et
  const checkFuturePlannings = () => {
    if (!transport || !cutDate) return [];
    
    const cutDateObj = new Date(cutDate);
    cutDateObj.setHours(0, 0, 0, 0); // Saat kısmını 00:00:00 olarak ayarla
    
    console.log('Transport:', transport);
    console.log('Cut Date:', cutDateObj);
    
    // Tüm tarihleri kaydedecek bir yapı oluştur
    const dateMap = {};
    
    // 1. Önce destinasyonları işle (en yüksek önceliğe sahip)
    if (transport.destinations && transport.destinations.length > 0) {
      transport.destinations.forEach(dest => {
        if (!dest.destinationDate) return;
        
        const destDate = new Date(dest.destinationDate);
        destDate.setHours(0, 0, 0, 0);
        
        // Kesme tarihinden sonraki destinasyonları kontrol et
        if (destDate > cutDateObj) {
          const dateStr = destDate.toISOString().split('T')[0];
          
          // Bu tarih için daha önce bir kayıt yoksa veya varsa üzerine yaz (destination öncelikli)
          dateMap[dateStr] = {
            date: destDate,
            type: 'Destination',
            location: dest.frequentLocation?.name || 'Unknown Location',
            hasDestination: true
          };
        }
      });
    }
    
    // 2. Slot atamalarını kontrol et
    if (transport.slotAssignments && transport.slotAssignments.length > 0) {
      transport.slotAssignments.forEach(slot => {
        if (!slot.date) return;
        
        const slotDate = new Date(slot.date);
        slotDate.setHours(0, 0, 0, 0);
        
        // Kesme tarihinden sonraki slot'ları kontrol et
        if (slotDate > cutDateObj) {
          const dateStr = slotDate.toISOString().split('T')[0];
          
          // Bu tarih için daha önce bir kayıt yoksa, yeni kayıt oluştur
          // Eğer Destination kaydı varsa, Slot Assignment bilgisini kayda ekle
          if (dateMap[dateStr]) {
            dateMap[dateStr].hasSlot = true;
            // Eğer bu tarihte destination yoksa, Slot Assignment tip olarak kullan
            if (!dateMap[dateStr].hasDestination) {
              dateMap[dateStr].type = 'Slot Assignment';
            }
          } else {
            // Bu tarih için yeni bir kayıt oluştur
            dateMap[dateStr] = {
              date: slotDate,
              type: 'Slot Assignment',
              hasSlot: true
            };
          }
        }
      });
    }
    
    // 3. Advanced Planning durumunu kontrol et
    if (transport.departureDate && transport.returnDate) {
      const departureDate = new Date(transport.departureDate);
      const returnDate = new Date(transport.returnDate);
      departureDate.setHours(0, 0, 0, 0);
      returnDate.setHours(0, 0, 0, 0);
      
      // Kesme tarihinden sonraki tarihler için advanced planning bilgisi ekle
      if (returnDate > cutDateObj) {
        const startDate = new Date(Math.max(cutDateObj.getTime(), departureDate.getTime()));
        startDate.setDate(startDate.getDate() + 1); // Kesme tarihinden sonraki günden başla
        
        let currentDate = new Date(startDate);
        while (currentDate <= returnDate) {
          const dateStr = currentDate.toISOString().split('T')[0];
          
          // Bu tarih için daha önce bir kayıt var mı kontrol et
          if (dateMap[dateStr]) {
            // Var olan kayda advanced planning bilgisini ekle
            dateMap[dateStr].isAdvancedPlanning = true;
            dateMap[dateStr].info = dateMap[dateStr].info || 'Advanced Planning';
          } else {
            // Bu tarih için yeni bir kayıt oluştur
            dateMap[dateStr] = {
              date: new Date(currentDate),
              type: 'Slot Assignment',
              info: 'Advanced Planning',
              isAdvancedPlanning: true
            };
          }
          
          // Bir sonraki güne geç
          currentDate.setDate(currentDate.getDate() + 1);
        }
      }
    }
    
    // Object'ten array'e dönüştür ve tarihe göre sırala
    const sortedFuturePlannings = Object.values(dateMap).sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    
    console.log('Sorted Future Plannings:', sortedFuturePlannings);
    
    return sortedFuturePlannings;
  };

  // Cut Type değiştiğinde içerik uygunluğunu kontrol et
  const handleCutTypeChange = (e) => {
    const newCutType = e.target.value;
    
    // Seçilen cut type için gerekli kontrolleri yap
    if (newCutType === 'CONTAINER' && !transport.containerNumber) {
      toast.warning('This transport does not have a container');
    }
    
    if (newCutType === 'TRAILER' && !transport.trailer) {
      toast.warning('This transport does not have a trailer');
    }
    
    if (newCutType === 'BOTH') {
      if (!transport.containerNumber && !transport.trailer) {
        toast.warning('This transport does not have a container or trailer');
      } else if (!transport.containerNumber) {
        toast.warning('This transport does not have a container');
      } else if (!transport.trailer) {
        toast.warning('This transport does not have a trailer');
      }
    }
    
    setCutType(newCutType);
  };

  // Kesme işlemini gerçekleştir
  const handleCut = async () => {
    // Transport zaten kesilmiş mi kontrolü
    if (transport.isCut) {
      toast.error('This transport has already been cut');
      return;
    }

    if (!cutDate) {
      toast.error('Please select a cut date');
      return;
    }

    if (!cutType) {
      toast.error('Please select a cut type');
      return;
    }

    // Transport içeriği ile cut type uyumunu kesin olarak kontrol et
    if (cutType === 'CONTAINER' && !transport.containerNumber) {
      toast.error('Cannot cut container: This transport does not have a container');
      return;
    }
    
    if (cutType === 'TRAILER' && !transport.trailer) {
      toast.error('Cannot cut trailer: This transport does not have a trailer');
      return;
    }
    
    if (cutType === 'BOTH') {
      if (!transport.containerNumber) {
        toast.error('Cannot cut container+trailer: This transport does not have a container');
        return;
      }
      if (!transport.trailer) {
        toast.error('Cannot cut container+trailer: This transport does not have a trailer');
        return;
      }
    }

    if (!useCustomLocation && !locationId) {
      toast.error('Please select a location');
      return;
    }

    if (useCustomLocation && !customLocation) {
      toast.error('Please enter a custom location');
      return;
    }

    // Transport'un gelecek günlerdeki planlamalarını kontrol et
    const plannings = checkFuturePlannings();
    if (plannings.length > 0) {
      setFuturePlannings(plannings);
      setShowFuturePlanningsWarning(true);
      return; // İşlemi burada durdur, kullanıcı onayladıktan sonra devam et
    }

    // Uyarı yoksa veya kullanıcı onayladıysa kesme işlemini gerçekleştir
    proceedWithCut();
  };

  // Kesme işlemini API çağrısı ile gerçekleştir
  const proceedWithCut = async () => {
    setIsLoading(true);

    try {
      const response = await fetch(`/api/planning/transports/${transport.id}/cut`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cutDate,
          cutType,
          locationId: useCustomLocation ? null : parseInt(locationId),
          customLocation: useCustomLocation ? customLocation : null,
          notes,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to cut transport');
      }

      const data = await response.json();
      toast.success('Transport cut successfully');
      onCut(data);
      onClose();
    } catch (error) {
      console.error('Error cutting transport:', error);
      toast.error(error.message || 'Failed to cut transport');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Transition appear show={isOpen} as={Fragment}>
        <Dialog as="div" className="relative z-40" onClose={onClose}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-lg shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-medium text-gray-900 flex items-center gap-2">
                    <FiScissors className="w-5 h-5 text-red-500" />
                    Cut Transport
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-500 hover:text-gray-700 text-xl font-medium"
                  >
                    <span className="sr-only">Close</span>
                    <FiX />
                  </button>
                </div>

                {transport && (
                  <div className="mb-4 p-3 bg-gray-50 rounded-md">
                    <h3 className="font-medium text-sm text-gray-700 mb-2">Transport Details</h3>
                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div>
                        <span className="text-gray-500">Order Number:</span>
                        <span className="ml-1 font-medium">{transport.transportOrderNumber}</span>
                      </div>
                      <div>
                        <span className="text-gray-500">Client:</span>
                        <span className="ml-1 font-medium">{transport.client?.name}</span>
                      </div>
                      {transport.containerNumber && (
                        <div>
                          <span className="text-gray-500">Container:</span>
                          <span className="ml-1 font-medium">{transport.containerNumber}</span>
                        </div>
                      )}
                      {transport.trailer && (
                        <div>
                          <span className="text-gray-500">Trailer:</span>
                          <span className="ml-1 font-medium">{transport.trailer.nickName}</span>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                <div className="space-y-4">
                  {/* Kesme Tarihi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <FiCalendar className="w-4 h-4" />
                      Cut Date
                    </label>
                    <input
                      type="date"
                      value={cutDate}
                      onChange={(e) => setCutDate(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    />
                  </div>

                  {/* Kesme Tipi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cut Type
                    </label>
                    <select
                      value={cutType}
                      onChange={handleCutTypeChange}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      required
                    >
                      <option 
                        value="TRAILER" 
                        disabled={!transport || !transport.trailer}
                      >
                        Trailer {!transport || !transport.trailer ? '(Not Available)' : ''}
                      </option>
                      <option 
                        value="CONTAINER" 
                        disabled={!transport || !transport.containerNumber}
                      >
                        Container {!transport || !transport.containerNumber ? '(Not Available)' : ''}
                      </option>
                      <option 
                        value="BOTH" 
                        disabled={!transport || !transport.containerNumber || !transport.trailer}
                      >
                        Container+Trailer {(!transport || !transport.containerNumber || !transport.trailer) ? '(Not Available)' : ''}
                      </option>
                    </select>
                  </div>

                  {/* Lokasyon Seçimi */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <FiMapPin className="w-4 h-4" />
                      Location
                    </label>
                    
                    <div className="flex items-center mb-2">
                      <input
                        type="checkbox"
                        id="useCustomLocation"
                        checked={useCustomLocation}
                        onChange={(e) => setUseCustomLocation(e.target.checked)}
                        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                      />
                      <label htmlFor="useCustomLocation" className="ml-2 block text-sm text-gray-700">
                        Use custom location
                      </label>
                    </div>
                    
                    {useCustomLocation ? (
                      <input
                        type="text"
                        value={customLocation}
                        onChange={(e) => setCustomLocation(e.target.value)}
                        placeholder="Enter custom location"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                      />
                    ) : (
                      <select
                        value={locationId}
                        onChange={(e) => setLocationId(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                        required
                      >
                        <option value="">Select a location</option>
                        {locations.map((location) => (
                          <option key={location.id} value={location.id}>
                            {location.name} {location.isDefault ? '(Default)' : ''}
                          </option>
                        ))}
                      </select>
                    )}
                  </div>

                  {/* Notlar */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-1">
                      <FiInfo className="w-4 h-4" />
                      Notes (Optional)
                    </label>
                    <textarea
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Add any additional notes about this cut operation"
                    />
                  </div>
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleCut}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {isLoading ? 'Processing...' : (
                      <>
                        <FiScissors className="w-4 h-4" />
                        Cut Transport
                      </>
                    )}
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>

      {/* Gelecek Planlamalar Uyarı Modalı */}
      <Transition appear show={showFuturePlanningsWarning} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowFuturePlanningsWarning(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black/50" aria-hidden="true" />
          </Transition.Child>

          <div className="fixed inset-0 flex items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-lg shadow-xl p-6">
                <div className="flex items-center justify-between mb-4">
                  <Dialog.Title className="text-lg font-medium text-amber-800 flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-amber-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Future Plannings Warning
                  </Dialog.Title>
                  <button
                    onClick={() => setShowFuturePlanningsWarning(false)}
                    className="text-gray-500 hover:text-gray-700 text-xl font-medium"
                  >
                    <span className="sr-only">Close</span>
                    <FiX />
                  </button>
                </div>

                <div className="bg-amber-50 p-4 rounded-md mb-4 text-amber-800">
                  <p className="mb-2 font-medium">This transport has future plannings after the cut date.</p>
                  <p className="text-sm">
                    If you proceed with cutting this transport, please make sure to remove these future slot assignments manually from the planning calendar.
                  </p>
                </div>

                <div className="max-h-60 overflow-y-auto bg-gray-50 rounded-md p-3">
                  <h3 className="text-sm font-medium text-gray-800 mb-2">Future Plannings:</h3>
                  {futurePlannings.length > 0 ? (
                    <ul className="space-y-2">
                      {futurePlannings.map((planning, index) => {
                        // Tarihi formatla
                        const date = new Date(planning.date);
                        const formattedDate = format(date, 'dd MMM yyyy');
                        
                        return (
                          <li key={index} className="text-sm bg-white p-2 rounded border border-gray-200">
                            <div className="flex justify-between items-center">
                              <span className="font-medium">{formattedDate}</span>
                              <span className={`text-xs px-2 py-1 rounded-full ${
                                planning.type === 'Destination' ? 'bg-green-100 text-green-800' : 'bg-blue-100 text-blue-800'
                              }`}>
                                {planning.type}
                              </span>
                            </div>
                            <div className="mt-1 flex flex-col gap-1">
                              {planning.location && (
                                <div className="text-xs text-gray-600 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1 text-gray-500" viewBox="0 0 20 20" fill="currentColor">
                                    <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
                                  </svg>
                                  {planning.location}
                                </div>
                              )}
                              {planning.isAdvancedPlanning && (
                                <div className="text-xs text-blue-600 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                  Advanced Planning
                                </div>
                              )}
                              {planning.hasSlot && !planning.isAdvancedPlanning && (
                                <div className="text-xs text-gray-500 flex items-center">
                                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                                  </svg>
                                  Planning Slot
                                </div>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  ) : (
                    <p className="text-sm text-gray-500 italic">No future plannings found.</p>
                  )}
                </div>

                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowFuturePlanningsWarning(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowFuturePlanningsWarning(false);
                      proceedWithCut();
                    }}
                    className="px-4 py-2 text-sm font-medium text-white bg-amber-600 border border-transparent rounded-md shadow-sm hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-amber-500 flex items-center gap-2"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Proceed Anyway
                  </button>
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </Dialog>
      </Transition>
    </>
  );
} 