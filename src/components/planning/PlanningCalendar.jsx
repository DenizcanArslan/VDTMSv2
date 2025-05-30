'use client';
import { useState } from 'react';
import FullCalendar from '@fullcalendar/react';
import dayGridPlugin from '@fullcalendar/daygrid';
import interactionPlugin from '@fullcalendar/interaction';
import multiMonthPlugin from '@fullcalendar/multimonth';
import { useAppDispatch, useAppSelector } from '@/hooks/redux';
import { setSelectedDate, fetchPlanningData } from '@/redux/features/planningSlice';
import { startOfDay } from 'date-fns';
import Spinner from '@/components/Spinner';

const PlanningCalendar = ({ isOpen, onClose }) => {
  const dispatch = useAppDispatch();
  const { transports, selectedDate } = useAppSelector(state => state.planning);
  const [isLoading, setIsLoading] = useState(false);

  const handleDateClick = (arg) => {
    const selected = arg.date;
    const utcDate = new Date(Date.UTC(selected.getFullYear(), selected.getMonth(), selected.getDate(), 0, 0, 0, 0));
    console.log("Takvimden seçilen gün (UTC 00:00):", utcDate, "ISO:", utcDate.toISOString());
    setIsLoading(true);
    dispatch(setSelectedDate(utcDate.toISOString()));
    dispatch(fetchPlanningData())
      .finally(() => {
        setIsLoading(false);
        onClose();
      });
  };

  const events = transports
    .reduce((acc, transport) => {
      if (transport.status !== 'ACTIVE') return acc;

      transport.destinations?.forEach(dest => {
        if (!dest.destinationDate) return;
        
        const dateStr = startOfDay(new Date(dest.destinationDate)).toISOString();
        if (!acc[dateStr]) {
          const dayTransports = transports.filter(t => 
            t.status === 'ACTIVE' &&
            t.destinations?.some(d => 
              startOfDay(new Date(d.destinationDate)).getTime() === startOfDay(new Date(dateStr)).getTime()
            )
          );

          if (dayTransports.length === 0) return;

          acc[dateStr] = {
            id: dateStr,
            date: dateStr,
            title: `${dayTransports.length} slots`,
            extendedProps: {
              slots: dayTransports.length,
              genset: dayTransports.filter(t => t.genset === 'YES').length,
              adr: dayTransports.filter(t => t.adr === 'YES').length
            },
            backgroundColor: 'transparent',
            borderColor: 'transparent',
            textColor: '#374151',
            className: 'text-xs font-medium',
            allDay: true
          };
        }
      });
      return acc;
    }, {});

  const eventsList = Object.values(events);

  return (
    isOpen && (
      <div 
        className="fixed inset-0 bg-black bg-opacity-30 z-50 flex items-center justify-center"
        onClick={(e) => e.target === e.currentTarget && onClose()}
        style={{
          animation: isOpen ? 'fadeIn 0.3s ease-out' : 'none'
        }}
      >
        <div 
          className="bg-white p-6 rounded-lg shadow-xl max-w-3xl w-full relative"
          style={{
            animation: isOpen ? 'slideIn 0.3s ease-out' : 'none'
          }}
        >
          {isLoading && (
            <div className="absolute inset-0 bg-white bg-opacity-70 z-10 flex items-center justify-center">
              <Spinner size="lg" text="Loading..." />
            </div>
          )}
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-800">Select Date</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 p-2 hover:bg-gray-100 rounded-full transition-all duration-200"
              disabled={isLoading}
            >
              ✕
            </button>
          </div>
          <FullCalendar
            plugins={[dayGridPlugin, interactionPlugin, multiMonthPlugin]}
            initialView="dayGridMonth"
            events={eventsList}
            dateClick={handleDateClick}
            height={500}
            firstDay={1}
            headerToolbar={{
              left: 'prev,next',
              center: 'title',
              right: 'dayGridMonth,dayGridWeek,dayGridDay'
            }}
            views={{
              dayGridMonth: {
                titleFormat: { month: 'short', year: 'numeric' },
                dayHeaderFormat: { weekday: 'short' }
              },
              dayGridWeek: {
                titleFormat: { month: 'short', year: 'numeric' },
                dayHeaderFormat: { weekday: 'short' },
                titleFormat: ({ date }) => {
                  const startOfYear = new Date(date.marker.getFullYear(), 0, 1);
                  const days = Math.floor((date.marker - startOfYear) / (24 * 60 * 60 * 1000));
                  const weekNumber = Math.ceil((days + startOfYear.getDay() + 1) / 7);
                  
                  return `Week ${weekNumber}`;
                }
              },
              dayGridDay: {
                titleFormat: { month: 'short', day: 'numeric' }
              }
            }}
            selectable={true}
            selectMirror={true}
            dayMaxEvents={1}
            weekends={true}
            select={(arg) => {
              dispatch(setSelectedDate(arg.start.toISOString()));
              dispatch(fetchPlanningData());
            }}
            initialDate={new Date(selectedDate)}
            dayCellClassNames={(arg) => {
              const selected = new Date(selectedDate);
              if (
                arg.date.getDate() === selected.getDate() &&
                arg.date.getMonth() === selected.getMonth() &&
                arg.date.getFullYear() === selected.getFullYear()
              ) {
                return 'bg-dijle-light-blue bg-opacity-20';
              }
              return '';
            }}
            contentHeight="auto"
            aspectRatio={1}
            eventContent={({ event }) => {
              const { slots, genset, adr } = event.extendedProps;
              return (
                <div className="flex items-center gap-1 text-xs">
                  <span>🚛 {slots}</span>
                  {genset > 0 && <span>❄️ {genset}</span>}
                  {adr > 0 && <span>⚠️ {adr}</span>}
                </div>
              );
            }}
          />
          <style jsx global>{`
            @keyframes fadeIn {
              from { opacity: 0; }
              to { opacity: 1; }
            }
            
            @keyframes slideIn {
              from {
                opacity: 0;
                transform: scale(0.95) translateY(-10px);
              }
              to {
                opacity: 1;
                transform: scale(1) translateY(0);
              }
            }
            
            .fc {
              font-size: 0.9rem !important;
            }
            
            .fc .fc-toolbar-title {
              font-size: 1.2rem !important;
            }
            
            .fc .fc-button {
              padding: 0.5rem 0.8rem !important;
              font-size: 0.9rem !important;
            }
            
            .fc .fc-toolbar-title {
              text-transform: capitalize;
              font-weight: 600;
            }
            
            /* Week görünümünde başlık stili */
            .fc-dayGridWeek-view .fc-toolbar-title {
              font-size: 1.5rem !important;
              color: #254795;
            }
            
            .fc-daygrid-event-harness {
              margin-top: 2px !important;
            }
            
            .fc-event {
              border: none !important;
              background: transparent !important;
            }
            
            .fc-daygrid-day-events {
              padding: 2px !important;
              margin: 0 !important;
            }
          `}</style>
        </div>
      </div>
    )
  );
};

export default PlanningCalendar; 