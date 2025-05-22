import { useState, useEffect, Fragment } from 'react';
import { Dialog, Transition } from '@headlessui/react';
import { toast } from 'react-toastify';

export default function EditCutTransportModal({ transport, onClose, onSave }) {
  const [cutDate, setCutDate] = useState(transport.cutInfo?.cutStartDate?.slice(0, 10) || '');
  const [locationId, setLocationId] = useState('');
  const [customLocation, setCustomLocation] = useState('');
  const [useCustomLocation, setUseCustomLocation] = useState(false);
  const [notes, setNotes] = useState(transport.cutInfo?.notes || '');
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // cutInfo'daki mevcut değerleri öncelikli olarak inputlara set et
    if (transport.cutInfo?.customLocation) {
      setUseCustomLocation(true);
      setCustomLocation(transport.cutInfo.customLocation);
      setLocationId('');
    } else if (transport.cutInfo?.location?.id) {
      setUseCustomLocation(false);
      setLocationId(String(transport.cutInfo.location.id));
      setCustomLocation('');
    } else {
      setUseCustomLocation(false);
      setLocationId('');
      setCustomLocation('');
    }
    fetchLocations();
    // eslint-disable-next-line
  }, [transport]);

  const fetchLocations = async () => {
    try {
      const response = await fetch('/api/planning/cut-locations');
      if (!response.ok) throw new Error('Failed to fetch locations');
      const data = await response.json();
      setLocations(data);
      // Hiçbir locationId veya customLocation yoksa default location seçili gelmesin
      // (Yani hiçbir şey set etme)
    } catch (error) {
      toast.error('Failed to load locations');
    }
  };

  const handleSave = async () => {
    setLoading(true);
    try {
      let location = null;
      if (useCustomLocation && customLocation) {
        location = customLocation;
      } else if (!useCustomLocation && locationId) {
        location = Number(locationId);
      }
      const res = await fetch(`/api/planning/transports/${transport.id}/cut`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cutDate,
          location,
          notes,
        }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Failed to update cut transport');
      }
      const updated = await res.json();
      toast.success('Cut transport updated!');
      onSave(updated);
    } catch (err) {
      toast.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Transition appear show={true} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-30" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4 text-center">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-8 text-left align-middle shadow-xl transition-all">
                <Dialog.Title as="h3" className="text-2xl font-bold mb-6 text-gray-900">
                  Edit Cut Transport
                </Dialog.Title>
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSave();
                  }}
                >
                  <div className="space-y-5">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Cut Date</label>
                      <input
                        type="date"
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        value={cutDate}
                        onChange={e => setCutDate(e.target.value)}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Location</label>
                      <div className="flex items-center mb-2">
                        <input
                          type="checkbox"
                          id="useCustomLocation"
                          checked={useCustomLocation}
                          onChange={e => setUseCustomLocation(e.target.checked)}
                          className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300 rounded"
                        />
                        <label htmlFor="useCustomLocation" className="ml-2 block text-sm text-gray-700">
                          Use custom location
                        </label>
                      </div>
                      {useCustomLocation ? (
                        <input
                          type="text"
                          value={customLocation}
                          onChange={e => setCustomLocation(e.target.value)}
                          placeholder="Enter custom location"
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          required
                        />
                      ) : (
                        <select
                          value={locationId}
                          onChange={e => setLocationId(e.target.value)}
                          className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                        >
                          <option value="">Select a location</option>
                          {locations.map((location) => (
                            <option key={location.id} value={location.id}>
                              {location.name} {location.isDefault ? '(Default)' : ''}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                      <textarea
                        className="w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm min-h-[80px] resize-y"
                        value={notes}
                        onChange={e => setNotes(e.target.value)}
                        placeholder="Add notes (optional)"
                      />
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 mt-8">
                    <button
                      type="button"
                      className="px-4 py-2 rounded-md border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 transition"
                      onClick={onClose}
                      disabled={loading}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 rounded-md bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition disabled:opacity-60"
                      disabled={loading}
                    >
                      {loading ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                </form>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 