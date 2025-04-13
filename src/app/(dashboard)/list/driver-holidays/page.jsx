"use client";
import { useState, useEffect } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import multiMonthPlugin from '@fullcalendar/multimonth';
import FormModal from '@/components/FormModal';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { enGB } from 'date-fns/locale';
import Image from "next/image";
import Link from "next/link";

const getColorForDriver = (driverId) => {
  const colors = [
    '#4A148C', '#311B92', '#1A237E', '#0D47A1', '#01579B', '#004D40', '#1B5E20', '#33691E',
    '#3E2723', '#263238', '#37474F', '#212121', '#1A1A1A', '#4A0072', '#3F0057', '#2D004D',
    '#1B0033', '#4A0404', '#330303', '#260202', '#4A1515', '#331010', '#260C0C', '#4A2626',
    '#332929', '#260D0D', '#4A3737', '#333131', '#262626', '#4A4848', '#333333', '#262626',
    '#4A1500', '#331000', '#260C00', '#4A2D00', '#332000', '#261800', '#4A4500', '#333000',
    '#262500', '#374A00', '#273300', '#1C2600', '#154A00', '#0E3300', '#0A2600', '#004A1C',
    '#003313', '#00260E', '#004A4A', '#003333', '#002626', '#00294A', '#001C33', '#001526',
    '#0C004A', '#080033', '#060026', '#29004A', '#1C0033', '#150026', '#4A004A', '#330033'
  ];
  return colors[driverId % colors.length];
};

