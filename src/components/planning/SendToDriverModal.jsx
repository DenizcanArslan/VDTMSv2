import { Dialog } from '@headlessui/react';
import { FiTruck, FiUser } from 'react-icons/fi';

export default function SendToDriverModal({ isOpen, onClose, onConfirm, transport }) {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-sm w-full bg-white rounded-lg shadow-xl p-6">
          <Dialog.Title className="text-lg font-medium text-gray-900 mb-4">
            Send Transport to Driver
          </Dialog.Title>

          <div className="space-y-4">
            {/* Driver Info */}
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <FiUser className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Driver</h3>
                <p className="text-sm text-gray-500">
                  {transport.planningSlot?.driver?.name}
                </p>
              </div>
            </div>

            {/* Truck Info */}
            <div className="flex items-start space-x-3">
              <div className="flex-shrink-0">
                <FiTruck className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-900">Truck</h3>
                <p className="text-sm text-gray-500">
                  {transport.planningSlot?.truck?.licensePlate}
                </p>
              </div>
            </div>

            <div className="mt-6 bg-yellow-50 p-4 rounded-md">
              <p className="text-sm text-yellow-700">
                Are you sure you want to send this transport to the driver? 
                This will change the transport status to "Ongoing".
              </p>
            </div>
          </div>

          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={onConfirm}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed"
            >
              Confirm
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 