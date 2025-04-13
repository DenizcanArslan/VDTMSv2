'use client';
import { useSortable } from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { CSS } from '@dnd-kit/utilities';
import { FiMove, FiTruck, FiPackage } from 'react-icons/fi';
import { Combobox, Transition } from '@headlessui/react';
import { HiCheck, HiChevronUpDown } from 'react-icons/hi2';
import { Fragment, useState, useRef, useEffect } from 'react';
import DraggableTransport from './DraggableTransport';
import { toast } from 'react-toastify';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { fetchPlanningData, updateSlotTransports, assignDriverToSlot, updateSlotDriver, assignTruckToSlot, updateSlotTruck, updateTransportCurrentStatus, updateTransportEtas, updateSlotDriverStartNote, reorderSlots } from '@/redux/features/planningSlice';
import { startOfDay } from 'date-fns';
import { BsSnow2 } from 'react-icons/bs';
import { planningValidations, handleValidationResults } from '@/services/validations/planningValidations';
import ChangeDriverConfirmModal from './ChangeDriverConfirmModal';
import ChangeTruckConfirmModal from './ChangeTruckConfirmModal';
import { isTruckInUse, getAssignedTruckIds } from './TruckUtils';
import { isDriverInUse, getAssignedDriverIds } from './DriverUtils';

