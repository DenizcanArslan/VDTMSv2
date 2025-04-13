"use client";
import { useState } from 'react';
import MaintenanceCalendar from './MaintenanceCalendar';
import { format } from 'date-fns';
import { enGB } from 'date-fns/locale';
import Image from "next/image";
import Link from "next/link";
import FormModal from '@/components/FormModal';
import TableSearch from '@/components/TableSearch';
import CompletionButton from "@/components/CompletionButton";

const MaintenanceView = ({ maintenances, role }) => {
  const [view, setView] = useState('list');
  const [selectedVehicle, setSelectedVehicle] = useState("");

  // Truck ve Trailer'ları ayrı ayrı grupla
  const trucks = maintenances
    .filter(m => m.truck)
    .map(m => ({
      id: m.truck.id,
      label: `${m.truck.licensePlate} (${m.truck.nickName})`,
      type: 'truck'
    }))
    .filter((v, i, self) => self.findIndex(t => t.id === v.id) === i)
    .sort((a, b) => a.label.localeCompare(b.label));

  const trailers = maintenances
    .filter(m => m.trailer)
    .map(m => ({
      id: m.trailer.id,
      label: `${m.trailer.licensePlate} (${m.trailer.nickName})`,
      type: 'trailer'
    }))
    .filter((v, i, self) => self.findIndex(t => t.id === v.id) === i)
    .sort((a, b) => a.label.localeCompare(b.label));

  // Sadece araç seçimine göre filtrele (arama işlemi page.jsx'de yapılıyor)
  const filteredMaintenances = selectedVehicle 
    ? maintenances.filter(m => {
        const [type, id] = selectedVehicle.split('-');
        if (type === 'truck' && m.truck?.id !== parseInt(id)) return false;
        if (type === 'trailer' && m.trailer?.id !== parseInt(id)) return false;
        return true;
      })
    : maintenances;

  return (
    <div className="bg-white p-4 rounded-md flex-1 m-4 mt-0">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold">Vehicle Maintenances</h1>
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
              {/* CALISIYOR  <TableSearch placeholder="Search in maintenances..." /> */}
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
          {role === "admin" && <FormModal table="vehicleMaintenance" type="create" />}
        </div>
      </div>

      {view === 'calendar' ? (
        <MaintenanceCalendar maintenances={maintenances} />
      ) : (
        <div className="mt-4">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Maintenance Type</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cost</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredMaintenances.map(maintenance => (
                <tr key={maintenance.id}>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {maintenance.truck 
                      ? `${maintenance.truck.licensePlate} (${maintenance.truck.nickName})`
                      : `${maintenance.trailer.licensePlate} (${maintenance.trailer.nickName})`
                    }
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {maintenance.truck ? 'Truck' : 'Trailer'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex">
                      {maintenance.isGensetMaintenance ? (
                        <span className="px-2 py-1 bg-cyan-600 text-white text-xs rounded-full flex items-center gap-1">
                          <span>❄️</span>
                          <span>Genset</span>
                        </span>
                      ) : (
                        <span className="px-2 py-1 bg-blue-600 text-white text-xs rounded-full">
                          Vehicle
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {format(new Date(maintenance.maintenanceDate), 'dd MMM yyyy', { locale: enGB })}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <CompletionButton 
                      id={maintenance.id}
                      status={maintenance.status}
                      table="vehicle-maintenances"
                    />
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {maintenance.cost ? `€${Number(maintenance.cost).toFixed(2)}` : "-"}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                      <Link href={`/list/vehicle-maintenances/${maintenance.id}`}>
                        <button className="w-7 h-7 flex items-center justify-center rounded-full bg-green-400 hover:bg-dijle-light-blue transition duration-200">
                          <Image src={"/icons/view.svg"} width={16} height={16} alt="view" />
                        </button>
                      </Link>
                      {role === "admin" && (
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
                            isGensetMaintenance: maintenance.isGensetMaintenance,
                          }}
                        />
                      )}
                      {role === "admin" && (
                        <FormModal 
                          table="vehicleMaintenance" 
                          type="delete" 
                          id={maintenance.id}
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

export default MaintenanceView;