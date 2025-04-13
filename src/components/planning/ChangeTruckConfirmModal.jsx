import { Dialog } from '@headlessui/react';
import { FiAlertTriangle } from 'react-icons/fi';

const ChangeTruckConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  return (
    <Dialog open={isOpen} onClose={onClose}>
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md rounded bg-white p-6">
          <Dialog.Title className="text-lg font-medium flex items-center gap-2">
            <FiAlertTriangle className="text-orange-500" />
            Change Truck
          </Dialog.Title>

          <div className="mt-4">
            <p className="text-gray-600">
              This slot has ongoing or completed transports.
              Changing the truck will:
            </p>
            <ul className="mt-2 space-y-2 text-gray-600">
              <li>• Unassign all active transports from the current truck</li>
              <li>• Reset all ETA information</li>
              <li>• Change transport status back to "Planned"</li>
            </ul>
            <p className="mt-4 text-orange-600 bg-orange-50 p-2 rounded">
              Are you sure you want to continue?
            </p>
          </div>

          <div className="mt-6 flex justify-end gap-2">
            <button
              className="px-4 py-2 rounded text-gray-600 hover:bg-gray-100"
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="px-4 py-2 rounded bg-orange-500 text-white hover:bg-orange-600"
              onClick={onConfirm}
            >
              Confirm
            </button>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default ChangeTruckConfirmModal; 