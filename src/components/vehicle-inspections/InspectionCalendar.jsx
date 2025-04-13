"use client";
import { useState, useEffect } from 'react';
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

const InspectionDetailModal = ({ inspection, onClose, setSelectedInspection, role }) => {
  if (!inspection) return null;

  const handleModalClose = () => {
    onClose();
    setSelectedInspection(null);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
        <h2 className="text-xl font-semibold mb-4">Inspection Details</h2>
        <div className="space-y-3">
          <div>
            <span className="font-medium">Vehicle: </span>
            <span>{inspection.vehicleName}</span>
          </div>
          <div>
            <span className="font-medium">Inspection Date: </span>
            <span>{format(new Date(inspection.inspectionDate), 'dd MMMM yyyy', { locale: enGB })}</span>
          </div>
          <div>
            <span className="font-medium">Cost: </span>
            <span>{inspection.cost ? `€${Number(inspection.cost).toFixed(2)}` : "-"}</span>
          </div>
          {inspection.notes && (
            <div>
              <span className="font-medium">Notes: </span>
              <span>{inspection.notes}</span>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          {role === "admin" && (
            <>
              <FormModal 
                table="vehicleInspection" 
                type="delete" 
                id={inspection.id}
                onSuccess={handleModalClose}
                onSubmit={handleModalClose}
              />
              <FormModal 
                table="vehicleInspection" 
                type="update" 
                data={{
                  id: inspection.id,
                  inspectionDate: inspection.inspectionDate,
                  notes: inspection.notes,
                  cost: inspection.cost,
                  vehicleId: inspection.truck 
                    ? inspection.truck.id.toString()
                    : inspection.trailer.id.toString(),
                  vehicleType: inspection.truck ? "truck" : "trailer",
                }}
                onSuccess={handleModalClose}
                onSubmit={handleModalClose}
              />
            </>
          )}
          <button
            onClick={handleModalClose}
            className="px-4 py-2 bg-gray-500 text-white rounded hover:bg-gray-600 transition-colors duration-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

const InspectionCalendar = ({ inspections, role }) => {
  const [selectedInspection, setSelectedInspection] = useState(null);

  useEffect(() => {
    // Inspection güncellemelerini dinle
    const handleInspectionUpdate = () => {
      setSelectedInspection(null);
    };
    window.addEventListener('inspectionUpdated', handleInspectionUpdate);
    
    return () => {
      window.removeEventListener('inspectionUpdated', handleInspectionUpdate);
    };
  }, []);

  const events = inspections.map(inspection => {
    const vehicleName = inspection.truck 
      ? `${inspection.truck.licensePlate} (${inspection.truck.nickName})`
      : `${inspection.trailer.licensePlate} (${inspection.trailer.nickName})`;
    
    const vehicleId = inspection.truck ? inspection.truck.id : inspection.trailer.id;
    
    return {
      id: inspection.id,
      title: `${vehicleName} - €${Number(inspection.cost || 0).toFixed(2)}`,
      start: new Date(inspection.inspectionDate).toISOString().split('T')[0],
      backgroundColor: getColorForVehicle(vehicleId),
      borderColor: getColorForVehicle(vehicleId),
      extendedProps: {
        ...inspection,
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
          setSelectedInspection(info.event.extendedProps);
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

      {selectedInspection && (
        <InspectionDetailModal
          inspection={selectedInspection}
          onClose={() => setSelectedInspection(null)}
          setSelectedInspection={setSelectedInspection}
          role={role}
        />
      )}
    </div>
  );
};

export default InspectionCalendar; 