import React, { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { FiUser, FiTruck, FiAlertTriangle } from 'react-icons/fi';
import { BsSnow2 } from 'react-icons/bs';
import { FaTrailer } from 'react-icons/fa';
import { useSelector } from 'react-redux';
import { isTrailerInUseOnDate } from './TrailerUtils';

const AssignDriverModal = ({ isOpen, onClose, handleConfirm, selectedTruck, slot, transport }) => {
  const [isTrailerInUse, setIsTrailerInUse] = useState(false);
  const [conflictDates, setConflictDates] = useState([]);
  
  // Redux store'dan tüm transportları al
  const allTransports = useSelector(state => state.planning.transports);
  
  useEffect(() => {
    if (transport?.trailer && allTransports && isOpen) {
      // Transport tarihlerini al
      const transportDates = [];
      
      // Departure date
      if (transport.departureDate) {
        transportDates.push(new Date(transport.departureDate).toISOString().split('T')[0]);
      }
      
      // Return date
      if (transport.returnDate) {
        transportDates.push(new Date(transport.returnDate).toISOString().split('T')[0]);
      }
      
      // Destination dates
      if (transport.destinations && transport.destinations.length > 0) {
        transport.destinations.forEach(dest => {
          if (dest.destinationDate) {
            transportDates.push(new Date(dest.destinationDate).toISOString().split('T')[0]);
          }
        });
      }
      
      // Eğer hiç tarih yoksa bugünün tarihini kullan
      if (transportDates.length === 0) {
        transportDates.push(new Date().toISOString().split('T')[0]);
      }
      
      // Tarihler için çakışma kontrolü yap
      const conflictingDates = [];
      const hasConflict = transportDates.some(date => {
        const isInUse = isTrailerInUseOnDate(transport.trailer.id, allTransports, transport.id, date);
        if (isInUse) {
          conflictingDates.push(new Date(date).toLocaleDateString());
        }
        return isInUse;
      });
      
      setIsTrailerInUse(hasConflict);
      setConflictDates(conflictingDates);
    }
  }, [transport, allTransports, isOpen]);

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm w-full bg-white rounded-lg shadow-xl p-6">
          <Dialog.Title className="text-lg font-medium mb-4">Send Transport to Driver</Dialog.Title>

          <div className="space-y-4">
            <div className="flex items-center gap-3">
              <FiUser className="w-5 h-5 text-blue-500" />
              <div className="flex items-center gap-8">
                <span>Driver</span>
                {slot?.driver && (
                  <span className="text-sm text-gray-600">
                    {slot.driver.nickName}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FiTruck className="w-5 h-5 text-blue-500" />
              <div className="flex items-center gap-8">
                <span>Truck</span>
                {selectedTruck && (
                  <span className="text-sm text-gray-600">
                    {selectedTruck.nickName || selectedTruck.licensePlate}
                    {selectedTruck.genset === "YES" && (
                      <BsSnow2 className="inline-block ml-2 text-blue-500" />
                    )}
                  </span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3">
              <FaTrailer className="w-5 h-5 text-blue-500" />
              <div className="flex items-center gap-8">
                <span>Trailer</span>
                {transport?.trailer && (
                  <span className={`text-sm ${isTrailerInUse ? "text-red-600" : "text-gray-600"}`}>
                    {transport.trailer.nickName || transport.trailer.licensePlate}
                    {transport.trailer.genset === "YES" && (
                      <BsSnow2 className="inline-block ml-2 text-blue-500" />
                    )}
                    {isTrailerInUse && (
                      <span className="ml-2 text-xs bg-red-100 text-red-500 px-1 py-0.5 rounded-full">
                        In Use
                      </span>
                    )}
                  </span>
                )}
              </div>
            </div>

            {/* Trailer Çakışma Uyarısı */}
            {isTrailerInUse && (
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <div className="flex gap-2">
                  <FiAlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                  <div>
                    <p className="text-red-700 font-medium">Trailer Already In Use</p>
                    <p className="text-red-600 text-sm mt-1">
                      This trailer is already assigned to another ongoing transport on {conflictDates.join(', ')}.
                      This will cause scheduling conflicts.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {(!slot?.driver || !slot?.truck || !transport?.trailer) && (
              <div className="bg-red-50 p-4 rounded-lg mt-4">
                <p className="text-red-800">
                  {!slot?.driver && "Please assign a driver to the slot before sending transport."}
                  {!slot?.truck && "Please assign a truck to the slot before sending transport."}
                  {!transport?.trailer && "Please assign a trailer to the transport before sending to driver."}
                </p>
              </div>
            )}

            <div className="bg-amber-50 p-4 rounded-lg mt-4">
              <p className="text-amber-800">
                Are you sure you want to send this transport to the driver? This will change the transport status to "Busy".
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              className="px-4 py-2 rounded text-gray-600 hover:bg-gray-100"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className={`px-4 py-2 rounded ${isTrailerInUse || !slot?.driver || !slot?.truck || !transport?.trailer ? 
                "bg-gray-300 text-gray-500 cursor-not-allowed" : 
                "bg-orange-500 text-white hover:bg-orange-600"}`}
              disabled={isTrailerInUse || !slot?.driver || !slot?.truck || !transport?.trailer}
              onClick={handleConfirm}
            >
              Confirm
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default AssignDriverModal; 