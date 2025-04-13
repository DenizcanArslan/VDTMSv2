'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { toast } from 'react-toastify';

const AddTrailerParkingModal = ({ isOpen, onClose, onComplete, isEditing = false, initialData = null }) => {
  const [availableTrailers, setAvailableTrailers] = useState([]);
  const [cutLocations, setCutLocations] = useState([]);
  const [selectedTrailerId, setSelectedTrailerId] = useState('');
  const [selectedLocationId, setSelectedLocationId] = useState('');
  const [notes, setNotes] = useState('');
  const [loadingData, setLoadingData] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      fetchInitialData();
    }
  }, [isOpen]);

  useEffect(() => {
    if (isEditing && initialData) {
      setSelectedTrailerId(initialData.trailer?.id?.toString() || '');
      setSelectedLocationId(initialData.location?.id?.toString() || '');
      setNotes(initialData.notes || '');
    } else {
      resetForm();
    }
  }, [isEditing, initialData, isOpen]);

  const resetForm = () => {
    setSelectedTrailerId('');
    setSelectedLocationId('');
    setNotes('');
  };

  const fetchInitialData = async () => {
    setLoadingData(true);
    setError(null);
    
    // Don't reset selected values here if we're in edit mode
    if (!isEditing) {
      resetForm();
    }
    
    try {
      // If we're editing, we need all trailers, including the currently parked one
      const trailersUrl = isEditing ? '/api/trailers?includeParked=true' : '/api/trailers';
      
      const [trailersResponse, locationsResponse] = await Promise.all([
        fetch(trailersUrl),
        fetch('/api/planning/cut-locations')
      ]);

      if (!trailersResponse.ok) {
        throw new Error(`Failed to fetch trailers: ${trailersResponse.statusText}`);
      }
      if (!locationsResponse.ok) {
        throw new Error(`Failed to fetch locations: ${locationsResponse.statusText}`);
      }

      const trailersData = await trailersResponse.json();
      const locationsData = await locationsResponse.json();

      setAvailableTrailers(trailersData);
      setCutLocations(locationsData);

    } catch (e) {
      console.error("Error fetching data for add parking modal:", e);
      setError('Failed to load necessary data. Please try again.');
      toast.error('Failed to load data.');
    } finally {
      setLoadingData(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedTrailerId || !selectedLocationId) {
      toast.error('Please select both a trailer and a location.');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const url = isEditing 
        ? `/api/planning/trailer-parking/${selectedTrailerId}`
        : '/api/planning/trailer-parking';
      
      const method = isEditing ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          trailerId: parseInt(selectedTrailerId, 10),
          locationId: parseInt(selectedLocationId, 10),
          notes
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }

      toast.success(isEditing ? 'Trailer parking updated successfully!' : 'Trailer parked successfully!');
      onComplete();
      handleClose();

    } catch (e) {
      console.error("Failed to park trailer:", e);
      setError(`Error: ${e.message}`);
      toast.error(`Failed to ${isEditing ? 'update' : 'park'} trailer: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };
  
  const handleClose = () => {
      resetForm();
      setError(null);
      setAvailableTrailers([]);
      setCutLocations([]);
      setLoadingData(true);
      onClose();
  };

  const selectClassName = "mt-1 block w-full pl-3 pr-10 py-2 text-base border-2 border-gray-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md disabled:opacity-50 disabled:bg-gray-100 cursor-pointer hover:border-indigo-300 shadow-sm appearance-none bg-white";
  
  const selectWrapClassName = "relative";
  const selectArrowClassName = "absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none text-gray-500";

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={isEditing ? "Edit Trailer Parking Location" : "Add Trailer Parking Location"}>
      <form onSubmit={handleSubmit} className="space-y-4">
        {loadingData ? (
          <div className="flex justify-center items-center py-8 min-h-[150px]">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          </div>
        ) : error && !availableTrailers.length && !cutLocations.length ? (
            <div className="text-center py-8 text-red-600 bg-red-50 p-4 rounded-md">
              <p>{error}</p>
              <button 
                type="button"
                onClick={fetchInitialData}
                className="mt-2 px-3 py-1 text-sm border border-red-600 rounded-md hover:bg-red-100"
              >
                Retry Loading Data
              </button>
           </div>
        ) : (
          <>
            <div>
              <label htmlFor="trailerSelect" className="block text-sm font-medium text-gray-700 mb-1">
                Available Trailer
              </label>
              <div className={selectWrapClassName}>
                <select
                  id="trailerSelect"
                  value={selectedTrailerId}
                  onChange={(e) => setSelectedTrailerId(e.target.value)}
                  className={selectClassName}
                  disabled={submitting || availableTrailers.length === 0 || isEditing}
                  required
                >
                  <option value="" disabled>Select a trailer...</option>
                  {availableTrailers.map((trailer) => (
                    <option 
                      key={trailer.id} 
                      value={trailer.id}
                      disabled={!isEditing && trailer.transportStatus === 'ONGOING'}
                    >
                      {trailer.nickName} ({trailer.licensePlate}) 
                      {trailer.transportStatus === 'ONGOING' ? ' (ONGOING)' : ''}
                    </option>
                  ))}
                </select>
                <div className={selectArrowClassName}>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
                  </svg>
                </div>
              </div>
              {availableTrailers.length === 0 && !loadingData && (
                  <p className="mt-1 text-xs text-gray-500">No available trailers found.</p>
              )}
              {!isEditing && (
                <p className="mt-1 text-xs text-gray-500">
                  Trailers marked as (ONGOING) cannot be parked because they are currently in active transport.
                </p>
              )}
            </div>

            <div>
              <label htmlFor="locationSelect" className="block text-sm font-medium text-gray-700 mb-1">
                Parking Location (Cut Location)
              </label>
              <div className={selectWrapClassName}>
                <select
                  id="locationSelect"
                  value={selectedLocationId}
                  onChange={(e) => setSelectedLocationId(e.target.value)}
                  className={selectClassName}
                  disabled={submitting || cutLocations.length === 0}
                  required
                >
                  <option value="" disabled>Select a location...</option>
                  {cutLocations.map((location) => (
                    <option key={location.id} value={location.id}>
                      {location.name}
                    </option>
                  ))}
                </select>
                <div className={selectArrowClassName}>
                  <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd"></path>
                  </svg>
                </div>
              </div>
              {cutLocations.length === 0 && !loadingData && (
                  <p className="mt-1 text-xs text-gray-500">No cut locations found.</p>
              )}
            </div>
            
            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-1">
                Notes (Optional)
              </label>
              <textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="mt-1 block w-full border-2 border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm disabled:opacity-50"
                rows="3"
                placeholder="Add any additional notes about this parking record..."
                disabled={submitting}
              ></textarea>
            </div>
            
            {error && (availableTrailers.length > 0 || cutLocations.length > 0) && (
              <p className="text-sm text-red-600 mt-2">{error}</p>
            )}

            <div className="flex justify-end gap-2 pt-4 border-t border-gray-200 mt-6">
              <button
                type="button"
                onClick={handleClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                disabled={loadingData || submitting || !selectedTrailerId || !selectedLocationId}
              >
                {submitting ? (isEditing ? 'Updating...' : 'Parking...') : (isEditing ? 'Update Parking' : 'Add Parking')}
              </button>
            </div>
          </>
        )}
      </form>
    </Modal>
  );
};

export default AddTrailerParkingModal; 