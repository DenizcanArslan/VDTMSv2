"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transportSchema } from "@/lib/validations/transport";
import { toast } from "react-toastify";
import { addTransport } from "@/redux/features/planningSlice";
import {
  FiTruck,
  FiCalendar,
  FiClock,
  FiBox,
  FiHash,
  FiFileText,
  FiToggleRight,
  FiPlusCircle,
  FiX,
  FiChevronUp,
  FiChevronDown,
  FiAlertTriangle,
} from "react-icons/fi";
import { useAppSelector } from "@/hooks/redux";
import { useState, useEffect } from "react";
import { format, addHours } from "date-fns";
import {
  CONTAINER_TYPES,

} from "@/lib/constants/containerTypes";
import { getCountryCode } from '@/lib/constants/countries';
import { Switch } from '@headlessui/react';
import { transformTransportData } from "@/lib/validations/transport";

export default function TransportForm({ onSubmit, onClose, initialData }) {
  const planningState = useAppSelector((state) => state.planning);
  const { clients, quays } = planningState;

  const {
    register,
    handleSubmit: hookFormSubmit,
    formState: { errors, isSubmitting },
    watch,
    setValue,
    getValues,
    trigger,
  } = useForm({
    resolver: zodResolver(transportSchema),
    defaultValues: {
      clientId: initialData?.clientId?.toString() || "",
      transportOrderNumber: initialData?.transportOrderNumber || "",
      containerBookingReference: initialData?.bookingReference || "",
      loadingUnloadingReference: initialData?.loadingUnloadingReference || "",
      containerNumber: initialData?.containerNumber || "",
      containerType: initialData?.containerType || null,
      adr: initialData?.adr || "NO",
      pickUpQuayId: initialData?.pickUpQuayId?.toString() || "",
      dropOffQuayId: initialData?.dropOffQuayId?.toString() || "",
      type: initialData?.type || "",
      departureDate: initialData?.departureDate 
        ? format(new Date(initialData.departureDate), "yyyy-MM-dd")
        : "",
      returnDate: initialData?.returnDate
        ? format(new Date(initialData.returnDate), "yyyy-MM-dd")
        : "",
      destinations: initialData?.destinations?.map(d => ({
        id: d.id,
        frequentLocationId: d.frequentLocation?.id ? parseInt(d.frequentLocation.id) : null,
       
        order: d.order,
        destinationDate: d.destinationDate 
          ? format(new Date(d.destinationDate), "yyyy-MM-dd")
          : format(new Date(), "yyyy-MM-dd"),
        destinationTime: d.destinationTime
          ? d.destinationTime.substring(11, 16)
          : "",
        eta: d.eta 
          ? format(new Date(d.eta), "yyyy-MM-dd'T'HH:mm")
          : null
      })) || [{ 
        order: 0,
        destinationDate: format(new Date(), "yyyy-MM-dd"),
        destinationTime: "",
        frequentLocationId: null,
       
        eta: null
      }],
      hasTransportOrder: initialData?.hasTransportOrder || false,
      requiresT1: initialData?.requiresT1 || false,
      t1Received: initialData?.t1Received || false
    },
  });

  const containerType = watch("containerType");
  const isHRContainer = containerType?.includes("HR");

  useEffect(() => {
    // Container type seçilmemiş veya boş ise genset "NO" olmalı
    setValue("genset", containerType?.includes("HR") ? "YES" : "NO");
  }, [containerType, setValue, isHRContainer]);

  const handleDestinationChange = (index, newValue) => {
    const currentDestinations = getValues('destinations');
    setValue(`destinations.${index}`, {
      ...currentDestinations[index],
      ...newValue,
      eta: currentDestinations[index].eta
    });
  };

  const [frequentLocations, setFrequentLocations] = useState([]);
  const [availableLocations, setAvailableLocations] = useState([]);
  const [searchTerms, setSearchTerms] = useState({});
  const [dropdownStates, setDropdownStates] = useState({});
  const [activeDropdownIndex, setActiveDropdownIndex] = useState(null);
  const [showAdvancedPlanning, setShowAdvancedPlanning] = useState(
    Boolean(initialData?.departureDate || initialData?.returnDate)
  );

  // Client değiştiğinde o client'a ait fiyatı olan lokasyonları getir
  const fetchLocationsForClient = async (clientId) => {
    if (!clientId) {
      setAvailableLocations([]);
      return;
    }
    try {
      const parsedClientId = parseInt(clientId);
      const response = await fetch(`/api/prices/locations/${parsedClientId}`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      console.log('Fetched locations for client:', data);
      setAvailableLocations(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Error fetching locations:', error);
      setAvailableLocations([]);
      toast.error('Failed to fetch locations');
    }
  };

  // Client değiştiğinde lokasyonları güncelle
  useEffect(() => {
    const clientId = watch("clientId");
    console.log('Client changed to:', clientId);
    if (clientId) {
      fetchLocationsForClient(clientId);
    }
  }, [watch("clientId")]);

  // Form ilk yüklendiğinde initialData'daki client için lokasyonları getir
  useEffect(() => {
    if (initialData?.clientId) {
      fetchLocationsForClient(initialData.clientId);
    }
  }, [initialData]);

  // Form ilk yüklendiğinde initialData'daki lokasyonları searchTerms'e ekle
  useEffect(() => {
    if (initialData?.destinations) {
      const initialSearchTerms = {};
      initialData.destinations.forEach((dest, index) => {
        if (dest.frequentLocation) {
          initialSearchTerms[index] = `${dest.frequentLocation.name}, ${dest.frequentLocation.country}`;
        }
      });
      setSearchTerms(initialSearchTerms);
    }
  }, [initialData]);

  useEffect(() => {
    // Click-outside handler
    const handleClickOutside = (event) => {
      if (!event.target.closest('.location-dropdown')) {
        setDropdownStates({});
        setActiveDropdownIndex(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const destinations = watch('destinations') || [];

  // Transport verilerini form için hazırla
  const prepareFormData = (transport) => {
    if (!transport) return defaultValues;

    return {
      ...transport,
      clientId: transport.client?.id,
      pickUpQuayId: transport.pickUpQuay?.id,
      dropOffQuayId: transport.dropOffQuay?.id,
      departureDate: transport.departureDate 
        ? format(new Date(transport.departureDate), 'yyyy-MM-dd')
        : '',
      returnDate: transport.returnDate
        ? format(new Date(transport.returnDate), 'yyyy-MM-dd')
        : '',
      destinations: transport.destinations?.map(dest => ({
        ...dest,
        frequentLocationId: dest.frequentLocation?.id,
        destinationTime: dest.destinationTime
          ? dest.destinationTime.substring(11, 16)
          : '',
        destinationDate: dest.destinationDate 
          ? format(new Date(dest.destinationDate), 'yyyy-MM-dd')
          : '',
        eta: dest.eta
      }))
    };
  };

  // Form verilerini API için hazırla
  const prepareApiData = (formData) => {
    console.log('Initial Data Destinations:', initialData?.destinations);
    console.log('Form Data Before Prepare:', formData.destinations);

    const preparedData = {
      ...formData,
      departureDate: formData.departureDate || null,
      returnDate: formData.returnDate || null,
      destinations: formData.destinations.map(dest => {
        const existingDest = initialData?.destinations?.find(d => d.id === dest.id);
        console.log('Existing Destination:', existingDest);
        console.log('Current Destination:', dest);
        
        const prepared = {
          id: dest.id || undefined,
          frequentLocationId: dest.frequentLocationId,
          order: dest.order,
          destinationTime: dest.destinationTime?.trim() || null,
          destinationDate: dest.destinationDate || null,
          eta: existingDest?.eta || dest.eta || null
        };
        console.log('Prepared Destination:', prepared);
        return prepared;
      })
    };

    console.log('Final Prepared Data:', preparedData.destinations);
    return preparedData;
  };

  const handleLocationSelect = (location, index) => {
    const destinations = getValues('destinations');
    const updatedDestination = {
      ...destinations[index],
      frequentLocationId: location.id,
      eta: location.eta
    };
    
    setValue(`destinations.${index}`, updatedDestination);
    trigger(`destinations.${index}.frequentLocationId`);
    setDropdownStates(prev => ({ ...prev, [index]: false }));
    setActiveDropdownIndex(null);
    setSearchTerms(prev => ({ 
      ...prev, 
      [index]: `${location.name}, ${location.country}`
    }));
  };

  const addDestination = () => {
    const destinations = getValues('destinations');
    setValue('destinations', [
      ...destinations,
      {
        order: destinations.length,
        destinationDate: format(new Date(), "yyyy-MM-dd"),
        destinationTime: "",
        frequentLocationId: null,
        eta: null
      }
    ]);
  };

  const removeDestination = (index) => {
    const destinations = getValues('destinations');
    if (destinations.length > 1) {
      setValue(
        'destinations',
        destinations
          .filter((_, i) => i !== index)
          .map((d, i) => ({ ...d, order: i }))
      );
    }
  };

  const moveDestination = (fromIndex, toIndex) => {
    const newDestinations = [...destinations];
    const [movedItem] = newDestinations.splice(fromIndex, 1);
    newDestinations.splice(toIndex, 0, movedItem);
    
    // Don't update the order property here, let transformTransportData handle it
    // This avoids the unique constraint error
    
    setValue('destinations', newDestinations);

    // searchTerms'i de güncelle
    const newSearchTerms = { ...searchTerms };
    const oldTerm = newSearchTerms[fromIndex];
    const targetTerm = newSearchTerms[toIndex];
    newSearchTerms[toIndex] = oldTerm;
    newSearchTerms[fromIndex] = targetTerm;
    setSearchTerms(newSearchTerms);
  };

  const handleLocationInputChange = (e, index) => {
    const value = e.target.value;
    setSearchTerms(prev => ({ ...prev, [index]: value }));
    
    // For SHUNT transports, if the input is empty, allow it but don't close the dropdown
    if (watch("type") === "SHUNT") {
      const destinations = getValues('destinations');
      const updatedDestination = {
        ...destinations[index],
        frequentLocationId: value.trim() === "" ? null : destinations[index].frequentLocationId
      };
      setValue(`destinations.${index}`, updatedDestination);
      
      // If the input is empty, don't show validation errors
      if (value.trim() === "") {
        // Clear any validation errors for this field
        const currentErrors = { ...errors };
        if (currentErrors.destinations && currentErrors.destinations[index]) {
          delete currentErrors.destinations[index].frequentLocationId;
        }
      }
      
      // Keep the dropdown open if there's text
      if (value.trim() !== "") {
        setDropdownStates(prev => ({ ...prev, [index]: true }));
        setActiveDropdownIndex(index);
      } else {
        // If the input is empty, close the dropdown
        setDropdownStates(prev => ({ ...prev, [index]: false }));
      }
      return;
    }
    
    setDropdownStates(prev => ({ ...prev, [index]: true }));
    setActiveDropdownIndex(index);
    
    // Input değiştiğinde frequentLocationId'yi null yap
    const destinations = getValues('destinations');
    const updatedDestination = {
      ...destinations[index],
      frequentLocationId: null
    };
    setValue(`destinations.${index}`, updatedDestination);
  };

  const handleSubmit = async (data) => {
    try {
      console.log('Form data before transform:', data);
      
      // For SHUNT transports, no quay validation is needed
      
      // Tarihleri kontrol et
      const destinations = data.destinations;
      for (let i = 0; i < destinations.length - 1; i++) {
        const currentDate = new Date(destinations[i].destinationDate);
        const nextDate = new Date(destinations[i + 1].destinationDate);
        
        if (currentDate > nextDate) {
          toast.error('Loading/Unloading Points dates must be in ascending order from top to bottom');
          return;
        }
      }
      
      // Tarihlerin ardışık olup olmadığını kontrol et (Advanced Planning açık değilse)
      if (!showAdvancedPlanning && destinations.length > 1) {
        let hasNonConsecutiveDates = false;
        
        // Tarihleri sırala
        const sortedDates = [...destinations]
          .map(d => new Date(d.destinationDate))
          .sort((a, b) => a - b);
        
        // Tarihleri gün bazında grupla
        const dateGroups = {};
        sortedDates.forEach(date => {
          const dateStr = date.toISOString().split('T')[0];
          if (!dateGroups[dateStr]) {
            dateGroups[dateStr] = [];
          }
          dateGroups[dateStr].push(date);
        });
        
        // Sadece benzersiz günleri al
        const uniqueDates = Object.keys(dateGroups).map(dateStr => new Date(dateStr));
        uniqueDates.sort((a, b) => a - b);
        
        // Eğer sadece bir benzersiz gün varsa, kontrol yapmayı atla
        if (uniqueDates.length > 1) {
          // Ardışık günleri kontrol et
          for (let i = 1; i < uniqueDates.length; i++) {
            const prevDate = new Date(uniqueDates[i-1]);
            const nextDay = new Date(prevDate);
            nextDay.setDate(nextDay.getDate() + 1);
            
            const currDate = new Date(uniqueDates[i]);
            currDate.setHours(0, 0, 0, 0);
            nextDay.setHours(0, 0, 0, 0);
            
            // Eğer tarihler arasında 1 günden fazla fark varsa
            if (nextDay.getTime() !== currDate.getTime()) {
              hasNonConsecutiveDates = true;
              break;
            }
          }
        }
        
        if (hasNonConsecutiveDates) {
          toast.warning(
            'The dates you entered are not consecutive. For non-consecutive dates, please use Advanced Planning feature.',
            { autoClose: 6000 }
          );
          return; // Form gönderimini engelle
        }
      }

      // Form verilerini dönüştür ve validate et
      const transformedData = transformTransportData({
        ...data,
        departureDate: showAdvancedPlanning && data.departureDate ? data.departureDate : null,
        returnDate: showAdvancedPlanning && data.returnDate ? data.returnDate : null,
        genset: isHRContainer ? "YES" : "NO",
        hasTransportOrder: data.hasTransportOrder
      });

      console.log('Transformed data:', transformedData);

      if (initialData?.id) {
        transformedData.id = initialData.id;
      }

      // Sadece başarılı durumda formu kapat
      const result = await onSubmit(transformedData);
      
      // İşlem başarılı ise formu kapat
      onClose();
      
    } catch (error) {
      console.error('Error submitting form:', error);
      // Toast mesajını burada göstermeye gerek yok, dışarıda gösterilecek
      // Hata durumunda form açık kalacak
    }
  };

  const inputClasses =
    "mt-1 block w-full rounded-lg border-0 py-2 px-3 bg-gray-50 text-gray-900 shadow-sm ring-1 ring-inset ring-gray-300 placeholder:text-gray-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6";
  const labelClasses = "block text-sm font-medium leading-6 text-gray-900";
  const iconClasses = "absolute left-3 top-[34px] text-gray-400 text-lg";
  const inputWithIconClasses = "pl-10 " + inputClasses;
  const groupClasses = "relative";
  const errorClasses = "mt-1 text-sm text-red-600";

  return (
    <form onSubmit={hookFormSubmit(handleSubmit)} className="space-y-6">
      <div className="bg-white p-6 rounded-lg">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Client Selection */}
          <div className={groupClasses}>
            <label className={labelClasses}>Client</label>
            <FiFileText className={iconClasses} />
            <select {...register("clientId")} className={inputWithIconClasses}>
              <option value="">Select Client</option>
              {Array.isArray(clients) &&
                clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
            </select>
            {errors.clientId && (
              <p className={errorClasses}>{errors.clientId.message}</p>
            )}
          </div>

                    {/* Transport Order Number */}
                    <div className={groupClasses}>
            <label className={labelClasses}>Transport Order Number</label>
            <FiHash className={iconClasses} />
            <input
              type="text"
              placeholder="Enter order number"
              {...register("transportOrderNumber")}
              className={inputWithIconClasses}
            />
            {errors.transportOrderNumber && (
              <p className={errorClasses}>
                {errors.transportOrderNumber.message}
              </p>
            )}
          </div>

          {/* Container Pick Up Quay */}
          <div className={groupClasses}>
            <label className={labelClasses}>
              Container Pick Up Quay
              <span className="text-gray-500 text-sm ml-1">(Optional)</span>
            </label>
            <FiTruck className={iconClasses} />
            <select
              {...register("pickUpQuayId")}
              className={inputWithIconClasses}
            >
              <option value="">No Quay Selected</option>
              {quays
                .filter(q => q.isActive)
                .map(quay => (
                  <option 
                    key={quay.id} 
                    value={quay.id}
                    className={quay.isLoRo === 'TBN' ? 'text-red-500 font-medium' : ''}
                  >
                    {quay.name}
                  </option>
                ))}
            </select>
            {errors.pickUpQuayId && (
              <p className={errorClasses}>{errors.pickUpQuayId.message}</p>
            )}
          </div>

          {/* Container Drop Off Location */}
          <div className={groupClasses}>
            <label className={labelClasses}>
              Container Drop Off Quay
              <span className="text-gray-500 text-sm ml-1">(Optional)</span>
            </label>
            <FiTruck className={iconClasses} />
            <select
              {...register("dropOffQuayId")}
              className={inputWithIconClasses}
            >
              <option value="">No Quay Selected</option>
              {quays
                .filter(q => q.isActive)
                .map(quay => (
                  <option 
                    key={quay.id} 
                    value={quay.id}
                    className={quay.isLoRo === 'TBN' ? 'text-red-500 font-medium' : ''}
                  >
                    {quay.name}
                  </option>
                ))}
            </select>
            {errors.dropOffQuayId && (
              <p className={errorClasses}>{errors.dropOffQuayId.message}</p>
            )}
          </div>

          {/* Booking Reference */}
          <div className={groupClasses}>
            <label className={labelClasses}>Booking Reference</label>
            <FiFileText className={iconClasses} />
            <input
              type="text"
              placeholder="Enter booking reference"
              {...register("containerBookingReference")}
              defaultValue={initialData?.bookingReference || ""}
              className={inputWithIconClasses}
            />
          </div>

          {/* Container Number */}
          <div className={groupClasses}>
            <label className={labelClasses}>Container Number</label>
            <FiBox className={iconClasses} />
            <input
              type="text"
              placeholder="Enter container number"
              {...register("containerNumber")}
              className={inputWithIconClasses}
              onChange={(e) => {
                const uppercaseValue = e.target.value.toUpperCase();
                setValue("containerNumber", uppercaseValue);
              }}
            />
            {errors.containerNumber && (
              <p className={errorClasses}>
                {errors.containerNumber.message}
              </p>
            )}
            <p className="mt-1 text-xs text-gray-500">
              Container number must be 11 characters: 4 uppercase letters followed by 7 numbers (e.g., CMAU1234567)
            </p>
          </div>

                    {/* Loading/Unloading Reference */}
                    <div className={groupClasses}>
            <label className={labelClasses}>Loading/Unloading Reference</label>
            <FiFileText className={iconClasses} />
            <input
              type="text"
              placeholder="Enter reference"
              {...register("loadingUnloadingReference")}
              className={inputWithIconClasses}
              onChange={(e) => {
                const lowercaseValue = e.target.value.toLowerCase();
                setValue("loadingUnloadingReference", lowercaseValue);
              }}
            />
            <p className="mt-1 text-xs text-gray-500">
              The loading/unloading reference must be unique. Only one transport can use a specific reference at a time.
            </p>
          </div>

          {/* Container Type */}
          <div className={groupClasses}>
            <label className={labelClasses}>Container Type</label>
            <FiTruck className={iconClasses} />
            <select
              {...register("containerType")}
              className={inputWithIconClasses}
            >
              <option value="">Select Container Type</option>
              {CONTAINER_TYPES.map((type) => (
                <option key={type.value} value={type.value}>
                  {type.label}
                </option>
              ))}
            </select>
          </div>

          {/* Genset Required */}
          <div className={groupClasses}>
            <label className={labelClasses}>Genset Required</label>
            <FiToggleRight className={iconClasses} />
            <select
              {...register("genset")}
              className={`${inputWithIconClasses} ${
                isHRContainer ? "bg-blue-50" : "bg-gray-100"
              }`}
              disabled={true}
              value={isHRContainer ? "YES" : "NO"}
            >
              <option value="NO">No</option>
              <option value="YES">Yes</option>
            </select>
            {isHRContainer && (
              <p className="mt-1 text-xs text-blue-600">
                Genset is required for HR type containers
              </p>
            )}
          </div>

          {/* ADR Transport */}
          <div className={groupClasses}>
            <label className={labelClasses}>ADR Transport</label>
            <FiAlertTriangle className={iconClasses} />
            <select
              {...register("adr")}
              className={inputWithIconClasses}
              defaultValue="NO"
            >
              <option value="NO">No</option>
              <option value="YES">Yes</option>
            </select>
          </div>

          {/* Transport Type */}
          <div className={groupClasses}>
            <label className={labelClasses}>Transport Type</label>
            <FiTruck className={iconClasses} />
            <select {...register("type")} className={inputWithIconClasses}>
              <option value="">Select Type</option>
              <option value="IMPORT">Import</option>
              <option value="EXPORT">Export</option>
              <option value="SHUNT">Shunt</option>
            </select>
            {errors.type && (
              <p className={errorClasses}>{errors.type.message}</p>
            )}
          </div>

          {/* Transport Order Received */}
          <div className={groupClasses}>
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <FiFileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">Transport Order Received</span>
              </div>
              <Switch
                checked={watch("hasTransportOrder")}
                onChange={(checked) => setValue("hasTransportOrder", checked)}
                className={`${
                  watch("hasTransportOrder") ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
              >
                <span
                  className={`${
                    watch("hasTransportOrder") ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </div>
          </div>

          {/* T1 Required */}
          <div className={groupClasses}>
            <div className="flex items-center justify-between px-1">
              <div className="flex items-center gap-2">
                <FiFileText className="w-4 h-4 text-gray-500" />
                <span className="text-sm font-medium text-gray-700">T1 Required</span>
              </div>
              <Switch
                checked={watch("requiresT1")}
                onChange={(checked) => {
                  setValue("requiresT1", checked);
                  // T1 gerekli değilse, T1 received da false olmalı
                  if (!checked) {
                    setValue("t1Received", false);
                  }
                }}
                className={`${
                  watch("requiresT1") ? 'bg-blue-600' : 'bg-gray-200'
                } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
              >
                <span
                  className={`${
                    watch("requiresT1") ? 'translate-x-6' : 'translate-x-1'
                  } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                />
              </Switch>
            </div>
          </div>

          {/* T1 Received - Only show if T1 is required */}
          {watch("requiresT1") && (
            <div className={groupClasses}>
              <div className="flex items-center justify-between px-1">
                <div className="flex items-center gap-2">
                  <FiFileText className="w-4 h-4 text-gray-500" />
                  <span className="text-sm font-medium text-gray-700">T1 Received</span>
                </div>
                <Switch
                  checked={watch("t1Received")}
                  onChange={(checked) => setValue("t1Received", checked)}
                  className={`${
                    watch("t1Received") ? 'bg-green-600' : 'bg-gray-200'
                  } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
                >
                  <span
                    className={`${
                      watch("t1Received") ? 'translate-x-6' : 'translate-x-1'
                    } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
                  />
                </Switch>
              </div>
            </div>
          )}

        </div>

        {/* Advanced Planning Toggle */}
        <div className="mt-6 border-t pt-6">
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-2">
              <FiCalendar className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">Advanced Planning</span>
            </div>
            <Switch
              checked={showAdvancedPlanning}
              onChange={(checked) => {
                setShowAdvancedPlanning(checked);
                // Advanced planning kapatıldığında departureDate ve returnDate değerlerini temizle
                if (!checked) {
                  setValue('departureDate', '');
                  setValue('returnDate', '');
                }
              }}
              className={`${
                showAdvancedPlanning ? 'bg-blue-600' : 'bg-gray-200'
              } relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none`}
            >
              <span
                className={`${
                  showAdvancedPlanning ? 'translate-x-6' : 'translate-x-1'
                } inline-block h-4 w-4 transform rounded-full bg-white transition-transform`}
              />
            </Switch>
          </div>

          {/* Advanced Planning Fields */}
          {showAdvancedPlanning && (
            <div className="mt-4 space-y-4 px-1">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className={groupClasses}>
                  <label className={labelClasses}>Departure Date</label>
                  <FiCalendar className={iconClasses} />
                  <input
                    type="date"
                    {...register('departureDate')}
                    className={inputWithIconClasses}
                  />
                  {errors.departureDate && (
                    <p className={errorClasses}>{errors.departureDate.message}</p>
                  )}
                </div>
                <div className={groupClasses}>
                  <label className={labelClasses}>Return Date</label>
                  <FiCalendar className={iconClasses} />
                  <input
                    type="date"
                    {...register('returnDate')}
                    className={inputWithIconClasses}
                  />
                  {errors.returnDate && (
                    <p className={errorClasses}>{errors.returnDate.message}</p>
                  )}
                </div>
              </div>
              {errors.root && (
                <p className="text-sm text-red-600 mt-2">{errors.root.message}</p>
              )}
            </div>
          )}
        </div>
      </div>

      <div className="mt-6 border-t pt-6 col-span-2">
        <div className="flex justify-between items-center mb-4">
          <label className="block text-sm font-medium text-gray-900">
            Loading/Unloading Points
          </label>
          <button
            type="button"
            onClick={addDestination}
            className="inline-flex items-center text-sm text-blue-600 hover:text-blue-700"
          >
            <FiPlusCircle className="w-4 h-4 mr-1" />
            Add Stop
          </button>
        </div>

        <div className="space-y-4">
          {destinations.map((dest, index) => (
            <div key={index} className="flex items-start gap-4">
              {/* Sıralama butonları */}
              <div className="flex flex-col gap-1 mt-2">
                <button
                  type="button"
                  onClick={() => moveDestination(index, index - 1)}
                  disabled={index === 0}
                  className={`p-1 rounded hover:bg-gray-100 
                    ${index === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-blue-500'}`}
                >
                  <FiChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={() => moveDestination(index, index + 1)}
                  disabled={index === destinations.length - 1}
                  className={`p-1 rounded hover:bg-gray-100 
                    ${index === destinations.length - 1 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-blue-500'}`}
                >
                  <FiChevronDown className="w-4 h-4" />
                </button>
              </div>

              {/* Mevcut form alanları */}
              <div className="flex-1 flex items-center gap-4">
                {/* Location Input */}
                <div className="flex-1 relative">
                  <div className="location-dropdown">
                    <div className="relative">
                      <input
                        type="text"
                        value={searchTerms[index] || ''}
                        onChange={(e) => handleLocationInputChange(e, index)}
                        onFocus={() => {
                          setDropdownStates(prev => ({ ...prev, [index]: true }));
                          setActiveDropdownIndex(index);
                        }}
                        className={`w-full h-10 px-3 py-2 border rounded-md ${
                          errors.destinations?.[index]?.frequentLocationId && watch("type") !== "SHUNT" ? 'border-red-500' : ''
                        }`}
                        placeholder={watch("type") === "SHUNT" ? "Search location (optional for SHUNT)..." : "Search location..."}
                      />
                      
                      {/* Clear button for SHUNT transports */}
                      {watch("type") === "SHUNT" && searchTerms[index] && (
                        <button
                          type="button"
                          onClick={() => {
                            // Clear the search term
                            setSearchTerms(prev => ({ ...prev, [index]: '' }));
                            
                            // Clear the frequentLocationId
                            const destinations = getValues('destinations');
                            const updatedDestination = {
                              ...destinations[index],
                              frequentLocationId: null
                            };
                            setValue(`destinations.${index}`, updatedDestination);
                            
                            // Close the dropdown
                            setDropdownStates(prev => ({ ...prev, [index]: false }));
                          }}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                    
                    {watch("type") === "SHUNT" && (
                      <div className="mt-1 text-xs text-gray-500">
                        Location is optional for SHUNT transports. Leave empty or select a location.
                      </div>
                    )}
                    
                    {errors.destinations?.[index]?.frequentLocationId && watch("type") !== "SHUNT" && (
                      <div className="mt-1 text-sm text-red-600">
                        Please select a valid location from the dropdown list
                      </div>
                    )}
                    
                    {dropdownStates[index] && (
                      <div className="absolute z-10 w-full mt-1 bg-white border rounded shadow-lg max-h-60 overflow-y-auto">
                        {(Array.isArray(availableLocations) ? availableLocations : [])
                          .filter(loc => 
                            !searchTerms[index] ||
                            (loc.name?.toLowerCase() || '').includes(searchTerms[index].toLowerCase()) ||
                            (loc.address?.toLowerCase() || '').includes(searchTerms[index].toLowerCase())
                          )
                          .map(location => (
                            <div
                              key={location.id}
                              className="p-2 hover:bg-gray-100 cursor-pointer"
                              onClick={() => handleLocationSelect(location, index)}
                              tabIndex={0}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                  handleLocationSelect(location, index);
                                }
                              }}
                            >
                              <div className="font-medium">{location.name}</div>
                              <div className="text-sm text-gray-600">
                                {location.city && `${location.city}, `}{getCountryCode(location.country)}
                                {location.km && ` (${location.km}km)`}
                              </div>
                            </div>
                          ))}
                      </div>
                    )}
                  </div>
                </div>

                {/* Destination Date */}
                <div className="w-40 relative">
                  <input
                    type="date"
                    {...register(`destinations.${index}.destinationDate`)}
                    className="w-full h-10 px-3 py-2 border rounded-md"
                    placeholder="Select date"
                    required
                    min="2024-01-01"
                  />
                </div>

                {/* Destination Time */}
                <div className="w-32 relative">
                  <input
                    type="time"
                    {...register(`destinations.${index}.destinationTime`)}
                    className="w-full h-10 px-3 py-2 border rounded-md"
                    placeholder="Select time"
                    pattern="[0-9]{2}:[0-9]{2}"
                  />
                </div>
              </div>

              <button
                type="button"
                onClick={() => removeDestination(index)}
                className="p-2 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-full transition-colors"
                title="Remove stop"
              >
                <FiX className="w-4 h-4" />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 text-sm font-semibold text-gray-700 bg-white border border-gray-300 rounded-lg shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 text-sm font-semibold text-white bg-blue-600 rounded-lg shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isSubmitting ? "Saving..." : "Save Transport"}
        </button>
      </div>
    </form>
  );
}
