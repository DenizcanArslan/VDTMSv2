"use client";
import { useState, useEffect } from 'react';
import InspectionCalendar from './InspectionCalendar';
import { format } from 'date-fns';
import { enGB } from 'date-fns/locale';
import Image from "next/image";
import Link from "next/link";
import FormModal from '@/components/FormModal';
import TableSearch from '@/components/TableSearch';
import CompletionButton from "@/components/CompletionButton";

const InspectionView = ({ inspections: initialInspections, role }) => {
  const [view, setView] = useState('list');
  const [selectedVehicle, setSelectedVehicle] = useState("");
  const [inspections, setInspections] = useState(initialInspections);

  // Veriyi yeniden çekmek için fonksiyon
  const fetchData = async () => {
    try {
      const response = await fetch('/api/vehicle-inspections');
      const data = await response.json();
      setInspections(data);
    } catch (error) {
      console.error('Error fetching inspections:', error);
    }
  };

  // Status ve form güncellemelerini dinle
  useEffect(() => {
    const handleUpdate = () => {
      fetchData();
    };

    window.addEventListener('statusUpdated', handleUpdate);
    window.addEventListener('inspectionUpdated', handleUpdate);
    
    return () => {
      window.removeEventListener('statusUpdated', handleUpdate);
      window.removeEventListener('inspectionUpdated', handleUpdate);
    };
  }, []);

  // Filtreleme mantığı
  const filteredInspections = selectedVehicle 
    ? inspections.filter(m => {
        const [type, id] = selectedVehicle.split('-');
        if (type === 'truck' && m.truck?.id !== parseInt(id)) return false;
        if (type === 'trailer' && m.trailer?.id !== parseInt(id)) return false;
        return true;
      })
    : inspections;

  // Truck ve Trailer'ları ayrı ayrı grupla
  const trucks = inspections
    .filter(m => m.truck)
    .map(m => ({
      id: m.truck.id,
      label: `${m.truck.licensePlate} (${m.truck.nickName})`,
      type: 'truck'
    }))
    .filter((v, i, self) => self.findIndex(t => t.id === v.id) === i)
    .sort((a, b) => a.label.localeCompare(b.label));

  const trailers = inspections
    .filter(m => m.trailer)
    .map(m => ({
      id: m.trailer.id,
      label: `${m.trailer.licensePlate} (${m.trailer.nickName})`,
      type: 'trailer'
    }))
    .filter((v, i, self) => self.findIndex(t => t.id === v.id) === i)
    .sort((a, b) => a.label.localeCompare(b.label));

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Vehicle Inspections</h1>
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
        {/*CALISMIYOR !!!! <TableSearch placeholder="Search in inspections..." /> */}
          <select
            value={selectedVehicle}
            onChange={(e) => setSelectedVehicle(e.target.value)}
            className="border border-gray-300 rounded-md px-3 py-2 min-w-[200px]"
          >
            <option value="">All Vehicles</option>
            <optgroup label="Trucks">
              {trucks.map(truck => (
                <option key={`truck-${truck.id}`} value={`truck-${truck.id}`}>
                  {truck.label}
                </option>
              ))}
            </optgroup>
            <optgroup label="Trailers">
              {trailers.map(trailer => (
                <option key={`trailer-${trailer.id}`} value={`trailer-${trailer.id}`}>
                  {trailer.label}
                </option>
              ))}
            </optgroup>
          </select>
          {role === "admin" && <FormModal table="vehicleInspection" type="create" />}
        </div>
      </div>

      {view === 'calendar' ? (
        <InspectionCalendar inspections={filteredInspections} role={role} />
      ) : (
        <div className="mt-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredInspections.map(inspection => (
                <tr key={inspection.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {inspection.truck 
                      ? `${inspection.truck.licensePlate} (${inspection.truck.nickName})`
                      : `${inspection.trailer.licensePlate} (${inspection.trailer.nickName})`
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {inspection.truck ? 'Truck' : 'Trailer'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {format(new Date(inspection.inspectionDate), 'dd MMM yyyy', { locale: enGB })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <CompletionButton 
                      id={inspection.id}
                      status={inspection.status}
                      table="vehicle-inspections"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {inspection.cost ? `€${Number(inspection.cost).toFixed(2)}` : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Link href={`/list/vehicle-inspections/${inspection.id}`}>
                        <button className="w-7 h-7 flex items-center justify-center rounded-full bg-green-400 hover:bg-dijle-light-blue transition duration-200">
                          <Image src={"/icons/view.svg"} width={16} height={16} alt="view" />
                        </button>
                      </Link>
                      {role === "admin" && (
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
                          onSubmit={fetchData}
                        />
                      )}
                      {role === "admin" && (
                        <FormModal 
                          table="vehicleInspection" 
                          type="delete" 
                          id={inspection.id}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default InspectionView; 