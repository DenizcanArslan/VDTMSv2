"use client"
import dynamic from "next/dynamic";
import React, { useState, Fragment, Suspense } from "react";
import Image from "next/image";
import { toast } from "react-toastify";
import { Dialog, Transition } from '@headlessui/react';
import { FiX } from 'react-icons/fi';
import { FiLoader } from 'react-icons/fi';

const DriverForm = dynamic(() => import("./forms/DriverForm"), {
  loading: () => (
    <div className="flex items-center justify-center py-8">
      <FiLoader className="w-8 h-8 text-blue-500 animate-spin" />
      <span className="sr-only">Loading...</span>
    </div>
  ),
});

const TruckForm = dynamic(() => import("./forms/TruckForm"), {
  loading: () => (
    <div className="flex items-center justify-center py-8">
      <FiLoader className="w-8 h-8 text-blue-500 animate-spin" />
      <span className="sr-only">Loading...</span>
    </div>
  ),
});

const TrailerForm = dynamic(() => import("./forms/TrailerForm"), {
  loading: () => (
    <div className="flex items-center justify-center py-8">
      <FiLoader className="w-8 h-8 text-blue-500 animate-spin" />
      <span className="sr-only">Loading...</span>
    </div>
  ),
});

const ClientForm = dynamic(() => import("./forms/ClientForm"), {
  loading: () => (
    <div className="flex items-center justify-center py-8">
      <FiLoader className="w-8 h-8 text-blue-500 animate-spin" />
      <span className="sr-only">Loading...</span>
    </div>
  ),
});

const QuayForm = dynamic(() => import("./forms/QuayForm"), {
  loading: () => (
    <div className="flex items-center justify-center py-8">
      <FiLoader className="w-8 h-8 text-blue-500 animate-spin" />
      <span className="sr-only">Loading...</span>
    </div>
  ),
});

const VehicleInspectionForm = dynamic(() => import("./forms/VehicleInspectionForm"), {
  loading: () => (
    <div className="flex items-center justify-center py-8">
      <FiLoader className="w-8 h-8 text-blue-500 animate-spin" />
      <span className="sr-only">Loading...</span>
    </div>
  ),
});

const VehicleMaintenanceForm = dynamic(() => import("./forms/VehicleMaintenanceForm"), {
  loading: () => (
    <div className="flex items-center justify-center py-8">
      <FiLoader className="w-8 h-8 text-blue-500 animate-spin" />
      <span className="sr-only">Loading...</span>
    </div>
  ),
});

const DriverHolidayForm = dynamic(() => import("./forms/DriverHolidayForm"), {
  loading: () => (
    <div className="flex items-center justify-center py-8">
      <FiLoader className="w-8 h-8 text-blue-500 animate-spin" />
      <span className="sr-only">Loading...</span>
    </div>
  ),
});

const TransportLicenseForm = dynamic(() => import("./forms/TransportLicenseForm"), {
  loading: () => (
    <div className="flex items-center justify-center py-8">
      <FiLoader className="w-8 h-8 text-blue-500 animate-spin" />
      <span className="sr-only">Loading...</span>
    </div>
  ),
});

const FrequentLocationForm = dynamic(() => import("./forms/FrequentLocationForm"), {
  loading: () => (
    <div className="flex items-center justify-center py-8">
      <FiLoader className="w-8 h-8 text-blue-500 animate-spin" />
      <span className="sr-only">Loading...</span>
    </div>
  ),
});

const forms = {
  driver: (type, data, id, setOpen) => <DriverForm type={type} data={data} id={data?.id} setOpen={setOpen} />,
  truck: (type, data, id, setOpen) => <TruckForm type={type} data={data} id={data?.id} setOpen={setOpen} />,
  trailer: (type, data, id, setOpen) => <TrailerForm type={type} data={data} id={data?.id} setOpen={setOpen} />,
  client: (type, data, id, setOpen) => <ClientForm type={type} data={data} id={data?.id} setOpen={setOpen} />,
  quay: (type, data, id, setOpen) => <QuayForm type={type} data={data} id={data?.id} setOpen={setOpen} />,
  vehicleInspection: (type, data, id, setOpen) => <VehicleInspectionForm type={type} data={data} id={data?.id} setOpen={setOpen} />,
  vehicleMaintenance: (type, data, id, setOpen, onSubmit) => (
    <VehicleMaintenanceForm 
      type={type} 
      data={data} 
      id={data?.id} 
      setOpen={setOpen}
      onSubmit={onSubmit}
    />
  ),
  driverHoliday: (type, data, id, setOpen) => <DriverHolidayForm type={type} data={data} id={data?.id} setOpen={setOpen} />,
  transportLicense: (type, data, id, setOpen, onSuccess) => (
    <TransportLicenseForm 
      type={type} 
      data={data} 
      id={data?.id} 
      setOpen={setOpen} 
      mutate={onSuccess}
    />
  ),
  "frequent-location": (type, data, id, setOpen) => (
    <FrequentLocationForm 
      type={type} 
      data={data} 
      id={data?.id} 
      setOpen={setOpen} 
    />
  ),
};

