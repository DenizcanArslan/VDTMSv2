"use client";
import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import multiMonthPlugin from '@fullcalendar/multimonth';
import { format } from 'date-fns';
import { enGB } from 'date-fns/locale';
import FormModal from '@/components/FormModal';

const getColorForVehicle = (vehicleId) => {
  const colors = [
    '#4A148C', '#311B92', '#1A237E', '#0D47A1', '#01579B', '#004D40', '#1B5E20', '#33691E',
    '#3E2723', '#263238', '#37474F', '#212121'
  ];
  return colors[vehicleId % colors.length];
};

const MaintenanceDetailModal = ({ maintenance, onClose, setSelectedMaintenance }) => {
  if (!maintenance) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
        <h2 className="text-xl font-semibold mb-4">Maintenance Details</h2>
        <div className="space-y-3">
          <div>
            <span className="font-medium">Vehicle: </span>
            <span>{maintenance.vehicleName}</span>
          </div>
          <div>
            <span className="font-medium">Maintenance Date: </span>
            <span>{format(new Date(maintenance.maintenanceDate), 'dd MMMM yyyy', { locale: enGB })}</span>
          </div>
          <div>
            <span className="font-medium">Cost: </span>
            <span>{maintenance.cost ? `€${Number(maintenance.cost).toFixed(2)}` : "-"}</span>
          </div>
          {maintenance.notes && (
            <div>
              <span className="font-medium">Notes: </span>
              <span>{maintenance.notes}</span>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <FormModal 
            table="vehicleMaintenance" 
            type="delete" 
            id={maintenance.id}
            onSuccess={() => {
              onClose();
              setSelectedMaintenance(null);
            }}
          />
          <FormModal 
            table="vehicleMaintenance" 
            type="update" 
            data={{
              id: maintenance.id,
              maintenanceDate: maintenance.maintenanceDate,
              notes: maintenance.notes,
              cost: maintenance.cost,
              vehicleId: maintenance.truck 
                ? maintenance.truck.id.toString()
                : maintenance.trailer.id.toString(),
              vehicleType: maintenance.truck ? "truck" : "trailer",
            }}
            onSubmit={() => {
              onClose();
              setSelectedMaintenance(null);
            }}
            onSuccess={() => {
              onClose();
              setSelectedMaintenance(null);
            }}
          />
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const MaintenanceCalendar = ({ maintenances }) => {
  const [selectedMaintenance, setSelectedMaintenance] = useState(null);

  const events = maintenances.map(maintenance => {
    const vehicleName = maintenance.truck 
      ? `${maintenance.truck.licensePlate} (${maintenance.truck.nickName})`
      : `${maintenance.trailer.licensePlate} (${maintenance.trailer.nickName})`;
    
    const vehicleId = maintenance.truck ? maintenance.truck.id : maintenance.trailer.id;
    
    return {
      id: maintenance.id,
      title: `${vehicleName} - €${Number(maintenance.cost || 0).toFixed(2)}`,
      start: new Date(maintenance.maintenanceDate).toISOString().split('T')[0],
      backgroundColor: getColorForVehicle(vehicleId),
      borderColor: getColorForVehicle(vehicleId),
      extendedProps: {
        ...maintenance,
        vehicleName,
        vehicleId
      }
    };
  });

  return (
    <div className="mt-4">
      <FullCalendar
        plugins={[dayGridPlugin, interactionPlugin, multiMonthPlugin]}
        initialView="dayGridMonth"
        events={events}
        dayMaxEvents={true}
        displayEventTime={false}
        eventContent={(eventInfo) => {
          return (
            <div className="p-1 text-xs">
              <div className="font-semibold">{eventInfo.event.extendedProps.vehicleName}</div>
              <div>Cost: €{Number(eventInfo.event.extendedProps.cost || 0).toFixed(2)}</div>
            </div>
          )
        }}
        eventClick={(info) => {
          setSelectedMaintenance(info.event.extendedProps);
        }}
        headerToolbar={{
          left: 'prev,next today',
          center: 'title',
          right: 'dayGridWeek,dayGridMonth,multiMonthYear'
        }}
        height="auto"
        eventDisplay="block"
        slotMinTime="00:00:00"
        locale="en-gb"
        firstDay={1}
        allDaySlot={false}
        fixedWeekCount={false}
      />

      {selectedMaintenance && (
        <MaintenanceDetailModal
          maintenance={selectedMaintenance}
          onClose={() => setSelectedMaintenance(null)}
          setSelectedMaintenance={setSelectedMaintenance}
        />
      )}
    </div>
  );
};

export default MaintenanceCalendar; 