const HolidayDetailModal = ({ holiday, onClose, setSelectedHoliday }) => {
  if (!holiday) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
        <h2 className="text-xl font-semibold mb-4">Holiday Details</h2>
        <div className="space-y-3">
          <div>
            <span className="font-medium">Driver: </span>
            <span>{holiday.driverName}</span>
          </div>
          <div>
            <span className="font-medium">Reason: </span>
            <span>{holiday.reason.replace('_', ' ')}</span>
          </div>
          <div>
            <span className="font-medium">Start Date: </span>
            <span>{format(new Date(holiday.startDate), 'dd MMMM yyyy', { locale: enGB })}</span>
          </div>
          <div>
            <span className="font-medium">End Date: </span>
            <span>{format(new Date(holiday.endDate), 'dd MMMM yyyy', { locale: enGB })}</span>
          </div>
          {holiday.notes && (
            <div>
              <span className="font-medium">Notes: </span>
              <span>{holiday.notes}</span>
            </div>
          )}
        </div>
        <div className="mt-6 flex justify-end gap-3">
          <FormModal 
            table="driverHoliday" 
            type="delete" 
            id={holiday.id}
            onSuccess={() => {
              onClose();
              setSelectedHoliday(null);
            }}
          />
          <FormModal 
            table="driverHoliday" 
            type="update" 
            data={{
              id: holiday.id,
              startDate: holiday.startDate,
              endDate: holiday.endDate,
              reason: holiday.reason,
              notes: holiday.notes,
              driverId: holiday.driverId.toString(),
            }}
            onSuccess={() => {
              onClose();
              setSelectedHoliday(null);
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

const DriverHolidaysPage = () => {
  const [holidays, setHolidays] = useState([]);
  const [drivers, setDrivers] = useState([]);
  const [selectedDriver, setSelectedDriver] = useState('all');
  const [selectedHoliday, setSelectedHoliday] = useState(null);
  const [view, setView] = useState('calendar');
  const router = useRouter();

  const fetchData = async () => {
    try {
      const [holidaysRes, driversRes] = await Promise.all([
        fetch('/api/driver-holidays'),
        fetch('/api/drivers')
      ]);
      
      const holidaysData = await holidaysRes.json();
      const driversData = await driversRes.json();
      
      setHolidays(Array.isArray(holidaysData) ? holidaysData : []);
      setDrivers(driversData);
    } catch (error) {
      console.error('Error fetching data:', error);
      setHolidays([]);
    }
  };

  useEffect(() => {
    fetchData();
    
    // Holiday güncellemelerini dinle
    const handleHolidayUpdate = () => {
      fetchData();
    };
    window.addEventListener('holidayUpdated', handleHolidayUpdate);
    
    return () => {
      window.removeEventListener('holidayUpdated', handleHolidayUpdate);
    };
  }, []);

  const events = (holidays || [])
    .filter(holiday => selectedDriver === 'all' || holiday.driverId.toString() === selectedDriver)
    .map(holiday => {
      console.log('Processing holiday:', holiday);
      const event = {
        id: holiday.id,
        title: `${holiday.driver.name} ${holiday.driver.surname} - ${holiday.reason.replace('_', ' ')}`,
        start: new Date(holiday.startDate).toISOString().split('T')[0],
        end: new Date(new Date(holiday.endDate).getTime() + 86400000).toISOString().split('T')[0],
        backgroundColor: getColorForDriver(holiday.driverId),
        borderColor: getColorForDriver(holiday.driverId),
        extendedProps: {
          ...holiday,
          driverName: `${holiday.driver.name} ${holiday.driver.surname}`
        }
      };
      console.log('Created event:', event);
      return event;
    });

  useEffect(() => {
    console.log('Current events:', events);
  }, [events]);

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Driver Holidays</h1>
          <div className="flex rounded-md overflow-hidden">
            <button
              onClick={() => setView('calendar')}
              className={`px-4 py-2 ${
                view === 'calendar' 
                  ? 'bg-dijle-dark-blue text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              Calendar View
            </button>
            <button
              onClick={() => setView('list')}
              className={`px-4 py-2 ${
                view === 'list' 
                  ? 'bg-dijle-dark-blue text-white' 
                  : 'bg-gray-100 hover:bg-gray-200'
              }`}
            >
              List View
            </button>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <select
            value={selectedDriver}
            onChange={(e) => setSelectedDriver(e.target.value)}
            className="rounded-md border border-gray-300 px-3 py-2"
          >
            <option value="all">All Drivers</option>
            {drivers.map(driver => (
              <option key={driver.id} value={driver.id}>
                {driver.name} {driver.surname}
              </option>
            ))}
          </select>
          <FormModal table="driverHoliday" type="create" />
        </div>
      </div>

      {view === 'calendar' ? (
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
                  <div className="font-semibold">{eventInfo.event.extendedProps.driverName}</div>
                  <div>{eventInfo.event.extendedProps.reason.replace('_', ' ')}</div>
                </div>
              )
            }}
            eventClick={(info) => {
              setSelectedHoliday(info.event.extendedProps);
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
        </div>
      ) : (
        <div className="mt-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Driver</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Start Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">End Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {holidays
                .filter(holiday => selectedDriver === 'all' || holiday.driverId.toString() === selectedDriver)
                .map(holiday => (
                  <tr key={holiday.id}>
                    <td className="px-6 py-4 whitespace-nowrap">{holiday.driver.name} {holiday.driver.surname}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{format(new Date(holiday.startDate), 'dd MMM yyyy', { locale: enGB })}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{format(new Date(holiday.endDate), 'dd MMM yyyy', { locale: enGB })}</td>
                    <td className="px-6 py-4 whitespace-nowrap">{holiday.reason.replace('_', ' ')}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <Link href={`/list/driver-holidays/${holiday.id}`}>
                          <button className="w-7 h-7 flex items-center justify-center rounded-full bg-green-400 hover:bg-dijle-light-blue transition duration-200">
                            <Image src={"/icons/view.svg"} width={16} height={16} alt="view" />
                          </button>
                        </Link>
                        <FormModal table="driverHoliday" type="update" data={holiday} />
                        <FormModal table="driverHoliday" type="delete" id={holiday.id} />
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
      {selectedHoliday && (
        <HolidayDetailModal
          holiday={selectedHoliday}
          onClose={() => setSelectedHoliday(null)}
          setSelectedHoliday={setSelectedHoliday}
        />
      )}
    </div>
  );
};

export default DriverHolidaysPage; 