import React from 'react';
import { FiClock, FiX } from 'react-icons/fi';

/**
 * Slot sıralama işlemi için onay modalı
 * 
 * @param {Object} props
 * @param {boolean} props.isOpen Modal açık mı?
 * @param {Function} props.onClose Modalı kapatma fonksiyonu
 * @param {Function} props.onConfirm Onaylama fonksiyonu
 * @param {boolean} props.isLoading Yükleniyor durumu
 */
const SortConfirmModal = ({ isOpen, onClose, onConfirm, isLoading }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* Overlay */}
      <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose}></div>
      
      {/* Modal içeriği */}
      <div className="bg-white rounded-lg overflow-hidden shadow-xl transform transition-all max-w-lg w-full mx-auto z-10">
        <div className="relative">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
            <div className="sm:flex sm:items-start">
              <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                <FiClock className="h-6 w-6 text-green-600" aria-hidden="true" />
              </div>
              <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                <h3 className="text-lg leading-6 font-medium text-gray-900">
                  Sort Slots by Destination Time
                </h3>
                <div className="mt-2">
                  <p className="text-sm text-gray-500">
                    Are you sure you want to sort slots by first destination time? This will reorder all slots in this day.
                  </p>
                </div>
              </div>
            </div>
          </div>
          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              className={`w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm ${isLoading ? 'opacity-75 cursor-not-allowed' : ''}`}
              onClick={onConfirm}
              disabled={isLoading}
            >
              {isLoading ? (
                <>
                  <FiClock className="animate-spin -ml-1 mr-2 h-4 w-4" />
                  Sorting...
                </>
              ) : (
                'Sort Now'
              )}
            </button>
            <button
              type="button"
              className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              onClick={onClose}
              disabled={isLoading}
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SortConfirmModal; 