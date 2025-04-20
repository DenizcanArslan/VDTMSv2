'use client';

import { useState, useEffect, useRef } from 'react';
import { format, parseISO } from 'date-fns';
import { FiScissors, FiFilter, FiCalendar, FiRefreshCw, FiArrowLeft, FiInfo, FiMapPin, FiTruck, FiPackage, FiPlus, FiEdit2, FiTrash2, FiCheck, FiX, FiEye, FiAlertTriangle, FiThermometer, FiZap } from 'react-icons/fi';
import { MdOutlineAcUnit, MdOutlineDangerous } from 'react-icons/md';
import { toast } from 'react-toastify';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function CutTransportsPage() {
  const [cutTransports, setCutTransports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [clients, setClients] = useState([]);
  const [locations, setLocations] = useState([]);
  const [trucks, setTrucks] = useState([]);
  const [trailers, setTrailers] = useState([]);
  const [filters, setFilters] = useState({
    date: '',
    clientId: '',
    cutType: '',
    locationId: '',
    showRestored: false,
    search: '',
  });
  const [showLocationsModal, setShowLocationsModal] = useState(false);
  const [newLocation, setNewLocation] = useState({ name: '', isDefault: false });
  const [editingLocation, setEditingLocation] = useState(null);
  const [isAdding, setIsAdding] = useState(false);
  const [showTransportModal, setShowTransportModal] = useState(false);
  const [selectedTransport, setSelectedTransport] = useState(null);
  const [showTransportDetailModal, setShowTransportDetailModal] = useState(false);
  const [planningDate, setPlanningDate] = useState('');
  const [selectedTruck, setSelectedTruck] = useState('');
  const [selectedTrailer, setSelectedTrailer] = useState('');
  const [restoreNotes, setRestoreNotes] = useState('');
  const [showDeleteConfirmModal, setShowDeleteConfirmModal] = useState(false);
  const [transportToDelete, setTransportToDelete] = useState(null);
  
  const router = useRouter();

  // Arama için debounce için kullanılacak bir zamanlayıcı referansı ekle
  const searchTimerRef = useRef(null);
  // Son API çağrısından gelen veriler
  const lastApiDataRef = useRef([]);
  // Arama yapılıyor mu?
  const [isSearching, setIsSearching] = useState(false);

  const handleTransportClick = (transport) => {
    setSelectedTransport(transport);
    setShowTransportDetailModal(true);
  };

  useEffect(() => {
    fetchCutTransports();
    fetchClients();
    fetchLocations();
    fetchTrucks();
    fetchTrailers();
  }, []);  // eslint-disable-line react-hooks/exhaustive-deps

  const fetchCutTransports = async (skipLoading = false) => {
    if (!skipLoading) {
      setLoading(true);
    }
    try {
      // Filtreleri URL parametrelerine dönüştür
      const queryParams = new URLSearchParams();
      if (filters.date) queryParams.append('date', filters.date);
      if (filters.clientId) queryParams.append('clientId', filters.clientId);
      if (filters.cutType) queryParams.append('cutType', filters.cutType);
      if (filters.locationId) queryParams.append('locationId', filters.locationId);
      queryParams.append('showRestored', filters.showRestored);

      const response = await fetch(`/api/planning/transports/cut?${queryParams.toString()}`);
      if (!response.ok) {
        throw new Error('Failed to fetch cut transports');
      }
      const data = await response.json();
      
      // API verilerini referansta saklayalım
      lastApiDataRef.current = data;
      
      // Her zaman client-side filtreleme yapacağız
      let filteredData = data;
      if (filters.search) {
        const searchLower = filters.search.toLowerCase();
        filteredData = data.filter(transport => 
          (transport.transportOrderNumber?.toLowerCase() || '').includes(searchLower) ||
          (transport.containerNumber?.toLowerCase() || '').includes(searchLower) ||
          (transport.client?.name?.toLowerCase() || '').includes(searchLower) ||
          (transport.bookingReference?.toLowerCase() || '').includes(searchLower) ||
          (transport.loadingReference?.toLowerCase() || '').includes(searchLower) ||
          (transport.cutInfo?.location?.name?.toLowerCase() || '').includes(searchLower) ||
          (transport.cutInfo?.customLocation?.toLowerCase() || '').includes(searchLower) ||
          (transport.cutInfo?.notes?.toLowerCase() || '').includes(searchLower)
        );
      }
      
      // Transportları sırala
      const sortedTransports = filteredData.sort((a, b) => {
        // Restore edilenleri sıralama mantığı
        if (a.isRestored !== b.isRestored) {
          return a.isRestored ? 1 : -1;
        }
        // Sonra cut date'e göre sırala (yeniden eskiye)
        return new Date(b.cutInfo.cutStartDate) - new Date(a.cutInfo.cutStartDate);
      });

      console.log('Cut Transports Data:', sortedTransports);
      setCutTransports(sortedTransports);
    } catch (error) {
      console.error('Error fetching cut transports:', error);
      toast.error('Failed to load cut transports');
    } finally {
      if (!skipLoading) {
        setLoading(false);
      }
      setIsSearching(false);
    }
  };

  const fetchClients = async () => {
    try {
      const response = await fetch('/api/clients');
      if (!response.ok) {
        throw new Error('Failed to fetch clients');
      }
      const data = await response.json();
      setClients(data);
    } catch (error) {
      console.error('Error fetching clients:', error);
    }
  };

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/planning/cut-locations');
      if (!response.ok) {
        throw new Error('Failed to fetch locations');
      }
      const data = await response.json();
      setLocations(data);
    } catch (error) {
      console.error('Error fetching locations:', error);
    }
  };

  const fetchTrucks = async () => {
    try {
      const response = await fetch('/api/trucks');
      if (!response.ok) {
        throw new Error('Failed to fetch trucks');
      }
      const data = await response.json();
      setTrucks(data);
    } catch (error) {
      console.error('Error fetching trucks:', error);
      toast.error('Failed to load trucks');
    }
  };

  const fetchTrailers = async () => {
    try {
      const response = await fetch('/api/trailers');
      if (!response.ok) {
        throw new Error('Failed to fetch trailers');
      }
      const data = await response.json();
      setTrailers(data);
    } catch (error) {
      console.error('Error fetching trailers:', error);
      toast.error('Failed to load trailers');
    }
  };

  // Arama metni değiştiğinde client-side filtreleme için ayrı bir fonksiyon 
  const performClientSideSearch = () => {
    setIsSearching(true);
    
    // Mevcut API verilerini kullanarak client-side filtreleme yap
    let filteredData = lastApiDataRef.current;
    const searchLower = filters.search.toLowerCase();
    
    if (searchLower) {
      filteredData = filteredData.filter(transport => 
        (transport.transportOrderNumber?.toLowerCase() || '').includes(searchLower) ||
        (transport.containerNumber?.toLowerCase() || '').includes(searchLower) ||
        (transport.client?.name?.toLowerCase() || '').includes(searchLower) ||
        (transport.bookingReference?.toLowerCase() || '').includes(searchLower) ||
        (transport.loadingReference?.toLowerCase() || '').includes(searchLower) ||
        (transport.cutInfo?.location?.name?.toLowerCase() || '').includes(searchLower) ||
        (transport.cutInfo?.customLocation?.toLowerCase() || '').includes(searchLower) ||
        (transport.cutInfo?.notes?.toLowerCase() || '').includes(searchLower)
      );
    }
    
    // Transportları sırala
    const sortedTransports = filteredData.sort((a, b) => {
      // Restore edilenleri sıralama mantığı
      if (a.isRestored !== b.isRestored) {
        return a.isRestored ? 1 : -1;
      }
      // Sonra cut date'e göre sırala (yeniden eskiye)
      return new Date(b.cutInfo.cutStartDate) - new Date(a.cutInfo.cutStartDate);
    });
    
    setCutTransports(sortedTransports);
    setIsSearching(false);
  };

  // Filtreleme işleyicisini güncelleyelim
  const handleFilterChange = (e) => {
    const { name, value } = e.target;
    setFilters(prev => ({
      ...prev,
      [name]: value
    }));
    
    // Eğer arama alanı değiştiyse, zamanlayıcı kullanarak debounce yapıyoruz
    if (name === 'search') {
      // Önceki zamanlayıcıyı temizle
      if (searchTimerRef.current) {
        clearTimeout(searchTimerRef.current);
      }
      
      // Eğer halihazırda API verileri varsa, hemen client-side arama yapalım
      if (lastApiDataRef.current && lastApiDataRef.current.length > 0) {
        setIsSearching(true);
        searchTimerRef.current = setTimeout(() => {
          performClientSideSearch();
        }, 300); // 300ms içinde gerçek zamanlı client-side arama
      } else {
        // API verileri yoksa, daha uzun bir süre bekleyip API araması yapacağız
        setIsSearching(true);
        searchTimerRef.current = setTimeout(() => {
          fetchCutTransports(true); // true ile loading state'i değiştirmiyoruz
        }, 500); // 500ms bekleyerek pırpır etkisini azaltalım
      }
    }
  };

  const applyFilters = () => {
    fetchCutTransports();
  };

  const resetFilters = () => {
    setFilters({
      date: '',
      clientId: '',
      cutType: '',
      locationId: '',
      showRestored: false,
      search: '',
    });
    // Filtreleri sıfırladıktan sonra verileri yeniden yükle
    fetchCutTransports();
  };

  const handleRestoreTransport = async (id) => {
    if (!planningDate) {
      toast.error('Please select a date for planning');
      return;
    }
    
    try {
      setLoading(true);
      
      const response = await fetch(`/api/planning/transports/${id}/cut`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          cutEndDate: planningDate,
          notes: restoreNotes || undefined
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to restore transport');
      }

      toast.success('Transport added to planning successfully');
      fetchCutTransports(); // Refresh the list
      
      // Reset form fields
      setPlanningDate('');
      setRestoreNotes('');
    } catch (error) {
      console.error('Error restoring transport:', error);
      toast.error(error.message || 'Failed to add transport to planning');
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      return format(parseISO(dateString), 'dd/MM/yyyy');
    } catch (error) {
      return 'Invalid date';
    }
  };

  const getCutTypeLabel = (cutType) => {
    switch (cutType) {
      case 'TRAILER':
        return 'Trailer';
      case 'CONTAINER':
        return 'Container';
      case 'BOTH':
        return 'Container+Trailer';
      default:
        return cutType;
    }
  };

  // Cut Locations Modal Functions
  const handleAddLocation = async () => {
    if (!newLocation.name.trim()) {
      toast.error('Location name is required');
      return;
    }

    try {
      const response = await fetch('/api/planning/cut-locations', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newLocation),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to add location');
      }

      toast.success('Location added successfully');
      fetchLocations(); // Listeyi güncelle
      setNewLocation({ name: '', isDefault: false });
      setIsAdding(false);
    } catch (error) {
      console.error('Error adding location:', error);
      toast.error(error.message || 'Failed to add location');
    }
  };

  const handleUpdateLocation = async () => {
    if (!editingLocation.name.trim()) {
      toast.error('Location name is required');
      return;
    }

    try {
      const response = await fetch(`/api/planning/cut-locations/${editingLocation.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(editingLocation),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to update location');
      }

      toast.success('Location updated successfully');
      fetchLocations(); // Listeyi güncelle
      setEditingLocation(null);
    } catch (error) {
      console.error('Error updating location:', error);
      toast.error(error.message || 'Failed to update location');
    }
  };

  const handleDeleteLocation = async (id) => {
    if (!confirm('Are you sure you want to delete this location?')) {
      return;
    }

    try {
      const response = await fetch(`/api/planning/cut-locations/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete location');
      }

      toast.success('Location deleted successfully');
      fetchLocations(); // Listeyi güncelle
    } catch (error) {
      console.error('Error deleting location:', error);
      toast.error(error.message || 'Failed to delete location');
    }
  };

  const handleDeleteTransport = async (id) => {
    try {
      setLoading(true);
      
      const response = await fetch(`/api/planning/transports/${id}/cut`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to delete transport');
      }

      toast.success('Transport deleted successfully');
      fetchCutTransports(); // Refresh the list
      setShowDeleteConfirmModal(false);
      setTransportToDelete(null);
    } catch (error) {
      console.error('Error deleting transport:', error);
      toast.error(error.message || 'Failed to delete transport');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-2">
          <Link href="/planning" className="text-gray-600 hover:text-gray-800">
            <FiArrowLeft className="w-4 h-4" />
          </Link>
          <h1 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
            <FiScissors className="w-4 h-4 text-red-500" />
            Cut Transports
          </h1>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowLocationsModal(true)}
            className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-white bg-indigo-600 rounded hover:bg-indigo-700"
          >
            <FiMapPin className="w-3 h-3" />
            Manage Locations
          </button>
          <button
            onClick={fetchCutTransports}
            className="flex items-center gap-1 px-2 py-1.5 text-[11px] font-medium text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
          >
            <FiRefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>

      {/* Filtreler */}
      <div className="bg-white rounded-lg shadow-md p-3 mb-4">
        <div className="flex items-center gap-2 mb-3">
          <FiFilter className="w-3 h-3 text-gray-500" />
          <h2 className="text-[11px] font-medium text-gray-700">Filters</h2>
        </div>
        
        {/* Add search field */}
        <div className="mb-3">
          <div className="relative">
            <input
              type="text"
              name="search"
              value={filters.search}
              onChange={handleFilterChange}
              placeholder="Search transports, containers, clients..."
              className="w-full px-2 py-1.5 pl-8 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-[11px]"
            />
            <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              <FiCalendar className="inline mr-1 w-3 h-3" />
              Date
            </label>
            <input
              type="date"
              name="date"
              value={filters.date}
              onChange={handleFilterChange}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-[11px]"
            />
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Client
            </label>
            <select
              name="clientId"
              value={filters.clientId}
              onChange={handleFilterChange}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-[11px]"
            >
              <option value="">All Clients</option>
              {clients.map(client => (
                <option key={client.id} value={client.id}>
                  {client.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              Cut Type
            </label>
            <select
              name="cutType"
              value={filters.cutType}
              onChange={handleFilterChange}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-[11px]"
            >
              <option value="">All Types</option>
              <option value="TRAILER">Trailer</option>
              <option value="CONTAINER">Container</option>
              <option value="BOTH">Container+Trailer</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] font-medium text-gray-700 mb-1">
              <FiMapPin className="inline mr-1 w-3 h-3" />
              Location
            </label>
            <select
              name="locationId"
              value={filters.locationId}
              onChange={handleFilterChange}
              className="w-full px-2 py-1.5 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 text-[11px]"
            >
              <option value="">All Locations</option>
              {locations.map(location => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mt-3 gap-3">
          <div className="flex items-center gap-4">
            <label className="flex items-center gap-1.5 text-[11px] text-gray-600">
              <input
                type="checkbox"
                checked={filters.showRestored}
                onChange={(e) => setFilters(prev => ({ ...prev, showRestored: e.target.checked }))}
                className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 h-3 w-3"
              />
              Show Restored Transports
            </label>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={resetFilters}
              className="px-2 py-1.5 text-[11px] text-gray-600 hover:text-gray-800"
            >
              Reset
            </button>
            <button
              onClick={applyFilters}
              className="px-2 py-1.5 text-[11px] text-white bg-indigo-600 rounded hover:bg-indigo-700 transition-colors"
            >
              Apply Filters
            </button>
          </div>
        </div>
      </div>

      {/* Transport Listesi */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {loading && !isSearching ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading cut transports...</p>
          </div>
        ) : cutTransports.length === 0 ? (
          <div className="p-8 text-center">
            <FiInfo className="w-12 h-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No cut transports found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            {isSearching && (
              <div className="px-4 py-2 bg-blue-50 flex items-center justify-center">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                <p className="text-xs text-blue-600">Filtering results...</p>
              </div>
            )}
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Transport
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Client
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Cut Date
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Cut End Date
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Cut Type
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Trailer
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Location
                  </th>
                  <th scope="col" className="px-2 py-2 text-left text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Notes
                  </th>
                  <th scope="col" className="px-2 py-2 text-right text-[10px] font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {cutTransports.map((transport) => (
                  <tr 
                    key={transport.id} 
                    className={`hover:bg-blue-100 cursor-pointer ${transport.isRestored ? 'bg-green-50' : ''}`}
                    onClick={() => handleTransportClick(transport)}
                  >
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="flex items-center gap-1">
                        {transport.type === 'IMPORT' ? (
                          <FiPackage className="flex-shrink-0 h-4 w-4 text-blue-500" />
                        ) : transport.type === 'EXPORT' ? (
                          <FiPackage className="flex-shrink-0 h-4 w-4 text-green-500" />
                        ) : (
                          <FiTruck className="flex-shrink-0 h-4 w-4 text-gray-500" />
                        )}
                        <div>
                          <div className="text-[11px] font-medium text-gray-900">
                            {transport.transportOrderNumber}
                          </div>
                          {transport.isRestored && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-green-100 text-green-800">
                              Replanned
                            </span>
                          )}
                          {transport.containerNumber && (
                            <div className="text-[10px] text-gray-500">
                              {transport.containerNumber}
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="text-[11px] text-gray-900">{transport.client?.name}</div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="text-[11px] text-gray-900">{formatDate(transport.cutInfo?.cutStartDate)}</div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="text-[11px] text-gray-900">
                        {transport.isCut && !transport.isRestored ? 
                          'Not restored yet' : 
                          formatDate(transport.cutInfo?.cutEndDate)
                        }
                      </div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {transport.cutInfo?.cutType ? (
                        <span className={`px-1.5 inline-flex text-[10px] leading-4 font-semibold rounded-full 
                          ${transport.cutInfo?.cutType === 'TRAILER' ? 'bg-yellow-100 text-yellow-800' : 
                            transport.cutInfo?.cutType === 'CONTAINER' ? 'bg-blue-100 text-blue-800' : 
                            'bg-purple-100 text-purple-800'}`}>
                          {getCutTypeLabel(transport.cutInfo?.cutType)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      {(transport.cutInfo?.cutType === 'TRAILER' || transport.cutInfo?.cutType === 'BOTH') && transport.trailer ? (
                        <span className="text-[11px] text-gray-900">{transport.trailer.nickName}</span>
                      ) : (
                        <span className="text-[11px] text-gray-500">-</span>
                      )}
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap">
                      <div className="text-[11px] text-gray-900">
                        {transport.cutInfo?.location?.name || transport.cutInfo?.customLocation || '-'}
                      </div>
                    </td>
                    <td className="px-2 py-2">
                      <div className="text-[11px] text-gray-900 max-w-[200px]">
                        {transport.cutInfo?.notes || '-'}
                      </div>
                    </td>
                    <td className="px-2 py-2 whitespace-nowrap text-right">
                      {transport.isCut && !transport.isRestored ? (
                        <div className="flex justify-end gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTransport(transport);
                              setShowTransportModal(true);
                            }}
                            className="text-[10px] text-indigo-600 hover:text-indigo-900 bg-indigo-50 px-1.5 py-0.5 rounded"
                          >
                            Add to Planning
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setSelectedTransport(transport);
                              setShowTransportDetailModal(true);
                            }}
                            className="text-[10px] text-gray-600 hover:text-gray-900 bg-gray-50 px-1.5 py-0.5 rounded"
                          >
                            View
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setTransportToDelete(transport);
                              setShowDeleteConfirmModal(true);
                            }}
                            className="text-[10px] text-red-600 hover:text-red-900 bg-red-50 px-1.5 py-0.5 rounded"
                          >
                            Delete
                          </button>
                        </div>
                      ) : (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTransport(transport);
                            setShowTransportDetailModal(true);
                          }}
                          className="text-[10px] text-gray-600 hover:text-gray-900 bg-gray-50 px-1.5 py-0.5 rounded"
                        >
                          View
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Cut Locations Modal */}
      {showLocationsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FiMapPin className="text-indigo-600" />
                Manage Cut Locations
              </h2>
              <button
                onClick={() => setShowLocationsModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="flex justify-between items-center mb-4">
              <button
                onClick={() => {
                  setIsAdding(true);
                  setNewLocation({ name: '', isDefault: false });
                }}
                className="flex items-center gap-1 px-3 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700 text-sm"
                disabled={isAdding}
              >
                <FiPlus className="w-4 h-4" />
                Add Location
              </button>
              <button
                onClick={fetchLocations}
                className="flex items-center gap-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded-md text-sm"
              >
                <FiRefreshCw className="w-4 h-4" />
                Refresh
              </button>
            </div>

            {isAdding && (
              <div className="bg-gray-50 p-4 rounded-md mb-4">
                <h3 className="text-md font-medium mb-3">Add New Location</h3>
                <div className="flex flex-col gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Location Name
                    </label>
                    <input
                      type="text"
                      value={newLocation.name}
                      onChange={(e) => setNewLocation({ ...newLocation, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                      placeholder="Enter location name"
                    />
                  </div>
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="isDefault"
                      checked={newLocation.isDefault}
                      onChange={(e) => setNewLocation({ ...newLocation, isDefault: e.target.checked })}
                      className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                    />
                    <label htmlFor="isDefault" className="ml-2 block text-sm text-gray-700">
                      Set as default location
                    </label>
                  </div>
                  <div className="flex justify-end gap-2 mt-2">
                    <button
                      onClick={() => setIsAdding(false)}
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm text-gray-700 hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                    <button
                      onClick={handleAddLocation}
                      className="px-3 py-2 bg-indigo-600 text-white rounded-md text-sm hover:bg-indigo-700"
                    >
                      Add Location
                    </button>
                  </div>
                </div>
              </div>
            )}

            {loading ? (
              <div className="p-8 text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
                <p className="mt-4 text-gray-600">Loading locations...</p>
              </div>
            ) : locations.length === 0 ? (
              <div className="p-8 text-center">
                <FiInfo className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No locations found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location Name
                      </th>
                      <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Default
                      </th>
                      <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {locations.map((location) => (
                      <tr key={location.id} className="hover:bg-gray-50">
                        {editingLocation && editingLocation.id === location.id ? (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="text"
                                value={editingLocation.name}
                                onChange={(e) => setEditingLocation({ ...editingLocation, name: e.target.value })}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <input
                                type="checkbox"
                                checked={editingLocation.isDefault}
                                onChange={(e) => setEditingLocation({ ...editingLocation, isDefault: e.target.checked })}
                                className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                              />
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => setEditingLocation(null)}
                                className="text-gray-600 hover:text-gray-900 mr-3"
                              >
                                <FiX className="w-5 h-5" />
                              </button>
                              <button
                                onClick={handleUpdateLocation}
                                className="text-green-600 hover:text-green-900"
                              >
                                <FiCheck className="w-5 h-5" />
                              </button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-6 py-4 whitespace-nowrap">
                              <div className="text-sm font-medium text-gray-900">{location.name}</div>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap">
                              {location.isDefault ? (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">
                                  Yes
                                </span>
                              ) : (
                                <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800">
                                  No
                                </span>
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                              <button
                                onClick={() => setEditingLocation(location)}
                                className="text-indigo-600 hover:text-indigo-900 mr-3"
                              >
                                <FiEdit2 className="w-5 h-5" />
                              </button>
                              <button
                                onClick={() => handleDeleteLocation(location.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <FiTrash2 className="w-5 h-5" />
                              </button>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowLocationsModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Transport Detail Modal */}
      {showTransportDetailModal && selectedTransport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FiTruck className="text-indigo-600" />
                Transport Details
              </h2>
              <button
                onClick={() => setShowTransportDetailModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-md font-medium mb-3 text-gray-700">Transport Information</h3>
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-gray-500">Order Number:</span>
                    <span className="ml-2 text-sm font-medium">{selectedTransport.transportOrderNumber}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Client:</span>
                    <span className="ml-2 text-sm font-medium">{selectedTransport.client?.name}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Type:</span>
                    <span className="ml-2 text-sm font-medium">{selectedTransport.type}</span>
                  </div>
                  {(selectedTransport.cutInfo?.cutType === 'CONTAINER' || selectedTransport.cutInfo?.cutType === 'BOTH') && selectedTransport.containerNumber && (
                    <>
                      <div>
                        <span className="text-sm text-gray-500">Container:</span>
                        <span className="ml-2 text-sm font-medium">{selectedTransport.containerNumber}</span>
                      </div>
                      {selectedTransport.containerType && (
                        <div>
                          <span className="text-sm text-gray-500">Container Type:</span>
                          <span className="ml-2 text-sm font-medium">{selectedTransport.containerType}</span>
                        </div>
                      )}
                      <div>
                        <span className="text-sm text-gray-500">Genset:</span>
                        <span className="ml-2 text-sm font-medium">
                          {selectedTransport.genset}
                          {selectedTransport.genset === 'YES' && (
                            <MdOutlineAcUnit className="inline-block ml-1 text-blue-500" />
                          )}
                        </span>
                      </div>
                      <div>
                        <span className="text-sm text-gray-500">ADR:</span>
                        <span className="ml-2 text-sm font-medium">
                          {selectedTransport.adr}
                          {selectedTransport.adr === 'YES' && (
                            <MdOutlineDangerous className="inline-block ml-1 text-red-500" />
                          )}
                        </span>
                      </div>
                    </>
                  )}
                  {(selectedTransport.cutInfo?.cutType === 'TRAILER' || selectedTransport.cutInfo?.cutType === 'BOTH') && selectedTransport.trailer && (
                    <div>
                      <span className="text-sm text-gray-500">Trailer:</span>
                      <span className="ml-2 text-sm font-medium">{selectedTransport.trailer.nickName}</span>
                    </div>
                  )}
                  {selectedTransport.bookingReference && (
                    <div>
                      <span className="text-sm text-gray-500">Booking Reference:</span>
                      <span className="ml-2 text-sm font-medium">{selectedTransport.bookingReference}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-gray-50 p-4 rounded-md">
                <h3 className="text-md font-medium mb-3 text-gray-700">Cut Information</h3>
                <div className="space-y-4">
                  <div>
                    <span className="text-sm text-gray-500">Cut Type:</span>
                    <span className="ml-2 text-sm font-medium">{getCutTypeLabel(selectedTransport.cutInfo?.cutType)}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Cut Date:</span>
                    <span className="ml-2 text-sm font-medium">{formatDate(selectedTransport.cutInfo?.cutStartDate)}</span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Cut End Date:</span>
                    <span className="ml-2 text-sm font-medium">
                      {selectedTransport.isRestored ? formatDate(selectedTransport.cutInfo?.cutEndDate) : 'Not restored yet'}
                    </span>
                  </div>
                  <div>
                    <span className="text-sm text-gray-500">Location:</span>
                    <span className="ml-2 text-sm font-medium">
                      {selectedTransport.cutInfo?.location?.name || selectedTransport.cutInfo?.customLocation || '-'}
                    </span>
                  </div>
                  {selectedTransport.cutInfo?.notes && (
                    <div>
                      <span className="text-sm text-gray-500 block mb-1">Cut Notes:</span>
                      <p className="mt-1 text-sm bg-gray-100 p-2 rounded">{selectedTransport.cutInfo?.notes}</p>
                    </div>
                  )}
                  {selectedTransport.cutInfo?.restoreNotes && (
                    <div>
                      <span className="text-sm text-gray-500 block mb-1">Restore Notes:</span>
                      <p className="mt-1 text-sm bg-gray-100 p-2 rounded">{selectedTransport.cutInfo?.restoreNotes}</p>
                    </div>
                  )}
                </div>
              </div>

              {selectedTransport.destinations && selectedTransport.destinations.length > 0 && (
                <div className="bg-gray-50 p-4 rounded-md md:col-span-2">
                  <h3 className="text-md font-medium mb-3 text-gray-700">Destinations</h3>
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-100">
                        <tr>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order</th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                          <th scope="col" className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedTransport.destinations.map((dest) => (
                          <tr key={dest.id}>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">{dest.order}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">{dest.frequentLocation?.name || '-'}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">{formatDate(dest.destinationDate)}</td>
                            <td className="px-4 py-2 whitespace-nowrap text-sm">{dest.destinationTime || '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>

            <div className="flex justify-end mt-6">
              <button
                onClick={() => setShowTransportDetailModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add to Planning Modal */}
      {showTransportModal && selectedTransport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-3xl max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-xl font-semibold flex items-center gap-2">
                <FiTruck className="text-indigo-600" />
                Add Transport to Planning
              </h2>
              <button
                onClick={() => setShowTransportModal(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                <FiX className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-gray-50 p-4 rounded-md mb-4">
              <h3 className="text-md font-medium mb-3 text-gray-700">Transport Information</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <span className="text-sm text-gray-500">Order Number:</span>
                  <span className="ml-2 text-sm font-medium">{selectedTransport.transportOrderNumber}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Client:</span>
                  <span className="ml-2 text-sm font-medium">{selectedTransport.client?.name}</span>
                </div>
                <div>
                  <span className="text-sm text-gray-500">Cut Type:</span>
                  <span className="ml-2 text-sm font-medium">{getCutTypeLabel(selectedTransport.cutInfo?.cutType)}</span>
                </div>
                {(selectedTransport.cutInfo?.cutType === 'CONTAINER' || selectedTransport.cutInfo?.cutType === 'BOTH') && selectedTransport.containerNumber && (
                  <>
                    <div>
                      <span className="text-sm text-gray-500">Container:</span>
                      <span className="ml-2 text-sm font-medium">{selectedTransport.containerNumber}</span>
                    </div>
                    {selectedTransport.containerType && (
                      <div>
                        <span className="text-sm text-gray-500">Container Type:</span>
                        <span className="ml-2 text-sm font-medium">{selectedTransport.containerType}</span>
                      </div>
                    )}
                    <div>
                      <span className="text-sm text-gray-500">Genset:</span>
                      <span className="ml-2 text-sm font-medium">
                        {selectedTransport.genset}
                        {selectedTransport.genset === 'YES' && (
                          <MdOutlineAcUnit className="inline-block ml-1 text-blue-500" />
                        )}
                      </span>
                    </div>
                    <div>
                      <span className="text-sm text-gray-500">ADR:</span>
                      <span className="ml-2 text-sm font-medium">
                        {selectedTransport.adr}
                        {selectedTransport.adr === 'YES' && (
                          <MdOutlineDangerous className="inline-block ml-1 text-red-500" />
                        )}
                      </span>
                    </div>
                  </>
                )}
                {(selectedTransport.cutInfo?.cutType === 'TRAILER' || selectedTransport.cutInfo?.cutType === 'BOTH') && selectedTransport.trailer && (
                  <div>
                    <span className="text-sm text-gray-500">Trailer:</span>
                    <span className="ml-2 text-sm font-medium">{selectedTransport.trailer.nickName}</span>
                  </div>
                )}
                {selectedTransport.bookingReference && (
                  <div>
                    <span className="text-sm text-gray-500">Booking Reference:</span>
                    <span className="ml-2 text-sm font-medium">{selectedTransport.bookingReference}</span>
                  </div>
                )}
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Select Date for Planning
                </label>
                <input
                  type="date"
                  value={planningDate}
                  onChange={(e) => setPlanningDate(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Notes (Optional)
                </label>
                <textarea
                  value={restoreNotes}
                  onChange={(e) => setRestoreNotes(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
                  placeholder="Add any additional notes"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowTransportModal(false)}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  handleRestoreTransport(selectedTransport.id);
                  setShowTransportModal(false);
                }}
                className="px-4 py-2 bg-indigo-600 text-white rounded-md hover:bg-indigo-700"
              >
                Add to Planning
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirmModal && transportToDelete && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
            <div className="flex items-center gap-3 mb-6">
              <FiAlertTriangle className="text-red-500 w-6 h-6" />
              <h2 className="text-xl font-semibold text-gray-800">Delete Transport</h2>
            </div>
            
            <p className="mb-6 text-gray-600">
              Are you sure you want to permanently delete this transport? This action cannot be undone.
            </p>
            
            <div className="bg-gray-50 p-4 rounded-md mb-6">
              <div className="text-sm">
                <span className="font-medium">Transport: </span>
                <span>{transportToDelete.transportOrderNumber}</span>
              </div>
              {transportToDelete.containerNumber && (
                <div className="text-sm mt-1">
                  <span className="font-medium">Container: </span>
                  <span>{transportToDelete.containerNumber}</span>
                </div>
              )}
              <div className="text-sm mt-1">
                <span className="font-medium">Client: </span>
                <span>{transportToDelete.client?.name}</span>
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button
                onClick={() => {
                  setShowDeleteConfirmModal(false);
                  setTransportToDelete(null);
                }}
                className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300"
                disabled={loading}
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteTransport(transportToDelete.id)}
                className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center gap-2"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <FiTrash2 className="w-4 h-4" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 