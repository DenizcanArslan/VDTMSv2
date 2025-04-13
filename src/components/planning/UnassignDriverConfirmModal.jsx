import React from 'react';
import { Dialog } from '@headlessui/react';
import { FiAlertTriangle } from 'react-icons/fi';

const UnassignDriverConfirmModal = ({ isOpen, onClose, onConfirm }) => {
  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-md w-full bg-white rounded-lg shadow-xl p-6">
          <div className="flex items-center gap-3 mb-4">
            <FiAlertTriangle className="w-6 h-6 text-amber-500" />
            <Dialog.Title className="text-lg font-medium">Unassign from Driver</Dialog.Title>
          </div>

          <div className="space-y-4">
            <p className="text-gray-600">
              This transport is currently assigned to a driver. Moving it to another slot will:
            </p>
            
            <ul className="list-disc list-inside text-gray-600 pl-4 space-y-2">
              <li>Unassign it from the current driver</li>
              <li>Reset all ETA information</li>
              <li>Change status back to "Planned"</li>
            </ul>

            <div className="bg-amber-50 p-4 rounded-lg mt-4">
              <p className="text-amber-800 text-sm">
                Are you sure you want to continue?
              </p>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={onConfirm}
                className="px-4 py-2 text-sm font-medium text-white bg-amber-600 rounded-md hover:bg-amber-700"
              >
                Confirm
              </button>
            </div>
          </div>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
};

export default UnassignDriverConfirmModal; 