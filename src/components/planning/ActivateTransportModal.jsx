import { Dialog } from '@headlessui/react';
import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { FiCalendar, FiClock, FiX } from 'react-icons/fi';

export default function ActivateTransportModal({ isOpen, onClose, transport, onActivate }) {
  const [dates, setDates] = useState(null);

  useEffect(() => {
    if (transport && isOpen) {
      console.log('Setting initial dates:', {
        departureDate: transport.departureDate,
        returnDate: transport.returnDate,
        destinations: transport.destinations
      });
      setDates({
        departureDate: transport.departureDate ? format(new Date(transport.departureDate), 'yyyy-MM-dd') : '',
        returnDate: transport.returnDate ? format(new Date(transport.returnDate), 'yyyy-MM-dd') : '',
        useDateRange: !!(transport.departureDate || transport.returnDate),
        destinations: transport.destinations.map(d => ({
          id: d.id,
          date: d.destinationDate ? format(new Date(d.destinationDate), 'yyyy-MM-dd') : '',
          time: d.destinationTime ? d.destinationTime.split('T')[1].substring(0, 5) : ''
        }))
      });
    }
  }, [transport, isOpen]);

  useEffect(() => {
    if (!isOpen) {
      setDates(null);
    }
  }, [isOpen]);

  useEffect(() => {
    if (dates) {
      console.log('Current dates state:', dates);
    }
  }, [dates]);

  const handleSubmit = (e) => {
    e.preventDefault();
    console.log('Form submitted with dates:', dates);
    if (dates) {
      onActivate(transport.id, {
        departureDate: dates.useDateRange ? dates.departureDate : null,
        returnDate: dates.useDateRange ? dates.returnDate : null,
        destinations: dates.destinations.map(dest => ({
          id: dest.id,
          date: dest.date,
          time: dest.time || '00:00'
        }))
      });
      onClose();
    }
  };

  if (!dates || !transport) {
    return null;
  }

  return (
    <Dialog
      open={isOpen}
      onClose={onClose}
      className="relative z-50"
    >
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />

      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-2xl w-full bg-white rounded-xl shadow-2xl p-6">
          <div className="flex justify-between items-center mb-6">
            <div>
              <Dialog.Title className="text-xl font-semibold text-gray-900">
                Reactivate Transport
              </Dialog.Title>
              <p className="text-sm text-gray-500 mt-1">
                Previous dates are pre-filled. You can modify them if needed.
              </p>
            </div>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 transition-colors"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm font-medium text-gray-700">Date Range</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  className="sr-only peer"
                  checked={dates.useDateRange}
                  onChange={() => {
                    setDates(prev => ({
                      ...prev,
                      useDateRange: !prev.useDateRange,
                      departureDate: !prev.useDateRange ? prev.departureDate : null,
                      returnDate: !prev.useDateRange ? prev.returnDate : null
                    }));
                  }}
                />
                <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
              </label>
            </div>

            {dates.useDateRange && (
              <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="relative">
                  <input
                    type="date"
                    className="pl-10 w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={dates.departureDate || ''}
                    onChange={(e) => setDates(prev => ({ ...prev, departureDate: e.target.value }))}
                  />
                  <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
                <div className="relative">
                  <input
                    type="date"
                    className="pl-10 w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                    value={dates.returnDate || ''}
                    onChange={(e) => setDates(prev => ({ ...prev, returnDate: e.target.value }))}
                  />
                  <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                </div>
              </div>
            )}

            <div className="space-y-4">
              {transport.destinations.map((dest, index) => (
                <div key={dest.id} className="bg-gray-50 p-4 rounded-lg">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    {dest.frequentLocation?.name}
                  </label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                      <input
                        type="date"
                        required
                        className="pl-10 w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={dates.destinations[index].date}
                        onChange={(e) => {
                          const newDests = [...dates.destinations];
                          newDests[index].date = e.target.value;
                          setDates(prev => ({ ...prev, destinations: newDests }));
                        }}
                      />
                      <FiCalendar className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    </div>
                    <div className="relative">
                      <input
                        type="time"
                        className="pl-10 w-full rounded-lg border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500"
                        value={dates.destinations[index].time}
                        onChange={(e) => {
                          const newDests = [...dates.destinations];
                          newDests[index].time = e.target.value;
                          setDates(prev => ({ ...prev, destinations: newDests }));
                        }}
                      />
                      <FiClock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                Activate
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 