export default function SortableSlot({ 
  slot, 
  index,
  onUnassign,
  onEdit,
  onMoveUp,
  onMoveDown,
  isReordering,
  onDelete,
  onHold,
  dateStr,
  allSlots,
  highlightedTransports = []
}) {
  const dispatch = useAppDispatch();
  const { drivers, trucks } = useAppSelector(state => state.planning);
  const selectedDate = new Date().toISOString().split('T')[0];
  const [showDriverChangeConfirm, setShowDriverChangeConfirm] = useState(false);
  const [pendingDriverId, setPendingDriverId] = useState(null);
  const [showTruckChangeConfirm, setShowTruckChangeConfirm] = useState(false);
  const [pendingTruckId, setPendingTruckId] = useState(null);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const contextMenuRef = useRef(null);
  const dragHandleRef = useRef(null);
  const [driverQuery, setDriverQuery] = useState('');
  const [truckQuery, setTruckQuery] = useState('');

  // Close context menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (contextMenuRef.current && !contextMenuRef.current.contains(event.target)) {
        setShowContextMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const {
    attributes,
    listeners,
    setNodeRef: setSortableRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: slot.id.toString(),
  });

  const { 
    setNodeRef: setDroppableRef, 
    isOver, 
    active,
    over 
  } = useDroppable({
    id: `slot-${slot.id}`,
    data: {
      type: 'slot',
      slot,
    },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  const sortedTransports = slot.transports ? 
    [...slot.transports]
      .map(ts => {
        const transport = ts.transport;
        if (!transport) return null;
        if (transport.status === "ON_HOLD") return null;
        return {
          ...transport,
          slotOrder: ts.slotOrder,
          client: transport.client,
          destinations: transport.destinations,
          pickUpQuay: transport.pickUpQuay,
          dropOffQuay: transport.dropOffQuay,
          slotAssignments: [{
            id: ts.id,
            transportId: transport.id,
            slotId: slot.id,
            date: dateStr,
            slotOrder: ts.slotOrder
          }]
        };
      })
      .filter(Boolean)
      .sort((a, b) => a.slotOrder - b.slotOrder)
    : [];

  // Transport sürüklendiğinde drop alanını vurgula
  const isTransportDrag = active?.data?.current?.type === 'transport';
  const isValidDrop = isTransportDrag && isOver;

  // Filter drivers based on query
  const filteredDrivers = driverQuery === ''
    ? drivers
    : drivers.filter((driver) => {
        return (driver.nickName || driver.name || '')
          .toLowerCase()
          .includes(driverQuery.toLowerCase());
      });
  
  // Sort filtered drivers alphabetically
  const sortedDrivers = [...filteredDrivers].sort((a, b) => 
    (a.nickName || '').localeCompare(b.nickName || '')
  );
  
  // Filter trucks based on query
  const filteredTrucks = truckQuery === ''
    ? trucks
    : trucks.filter((truck) => {
        return (truck.nickName || truck.licensePlate || '')
          .toLowerCase()
          .includes(truckQuery.toLowerCase());
      });
  
  // Sort filtered trucks alphabetically
  const sortedTrucks = [...filteredTrucks].sort((a, b) => 
    (a.nickName || a.licensePlate || '').localeCompare(b.nickName || b.licensePlate || '')
  );

  const handleUnassign = async (transport) => {
    try {
      // Transport'un slot atamalarını kontrol et
      if (!transport?.slotAssignments?.length) {
        throw new Error('No slot assignments found for this transport');
      }

      // Transport'un gerçek atama tarihini bul
      const currentAssignment = transport.slotAssignments[0];

      if (!currentAssignment) {
        throw new Error('Transport assignment not found');
      }

      // Önce transport'un status ve ETA'larını güncelle
      await dispatch(updateTransportCurrentStatus({
        transportId: transport.id,
        currentStatus: 'PLANNED',
        sentToDriver: false
      })).unwrap();
      
      // ETA'ları sıfırla
      await dispatch(updateTransportEtas({
        transportId: transport.id,
        pickUpEta: null,
        dropOffEta: null,
        destinationEtas: transport.destinations.map(dest => ({
          destinationId: dest.id,
          eta: null
        }))
      })).unwrap();

      console.log('Unassigning transport:', {
        transportId: transport.id,
        currentSlot: slot.id,
        assignmentDate: currentAssignment.date,
        allAssignments: transport.slotAssignments
      });

      const response = await fetch('/api/planning/transports/assign', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          transportId: transport.id,
          slotId: null,
          date: currentAssignment.date
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to unassign transport');
      }

      dispatch(fetchPlanningData());
      toast.success('Transport unassigned successfully');
    } catch (error) {
      console.error('Error unassigning transport:', error);
      toast.error(error.message || 'Failed to unassign transport');
    }
  };

  const handleMoveUp = async (transport) => {
    const currentIndex = sortedTransports.findIndex(t => t.id === transport.id);
    if (currentIndex > 0) {
      const newTransports = [...sortedTransports];
      const temp = newTransports[currentIndex];
      newTransports[currentIndex] = newTransports[currentIndex - 1];
      newTransports[currentIndex - 1] = temp;

      // Frontend optimistik güncelleme
      dispatch(updateSlotTransports({
        dateStr: dateStr || startOfDay(new Date()).toISOString(),
        slotId: slot.id,
        updatedTransports: newTransports.map((t, index) => ({
          ...t,
          slotOrder: index,
          slotAssignments: [{
            ...t.slotAssignments[0],
            slotOrder: index
          }]
        }))
      }));

      try {
        // Backend güncelleme
        const response = await fetch(`/api/planning/slots/${slot.id}/reorder`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transportId: transport.id,
            direction: 'up',
            date: dateStr || startOfDay(new Date()).toISOString()
          })
        });

        if (!response.ok) {
          throw new Error('Failed to reorder transport');
        }
      } catch (error) {
        console.error('Error reordering transport:', error);
        toast.error('Failed to reorder transport');
      }
    }
  };

  const handleMoveDown = async (transport) => {
    const currentIndex = sortedTransports.findIndex(t => t.id === transport.id);
    if (currentIndex < sortedTransports.length - 1) {
      const newTransports = [...sortedTransports];
      const temp = newTransports[currentIndex];
      newTransports[currentIndex] = newTransports[currentIndex + 1];
      newTransports[currentIndex + 1] = temp;

      // Frontend optimistik güncelleme
      dispatch(updateSlotTransports({
        dateStr: dateStr || startOfDay(new Date()).toISOString(),
        slotId: slot.id,
        updatedTransports: newTransports.map((t, index) => ({
          ...t,
          slotOrder: index,
          slotAssignments: [{
            ...t.slotAssignments[0],
            slotOrder: index
          }]
        }))
      }));

      try {
        // Backend güncelleme
        const response = await fetch(`/api/planning/slots/${slot.id}/reorder`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            transportId: transport.id,
            direction: 'down',
            date: dateStr || startOfDay(new Date()).toISOString()
          })
        });

        if (!response.ok) {
          throw new Error('Failed to reorder transport');
        }
      } catch (error) {
        console.error('Error reordering transport:', error);
        toast.error('Failed to reorder transport');
      }
    }
  };

  const handleMoveToPosition = async (targetIndex) => {
    if (targetIndex === index) {
      setShowContextMenu(false);
      return; // No need to move if it's the same position
    }

    try {
      // Close the context menu
      setShowContextMenu(false);

      // Call the reorderSlots action
      await dispatch(reorderSlots({
        date: dateStr,
        oldIndex: index,
        newIndex: targetIndex,
      })).unwrap();

      toast.success(`Truck ${slot.slotNumber} moved successfully`);
    } catch (error) {
      console.error('Failed to move truck:', error);
      toast.error('Failed to move truck');
    }
  };

  return (
    <>
      <div className="py-2">
        <div
          ref={setSortableRef}
          style={style}
          className={`bg-white rounded-lg shadow transition-all duration-300 relative 
            ${
              isValidDrop
                ? "border-2 border-green-500 bg-green-50 scale-102 shadow-lg"
                : isDragging
                ? "border-2 border-gray-300 opacity-50"
                : "border border-[#254795]/50 hover:border-[#254795]/70 hover:shadow-md"
            }
            ${isReordering ? "opacity-50" : ""}`}
        >
          {isReordering && (
            <div className="absolute inset-0 bg-white/50 backdrop-blur-[1px] z-50 flex items-center justify-center">
              <div className="flex items-center gap-2">
                <div className="w-5 h-5 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
                <span className="text-sm text-blue-600 font-medium">
                  Reordering...
                </span>
              </div>
            </div>
          )}

          <div className="px-4 py-1.5 flex items-center select-none hover:bg-gray-50 transition-colors">
            <div className="flex justify-between items-center w-full">
              <div className="flex items-center gap-2 relative">
                <div
                  ref={dragHandleRef}
                  {...attributes}
                  {...listeners}
                  className="cursor-move hover:bg-gray-100 p-0.5 rounded text-gray-400"
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    setShowContextMenu(true);
                  }}
                >
                  <FiMove className="w-3 h-3" />
                </div>
                
                {/* Context Menu for Truck Position - Positioned relative to the drag handle */}
                {showContextMenu && (
                  <div 
                    ref={contextMenuRef}
                    className="absolute left-0 top-6 w-40 bg-white rounded-md shadow-lg z-50 py-1 text-xs"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <div className="px-2 py-1 text-xs font-medium text-gray-500 border-b border-gray-100">
                      Move Truck {slot.slotNumber} after:
                    </div>
                    <div className="max-h-48 overflow-y-auto">
                      {allSlots && allSlots.length > 0 ? (
                        allSlots.map((targetSlot, targetIndex) => (
                          <button
                            key={targetSlot.id}
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveToPosition(targetIndex);
                            }}
                            className={`w-full text-left px-2 py-1 text-xs hover:bg-gray-100 flex items-center justify-between ${
                              targetIndex === index ? 'bg-gray-50 text-gray-400' : 'text-gray-700'
                            }`}
                            disabled={targetIndex === index}
                          >
                            <span>Truck {targetSlot.slotNumber}</span>
                            {targetIndex === index && (
                              <span className="text-xs text-gray-400">(current)</span>
                            )}
                          </button>
                        ))
                      ) : (
                        <div className="px-2 py-1 text-xs text-gray-500">No slots available</div>
                      )}
                    </div>
                  </div>
                )}
                
                <h3 className="text-xs font-medium">Truck {slot.slotNumber}</h3>

                <Combobox
                  value={slot.driverId || ''}
                  onChange={async (driverId) => {
                    // Eğer aynı driver seçildiyse hiçbir şey yapma
                    if (driverId === slot.driverId) {
                      return;
                    }
                    
                    // Slot'ta ongoing/completed transport var mı kontrol et
                    const hasActiveTransport = slot.transports?.some(ts => 
                      ts.transport.currentStatus === 'ONGOING' || ts.transport.currentStatus === 'COMPLETED'
                    );
                    
                    if (hasActiveTransport) {
                      setPendingDriverId(driverId);
                      setShowDriverChangeConfirm(true);
                      return;
                    }

                    // Boş seçenek seçildiyse driver'ı kaldır
                    if (!driverId) {
                      dispatch(
                        updateSlotDriver({
                          dateStr,
                          slotId: slot.id,
                          driverId: null,
                        })
                      );

                      dispatch(
                        assignDriverToSlot({
                          slotId: slot.id,
                          driverId: null,
                          date: dateStr,
                        })
                      );
                      return;
                    }

                    // Seçilen driver'ı bul
                    const selectedDriver = drivers.find(
                      (d) => d.id === parseInt(driverId)
                    );

                    // ADR kontrolü
                    const validations =
                      await planningValidations.validateDriverAssignment(
                        selectedDriver,
                        slot,
                        slot.transports
                      );

                    console.log("ADR Check:", {
                      driver: selectedDriver,
                      driverAdr: selectedDriver.adr,
                      transports: slot.transports.map((t) => ({
                        id: t.transport.id,
                        adr: t.transport.adr,
                      })),
                    });

                    const canProceed = await handleValidationResults(validations);
                    if (!canProceed) return;

                    // Seçilen driver'ın başka slot'ta atanmış olup olmadığını kontrol et
                    const response = await fetch(
                      `/api/planning/slots/check-driver?date=${dateStr}&driverId=${driverId}`
                    );
                    const { isAssigned } = await response.json();

                    if (isAssigned) {
                      toast.error(
                        "This driver is already assigned to another slot on this date"
                      );
                      return;
                    }

                    dispatch(
                      updateSlotDriver({
                        dateStr,
                        slotId: slot.id,
                        driverId: driverId ? parseInt(driverId) : null,
                      })
                    );

                    dispatch(
                      assignDriverToSlot({
                        slotId: slot.id,
                        driverId: driverId ? parseInt(driverId) : null,
                        date: dateStr,
                      })
                    );

                    // Seçilen driver'ın bilgilerini konsola yazdır
                    console.log("Selected Driver Info:", {
                      id: selectedDriver.id,
                      name: selectedDriver.name,
                      nickName: selectedDriver.nickName,
                      adr: selectedDriver.adr,
                    });
                    
                    // Reset the query after selection
                    setDriverQuery('');
                  }}
                >
                  <div className="relative ml-2">
                    <div className="relative w-40">
                      <Combobox.Input
                        className={`w-full cursor-pointer rounded-md bg-white py-0.5 pl-2.5 pr-6 text-left text-[11px] leading-4 border border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          slot.driverId ? "font-extrabold text-zinc-950" : ""
                        }`}
                        onChange={(event) => setDriverQuery(event.target.value)}
                        displayValue={(driverId) => {
                          return driverId ? 
                            drivers.find((d) => d.id === driverId)?.nickName || "Select Driver" : 
                            "";
                        }}
                        placeholder="Select Driver"
                      />
                      <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-1.5">
                        <HiChevronUpDown
                          className="h-3 w-3 text-gray-400"
                          aria-hidden="true"
                        />
                      </Combobox.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                      afterLeave={() => setDriverQuery('')}
                    >
                      <Combobox.Options
                        className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-[11px] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none"
                      >
                        <Combobox.Option
                          value=""
                          className={({ active }) => `relative cursor-pointer select-none py-1.5 pl-8 pr-3 ${
                            active ? "bg-blue-50 text-blue-900" : "text-gray-900"
                          }`}
                        >
                          {({ selected, active }) => (
                            <>
                              <span
                                className={`block truncate ${
                                  selected ? "font-medium" : "font-normal"
                                }`}
                              >
                                Select Driver
                              </span>
                              {selected ? (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                  <HiCheck
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                  />
                                </span>
                              ) : null}
                            </>
                          )}
                        </Combobox.Option>
                        
                        {sortedDrivers.length === 0 && driverQuery !== '' ? (
                          <div className="relative cursor-default select-none py-2 px-4 text-gray-500">
                            Sonuç bulunamadı.
                          </div>
                        ) : (
                          sortedDrivers.map((driver) => {
                            const inUse = isDriverInUse(driver.id, allSlots, slot.id);
                            return (
                            <Combobox.Option
                              key={driver.id}
                              value={driver.id}
                              disabled={inUse}
                              className={({ active }) =>
                                `relative cursor-pointer select-none py-1.5 pl-8 pr-3 ${
                                  active
                                    ? inUse ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-blue-50 text-blue-900"
                                    : inUse ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "text-gray-900"
                                }`
                              }
                            >
                              {({ selected, active }) => (
                                <>
                                  <span
                                    className={`block truncate ${
                                      selected ? "font-medium" : "font-normal"
                                    } ${inUse ? "text-gray-400" : "text-zinc-950"}`}
                                  >
                                    {driver.nickName || driver.name}
                                    {inUse && (
                                      <span className="ml-1 text-[10px] bg-gray-200 text-gray-500 px-1 py-0.5 rounded">
                                        Assigned
                                      </span>
                                    )}
                                  </span>
                                  {selected ? (
                                    <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                      <HiCheck
                                        className="h-5 w-5"
                                        aria-hidden="true"
                                      />
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </Combobox.Option>
                            );
                          })
                        )}
                      </Combobox.Options>
                    </Transition>
                  </div>
                </Combobox>

                <Combobox
                  value={slot.truckId || ""}
                  onChange={async (truckId) => {
                    // Eğer aynı truck seçildiyse hiçbir şey yapma
                    if (truckId === slot.truckId) {
                      return;
                    }
                    
                    // Slot'ta ongoing/completed transport var mı kontrol et
                    const hasActiveTransport = slot.transports?.some(ts => 
                      ts.transport.currentStatus === 'ONGOING' || ts.transport.currentStatus === 'COMPLETED'
                    );
                    
                    if (hasActiveTransport) {
                      setPendingTruckId(truckId);
                      setShowTruckChangeConfirm(true);
                      return;
                    }

                    // Boş seçenek seçildiyse truck'ı kaldır
                    if (!truckId) {
                      dispatch(
                        updateSlotTruck({
                          dateStr,
                          slotId: slot.id,
                          truckId: null,
                        })
                      );

                      dispatch(
                        assignTruckToSlot({
                          slotId: slot.id,
                          truckId: null,
                          date: dateStr,
                        })
                      );
                      return;
                    }
                    
                    // Seçilen truck'ı bul
                    const selectedTruck = trucks.find(t => t.id === truckId);
                    if (!selectedTruck) {
                      toast.error('Selected truck not found');
                      return;
                    }
                    
                    // Genset kontrolü
                    if (selectedTruck.genset === 'NO') {
                      const validations = await planningValidations.validateTruckGensetRequirement(slot, selectedTruck);
                      if (validations.length > 0) {
                        const canProceed = await handleValidationResults(validations);
                        if (!canProceed) return;
                      }
                    }

                    // Check if the truck is already assigned to another slot
                    const isAssigned = isTruckInUse(truckId, allSlots, slot.id);
                    if (isAssigned) {
                      toast.error(
                        "This truck is already assigned to another slot on this date"
                      );
                      return;
                    }

                    dispatch(
                      updateSlotTruck({
                        dateStr,
                        slotId: slot.id,
                        truckId: truckId ? parseInt(truckId) : null,
                      })
                    );

                    dispatch(
                      assignTruckToSlot({
                        slotId: slot.id,
                        truckId: truckId ? parseInt(truckId) : null,
                        date: dateStr,
                      })
                    );
                    
                    // Reset the query after selection
                    setTruckQuery('');
                  }}
                >
                  <div className="relative ml-2">
                    <div className="relative w-40">
                      <Combobox.Input
                        className={`relative w-full cursor-pointer rounded-md bg-white py-0.5 pl-2.5 pr-6 text-left text-[11px] leading-4 border border-gray-200 hover:border-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                          slot.truckId ? "font-extrabold text-violet-600" : ""
                        }`}
                        onChange={(event) => setTruckQuery(event.target.value)}
                        displayValue={(truckId) => {
                          const truck = trucks.find((t) => t.id === truckId);
                          return truck ? truck.nickName || truck.licensePlate : "";
                        }}
                        placeholder="Select Truck"
                      />
                      <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-1.5">
                        {slot.truckId && trucks.find((t) => t.id === slot.truckId)?.genset === "YES" && (
                          <BsSnow2 className="h-2.5 w-2.5 text-blue-500 mr-1" />
                        )}
                        <HiChevronUpDown
                          className="h-3 w-3 text-gray-400"
                          aria-hidden="true"
                        />
                      </Combobox.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                      afterLeave={() => setTruckQuery('')}
                    >
                      <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-[11px] shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none">
                        <Combobox.Option
                          value=""
                          className={({ active }) =>
                            `relative cursor-pointer select-none py-1.5 pl-8 pr-3 ${
                              active
                                ? "bg-blue-50 text-blue-900"
                                : "text-gray-900"
                            }`
                          }
                        >
                          {({ selected, active }) => (
                            <>
                              <span
                                className={`block truncate ${
                                  selected ? "font-medium" : "font-normal"
                                }`}
                              >
                                Select Truck
                              </span>
                              {selected ? (
                                <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                  <HiCheck
                                    className="h-5 w-5"
                                    aria-hidden="true"
                                  />
                                </span>
                              ) : null}
                            </>
                          )}
                        </Combobox.Option>
                        
                        {sortedTrucks.length === 0 && truckQuery !== '' ? (
                          <div className="relative cursor-default select-none py-2 px-4 text-gray-500">
                            Sonuç bulunamadı.
                          </div>
                        ) : (
                          sortedTrucks.map((truck) => {
                            const inUse = isTruckInUse(truck.id, allSlots, slot.id);
                            return (
                              <Combobox.Option
                                key={truck.id}
                                value={truck.id}
                                disabled={inUse}
                                className={({ active }) =>
                                  `relative cursor-pointer select-none py-1.5 pl-8 pr-3 ${
                                    active
                                      ? inUse ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "bg-blue-50 text-blue-900"
                                      : inUse ? "bg-gray-100 text-gray-400 cursor-not-allowed" : "text-gray-900"
                                  }`
                                }
                              >
                                {({ selected, active }) => (
                                  <>
                                    <span
                                      className={`block truncate ${
                                        selected ? "font-medium" : "font-normal"
                                      } ${inUse ? "text-gray-400" : "text-violet-600 font-bold"}`}
                                    >
                                      {truck.nickName || truck.licensePlate}
                                      {truck.genset === "YES" && (
                                        <BsSnow2 className="inline-block ml-2 text-blue-500" />
                                      )}
                                      {inUse && (
                                        <span className="ml-1 text-[10px] bg-gray-200 text-gray-500 px-1 py-0.5 rounded">
                                          Assigned
                                        </span>
                                      )}
                                    </span>
                                    {selected ? (
                                      <span className="absolute inset-y-0 left-0 flex items-center pl-3 text-blue-600">
                                        <HiCheck
                                          className="h-5 w-5"
                                          aria-hidden="true"
                                        />
                                      </span>
                                    ) : null}
                                  </>
                                )}
                              </Combobox.Option>
                            );
                          })
                        )}
                      </Combobox.Options>
                    </Transition>
                  </div>
                </Combobox>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="Start time"
                  className="text-xs border border-gray-200 rounded-md  px-2 py-0.5 lg:w-24 xl:w-36 focus:outline-none focus:ring-1 focus:ring-blue-500 text-green-500 font-bold"
                  value={slot.driverStartNote || ''}
                  onChange={async (e) => {
                    // Lokal state'i güncelle
                    dispatch(
                      updateSlotDriverStartNote({
                        dateStr,
                        slotId: slot.id,
                        driverStartNote: e.target.value,
                      })
                    );
                    
                    // API çağrısı ile veritabanını güncelle
                    try {
                      const response = await fetch(`/api/planning/slots/${slot.id}/driver-start-note`, {
                        method: 'PUT',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ 
                          driverStartNote: e.target.value,
                          date: dateStr // Tarih bilgisini gönder
                        }),
                      });
                      
                      if (!response.ok) {
                        throw new Error('Failed to update driver start note');
                      }
                    } catch (error) {
                      console.error('Error updating driver start note:', error);
                      toast.error('Failed to update driver start note');
                    }
                  }}
                />
                <FiTruck className="w-3 h-3 text-gray-500" />
                <span className="text-xs text-gray-500">
                  {slot.transports?.length || 0} transport(s)
                </span>
              </div>
            </div>
          </div>

          <div
            ref={setDroppableRef}
            className={`px-2 py-2 space-y-2 transition-colors duration-300
              ${
                isValidDrop
                  ? "bg-green-50 border-t border-green-200"
                  : "border-t border-gray-100"
              } 
              ${isDragging ? "opacity-50" : ""}
              ${isReordering ? "pointer-events-none" : ""}`}
          >
            {sortedTransports.map((transport, index) => (
              <div 
                key={transport.id}
                id={`slot-transport-${transport.id}`}
                className={highlightedTransports.includes(transport.id) ? 'ring-2 ring-yellow-400 rounded-lg shadow-md shadow-yellow-200 animate-pulse' : ''}
              >
                <DraggableTransport
                  transport={transport}
                  onUnassign={handleUnassign}
                  onEdit={onEdit}
                  onHold={onHold}
                  onMoveUp={() => handleMoveUp(transport)}
                  onMoveDown={() => handleMoveDown(transport)}
                  isFirst={index === 0}
                  isLast={index === sortedTransports.length - 1}
                  isReordering={isReordering}
                  onDelete={onDelete}
                  slot={slot}
                  isHighlighted={highlightedTransports.includes(transport.id)}
                />
              </div>
            ))}
            {slot.transports?.length === 0 && (
              <div className="text-center text-xs text-gray-400 py-4 border-2 border-dashed border-gray-200 rounded-lg">
                Drop transports here
              </div>
            )}
          </div>
        </div>
      </div>

      <ChangeDriverConfirmModal
        isOpen={showDriverChangeConfirm}
        onClose={() => {
          setShowDriverChangeConfirm(false);
          setPendingDriverId(null);
        }}
        onConfirm={async () => {
          try {
            // Önce tüm ongoing/completed transportları unassign et
            for (const ts of slot.transports) {
              if (ts.transport.currentStatus === 'ONGOING' || ts.transport.currentStatus === 'COMPLETED') {
                await dispatch(updateTransportCurrentStatus({
                  transportId: ts.transport.id,
                  currentStatus: 'PLANNED',
                  sentToDriver: false
                })).unwrap();
                
                await dispatch(updateTransportEtas({
                  transportId: ts.transport.id,
                  pickUpEta: null,
                  dropOffEta: null,
                  destinationEtas: ts.transport.destinations.map(dest => ({
                    destinationId: dest.id,
                    eta: null
                  }))
                })).unwrap();
              }
            }
            
            // Sonra driver'ı değiştir
            dispatch(updateSlotDriver({ dateStr, slotId: slot.id, driverId: pendingDriverId }));
            dispatch(assignDriverToSlot({ slotId: slot.id, driverId: pendingDriverId, date: dateStr }));
            
            setShowDriverChangeConfirm(false);
            setPendingDriverId(null);
          } catch (error) {
            toast.error('Failed to update driver and unassign transports');
          }
        }}
      />

      <ChangeTruckConfirmModal
        isOpen={showTruckChangeConfirm}
        onClose={() => {
          setShowTruckChangeConfirm(false);
          setPendingTruckId(null);
        }}
        onConfirm={async () => {
          try {
            // Önce tüm ongoing/completed transportları unassign et
            for (const ts of slot.transports) {
              if (ts.transport.currentStatus === 'ONGOING' || ts.transport.currentStatus === 'COMPLETED') {
                await dispatch(updateTransportCurrentStatus({
                  transportId: ts.transport.id,
                  currentStatus: 'PLANNED',
                  sentToDriver: false
                })).unwrap();
                
                await dispatch(updateTransportEtas({
                  transportId: ts.transport.id,
                  pickUpEta: null,
                  dropOffEta: null,
                  destinationEtas: ts.transport.destinations.map(dest => ({
                    destinationId: dest.id,
                    eta: null
                  }))
                })).unwrap();
              }
            }
            
            // Sonra truck'ı değiştir
            dispatch(updateSlotTruck({ dateStr, slotId: slot.id, truckId: pendingTruckId }));
            dispatch(assignTruckToSlot({ slotId: slot.id, truckId: pendingTruckId, date: dateStr }));
            
            setShowTruckChangeConfirm(false);
            setPendingTruckId(null);
          } catch (error) {
            toast.error('Failed to update truck and unassign transports');
          }
        }}
      />
    </>
  );
} 