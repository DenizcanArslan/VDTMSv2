'use client';

import { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { FiPlus, FiMapPin, FiTruck, FiTrash2, FiRefreshCw, FiEdit } from 'react-icons/fi';
import { toast } from 'react-toastify';
import AddTrailerParkingModal from './AddTrailerParkingModal';

const TrailerLocationsModal = ({ isOpen, onClose }) => {
  const [parkedTrailers, setParkedTrailers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentParking, setCurrentParking] = useState(null);

  const fetchParkedTrailers = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/planning/trailer-parking');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP error! status: ${response.status}`);
      }
      const data = await response.json();
      setParkedTrailers(data);
    } catch (e) {
      console.error("Failed to fetch parked trailers:", e);
      setError(`Failed to load parked trailers: ${e.message}. Please try again.`);
      toast.error(`Failed to load parked trailers: ${e.message}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchParkedTrailers();
    }
  }, [isOpen]);

  const handleDeleteParking = async (trailerId) => {
    const originalParkedTrailers = [...parkedTrailers];
    setParkedTrailers(prev => prev.filter(p => p.trailer.id !== trailerId));

    try {
      const response = await fetch(`/api/planning/trailer-parking/${trailerId}`, {
        method: 'DELETE',
      });
      
      const result = await response.json();

      if (!response.ok) {
        setParkedTrailers(originalParkedTrailers);
        throw new Error(result.message || `HTTP error! status: ${response.status}`);
      }
      toast.success(result.message || 'Trailer parking record deleted successfully.');
    } catch (e) {
      console.error(`Failed to delete parking record for trailer ${trailerId}:`, e);
      toast.error(`Failed to delete parking record: ${e.message}`);
      setParkedTrailers(originalParkedTrailers);
    }
  };

  const handleEditParking = (parking) => {
    setCurrentParking(parking);
    setShowEditModal(true);
  };

  const handleEditComplete = () => {
    setShowEditModal(false);
    setCurrentParking(null);
    fetchParkedTrailers();
  };

  return (
    <>
      <Modal isOpen={isOpen} onClose={onClose} title="Trailer Locations">
        <div className="space-y-4 min-h-[300px]">
          <div className="flex justify-between items-center">
            <h3 className="text-lg font-medium">Parked Trailers</h3>
            <div className="flex items-center space-x-2">
              <button
                onClick={fetchParkedTrailers} 
                className="p-1.5 text-gray-500 hover:text-blue-600 rounded-full hover:bg-gray-100"
                title="Refresh List"
                disabled={loading}
              >
                <FiRefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 flex items-center gap-1"
                disabled={loading}
              >
                <FiPlus className="w-4 h-4" />
                Add Parking
              </button>
            </div>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            </div>
          ) : error ? (
             <div className="text-center py-8 text-red-600 bg-red-50 p-4 rounded-md">
               <p>{error}</p>
               <button 
                 onClick={fetchParkedTrailers}
                 className="mt-2 px-3 py-1 text-sm border border-red-600 rounded-md hover:bg-red-100"
               >
                 Retry
               </button>
             </div>
          ) : (
            <div className="overflow-x-auto">
              {parkedTrailers.length > 0 ? (
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Trailer
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Notes
                      </th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Parked At
                      </th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {parkedTrailers.map((parking) => (
                      <tr key={parking.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <FiTruck className="text-blue-500 w-4 h-4 mr-2 flex-shrink-0" />
                            <div>
                              <p className="text-sm font-medium text-gray-900">{parking.trailer.nickName}</p>
                              <p className="text-xs text-gray-500">{parking.trailer.licensePlate}</p>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center">
                            <FiMapPin className="text-red-500 w-4 h-4 mr-2 flex-shrink-0" />
                            <p className="text-sm text-gray-900">{parking.location.name}</p>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {parking.notes ? (
                            <div className="max-w-xs overflow-hidden" title={parking.notes}>
                              <p className="truncate">
                                {parking.notes}
                              </p>
                            </div>
                          ) : (
                            <span className="text-gray-400 italic">No notes</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-sm text-gray-500">
                          {parking.parkedAt ? new Date(parking.parkedAt).toLocaleString() : '-'}
                        </td>
                         <td className="px-4 py-3 text-right text-sm font-medium">
                           <div className="flex justify-end space-x-1">
                             <button
                               onClick={() => handleEditParking(parking)}
                               className="text-blue-600 hover:text-blue-800 p-1 rounded-full hover:bg-blue-100 disabled:opacity-50"
                               title="Edit Parking Record"
                             >
                               <FiEdit className="w-4 h-4" />
                             </button>
                             <button
                               onClick={() => handleDeleteParking(parking.trailer.id)}
                               className="text-red-600 hover:text-red-800 p-1 rounded-full hover:bg-red-100 disabled:opacity-50"
                               title="Delete Parking Record"
                             >
                               <FiTrash2 className="w-4 h-4" />
                             </button>
                           </div>
                         </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <FiMapPin className="mx-auto h-10 w-10 text-gray-400 mb-2" />
                  <p>No trailers are currently marked as parked.</p>
                  <button
                    onClick={() => setShowAddModal(true)}
                    className="mt-3 inline-flex items-center px-3 py-1.5 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                   > 
                    <FiPlus className="w-4 h-4 mr-1" />
                     Add First Parking Record
                   </button>
                </div>
              )}
            </div>
          )}
        </div>
        
        {showAddModal && (
          <AddTrailerParkingModal
            isOpen={showAddModal}
            onClose={() => setShowAddModal(false)}
            onComplete={() => {
              setShowAddModal(false);
              fetchParkedTrailers();
            }}
          />
        )}
      </Modal>

      {showEditModal && currentParking && (
        <AddTrailerParkingModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          onComplete={handleEditComplete}
          isEditing={true}
          initialData={currentParking}
        />
      )}
    </>
  );
};

export default TrailerLocationsModal; 