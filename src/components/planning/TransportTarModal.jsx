import { useState, useEffect } from 'react';
import { Dialog } from '@headlessui/react';
import { toast } from 'react-toastify';
import { useAppDispatch } from '@/hooks/redux';
import { updateTransportsAndSlots } from '@/redux/features/planningSlice';

export default function TransportTarModal({ isOpen, onClose, transport, onUpdate, type }) {
  const dispatch = useAppDispatch();
  const [tar, setTar] = useState(type === 'pickup' ? transport.pickUpTar : transport.dropOffTar);
  const [isPositive, setIsPositive] = useState(type === 'pickup' ? transport.pickUpTarPositive : transport.dropOffTarPositive);
  const defaultTar = type === 'pickup' ? transport.pickUpQuay?.defaultTar : transport.dropOffQuay?.defaultTar;
  
  // Get color settings from quay
  const positiveColor = type === 'pickup' 
    ? transport.pickUpQuay?.tarPositiveColor || 'GREEN'
    : transport.dropOffQuay?.tarPositiveColor || 'GREEN';
    
  const negativeColor = type === 'pickup'
    ? transport.pickUpQuay?.tarNegativeColor || 'RED'
    : transport.dropOffQuay?.tarNegativeColor || 'RED';

  useEffect(() => {
    if (isOpen) {
      setTar(type === 'pickup' ? transport.pickUpTar : transport.dropOffTar);
      setIsPositive(type === 'pickup' ? transport.pickUpTarPositive : transport.dropOffTarPositive);
    }
  }, [isOpen, type, transport]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      console.log('Sending TAR update:', {
        transportId: transport.id,
        [type === 'pickup' ? 'pickUpTar' : 'dropOffTar']: tar,
        [type === 'pickup' ? 'pickUpTarPositive' : 'dropOffTarPositive']: isPositive
      });

      const res = await fetch(`/api/planning/transports/${transport.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          [type === 'pickup' ? 'pickUpTar' : 'dropOffTar']: tar || null,
          [type === 'pickup' ? 'pickUpTarPositive' : 'dropOffTarPositive']: isPositive
        }),
      });

      if (!res.ok) throw new Error('Failed to update TAR');
      
      const updatedTransport = await res.json();
      console.log('Response from API:', updatedTransport);

      onUpdate?.(updatedTransport);

      const planningRes = await fetch('/api/planning');
      if (!planningRes.ok) throw new Error('Failed to fetch planning data');
      
      const planningData = await planningRes.json();
      
      dispatch(updateTransportsAndSlots({
        transportUpdates: planningData.transports,
        slotUpdates: planningData.slots,
        type: 'update'
      }));

      onClose();
      toast.success('TAR updated successfully');
    } catch (error) {
      console.error('Error updating TAR:', error);
      toast.error(error.message);
    }
  };

  // Helper function to get color class for the preview
  const getColorClass = () => {
    if (tar === defaultTar || !tar) {
      return 'bg-red-100 text-red-700'; // Default TAR always red
    }
    
    // Instead of dynamic string interpolation, use a lookup object
    if (isPositive) {
      switch (positiveColor) {
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
      switch (negativeColor) {
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

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="bg-white rounded-lg p-6 w-full max-w-sm">
          <Dialog.Title className="text-lg font-medium mb-4">
            Update {type === 'pickup' ? 'Pick-up' : 'Drop-off'} TAR
          </Dialog.Title>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                TAR Status
              </label>
              <div className="flex space-x-4 mb-4">
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="tarStatus"
                    checked={isPositive}
                    onChange={() => setIsPositive(true)}
                    className="form-radio h-4 w-4 text-green-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">Positive</span>
                </label>
                <label className="inline-flex items-center">
                  <input
                    type="radio"
                    name="tarStatus"
                    checked={!isPositive}
                    onChange={() => setIsPositive(false)}
                    className="form-radio h-4 w-4 text-red-600"
                  />
                  <span className="ml-2 text-sm text-gray-700">Negative</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">
                TAR Number
              </label>
              <input
                type="text"
                value={tar || ''}
                onChange={(e) => setTar(e.target.value)}
                placeholder={defaultTar || 'Enter TAR number'}
                className="mt-1 block w-full px-3 py-2 text-sm
                  rounded-md border border-gray-400 
                  bg-white shadow-sm
                  focus:border-dijle-dark-blue focus:ring-1 focus:ring-dijle-dark-blue"
              />
            </div>
            
            {/* Preview of how the TAR badge will appear */}
            <div className="pt-2">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Preview
              </label>
              <div className="flex items-center">
                <span className={`text-xs font-medium px-2 py-1 rounded ${getColorClass()}`}>
                  {tar || defaultTar || 'TAR'}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                {!tar || tar === defaultTar 
                  ? "Default TAR values always appear with the negative color" 
                  : isPositive 
                    ? `Using ${positiveColor.toLowerCase()} color for positive status` 
                    : `Using ${negativeColor.toLowerCase()} color for negative status`}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-dijle-dark-blue rounded-md hover:bg-dijle-light-blue"
              >
                Save
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 