const FormModal = ({ table, type, data, id, onSuccess, onSubmit }) => {
  const [open, setOpen] = useState(false);

  const handleDelete = async () => {
    try {
      console.log("Delete process started...");
      console.log("Table:", table);
      console.log("ID:", id);
      
      const url = table === 'vehicleMaintenance' 
        ? `/api/vehicle-maintenances/${id}`
        : table === 'vehicleInspection'
        ? `/api/vehicle-inspections/${id}`
        : table === 'driverHoliday'
        ? `/api/driver-holidays/${id}`
        : table === 'transportLicense'
        ? `/api/transport-licenses/${id}`
        : table === 'frequent-location'
        ? `/api/frequent-locations/${id}`
        : `/api/${table}s/${id}`;

      const response = await fetch(url, {
        method: "DELETE",
      });

      if (response.ok) {
        toast.success(`${table === 'driver' ? 'driver' : 
                      table === 'truck' ? 'truck' : 
                      table === 'trailer' ? 'trailer' : 
                      table === 'client' ? 'client' : 
                      table === 'vehicleInspection' ? 'inspection' :
                      table === 'vehicleMaintenance' ? 'maintenance' :
                      table === 'driverHoliday' ? 'holiday' :
                      table === 'frequent-location' ? 'location' :
                      'record'} deleted successfully`);
        setOpen(false);
        onSuccess?.();
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const errorData = await response.json();
        console.error("Error deleting:", errorData);
        toast.error(`${table === 'driver' ? 'driver' : 
                     table === 'truck' ? 'truck' : 
                     table === 'trailer' ? 'trailer' : 
                     table === 'client' ? 'client' : 
                     table === 'vehicleInspection' ? 'inspection' :
                     table === 'vehicleMaintenance' ? 'maintenance' :
                     'record'} deleted error`);
      }
    } catch (error) {
      console.error("Error deleting:", error);
      toast.error(`${table === 'driver' ? 'driver' : 
                    table === 'truck' ? 'truck' : 
                    table === 'trailer' ? 'trailer' : 
                    table === 'client' ? 'client' : 
                    table === 'vehicleInspection' ? 'inspection' :
                    table === 'vehicleMaintenance' ? 'maintenance' :
                    'record'} deleted error`);
    }
  };

  const Form = ({ onSuccess }) => {
    return type === "delete" ? (
      <div className="p-8 flex flex-col items-center justify-center min-h-[200px]">
        <span className="text-center font-medium text-red-600 block mb-6 text-lg">
          All data will be lost. Are you sure you want to delete this {
            table === 'driver' ? 'driver' : 
            table === 'truck' ? 'truck' : 
            table === 'trailer' ? 'trailer' : 
            table === 'client' ? 'client' : 
            table === 'vehicleInspection' ? 'inspection record' :
            table === 'vehicleMaintenance' ? 'maintenance record' :
            table === 'driverHoliday' ? 'holiday record' :
            'record'
          }?
        </span>
        <div className="flex gap-4 justify-end w-full mt-4">
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="bg-red-500 text-white px-8 py-3 rounded-md hover:bg-red-600 transition-colors duration-200"
          >
            Cancel
          </button>
          <button
            onClick={handleDelete}
            className="bg-dijle-dark-blue text-white px-8 py-3 rounded-md hover:bg-dijle-light-blue transition-colors duration-200"
          >
            Delete
          </button>
        </div>
      </div>
    ) : type === "create" || type === "update" ? (
      React.cloneElement(
        forms[table](type, data, data?.id, setOpen, onSubmit),
        { onSuccess }
      )
    ) : (
      "Form not found!"
    );
  };

  return (
    <>
      <button
        className={`${type === "create" ? "w-8 h-8" : "w-7 h-7"} flex items-center justify-center rounded-full ${type === "create" ? "border-dijle-light-blue border-2 hover:border-dijle-dark-blue transition-colors duration-300" : type === "update" ? "bg-yellow-400" : "bg-red-400"}`}
        onClick={() => setOpen(true)}
      >
        <Image
          src={`/icons/${type}.${type === "create" ? "png" : "svg"}`}
          width={16}
          height={16}
        />
      </button>
      {open && (
        <div className="w-screen h-screen absolute left-0 top-0 bg-black bg-opacity-60 z-50 flex items-center justify-center">
          <div className="bg-white p-4 rounded-md relative w-[90%] md:w-[70%]  lg:w-[60%] xl:w-[50%] 2xl:w-[40%]">
            <Form onSuccess={onSuccess} />
            <div
              className="absolute top-4 right-4 cursor-pointer"
              onClick={() => setOpen(!open)}
            >
              <Image src={"/icons/close.png"} height={14} width={14} />
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default FormModal;
