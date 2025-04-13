import { Dialog, Transition } from '@headlessui/react';
import { Fragment } from 'react';
import { FiPause, FiX } from 'react-icons/fi';
import DraggableTransport from './DraggableTransport';
import { useAppSelector } from '@/hooks/redux';

export default function OnHoldTransportsModal({ 
  isOpen, 
  onClose, 
  onEdit, 
  onDelete, 
  onActivate,
  highlightedTransports = [] 
}) {
  const { transports } = useAppSelector((state) => state.planning);
  const onHoldTransports = transports?.filter((transport) => {
    return transport.status === "ON_HOLD";
  }) || [];

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-30" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
        </Transition.Child>

        <div className="fixed inset-0 flex items-center justify-center p-4">
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0 scale-95"
            enterTo="opacity-100 scale-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100 scale-100"
            leaveTo="opacity-0 scale-95"
          >
            <Dialog.Panel className="mx-auto max-w-[95%] w-[1400px] bg-orange-50 rounded-lg shadow-xl p-6">
              <div className="flex items-center justify-between mb-4">
                <Dialog.Title className="text-lg font-medium text-orange-700 flex items-center gap-2">
                  <FiPause className="w-5 h-5" />
                  On Hold Transports
                  {highlightedTransports.length > 0 && (
                    <span className="ml-2 text-sm bg-yellow-200 text-yellow-800 px-2 py-1 rounded-md">
                      {highlightedTransports.length} transport{highlightedTransports.length !== 1 ? 's' : ''} highlighted
                    </span>
                  )}
                </Dialog.Title>
                <button
                  onClick={onClose}
                  className="text-gray-500 hover:text-gray-700 text-xl font-medium"
                >
                  <span className="sr-only">Close</span>
                  ×
                </button>
              </div>

              <div className="relative">
                <div className="h-[calc(90vh-120px)] overflow-y-auto">
                  <div className="space-y-2">
                    {onHoldTransports.length === 0 ? (
                      <div className="text-center py-4 text-orange-500 text-sm">
                        No transports on hold
                      </div>
                    ) : (
                      onHoldTransports.map(transport => (
                        <div 
                          key={transport.id}
                          className={`${
                            highlightedTransports.includes(transport.id) 
                              ? 'border-2 border-yellow-400 rounded-lg shadow-md shadow-yellow-200' 
                              : ''
                          }`}
                        >
                          <DraggableTransport
                            transport={transport}
                            onEdit={onEdit}
                            onDelete={onDelete}
                            onActivate={onActivate}
                            isHighlighted={highlightedTransports.includes(transport.id)}
                            isInOnHoldModal={true}
                          />
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </Dialog.Panel>
          </Transition.Child>
        </div>
      </Dialog>
    </Transition>
  );
} 