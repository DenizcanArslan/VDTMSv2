"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { vehicleMaintenanceSchema } from "@/lib/validations/vehicleMaintenance";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const VehicleMaintenanceForm = ({ type = "create", data, setOpen, onSuccess, onSubmit }) => {
  const router = useRouter();
  const [trucks, setTrucks] = useState([]);
  const [trailers, setTrailers] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [hasGenset, setHasGenset] = useState(false);

  const {
    register,
    handleSubmit: hookFormSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(vehicleMaintenanceSchema),
    defaultValues: type === "update" ? {
      maintenanceDate: data?.maintenanceDate ? new Date(data.maintenanceDate).toISOString().split('T')[0] : "",
      notes: data?.notes || "",
      cost: data?.cost?.toString() || "",
      vehicleType: data.vehicleType,
      vehicleId: data.vehicleId,
      isGensetMaintenance: data?.isGensetMaintenance || false,
    } : {
      vehicleType: "truck",
      vehicleId: "",
      isGensetMaintenance: false,
    }
  });

  const vehicleType = watch("vehicleType");
  const vehicleId = watch("vehicleId");

  useEffect(() => {
    if (type === "create") {
      setValue("vehicleId", "");
      setHasGenset(false);
    }
  }, [vehicleType, setValue, type]);

  // Seçilen aracın genset'i olup olmadığını kontrol et
  useEffect(() => {
    if (vehicleId) {
      const vehicles = vehicleType === "truck" ? trucks : trailers;
      const vehicle = vehicles.find(v => v.id.toString() === vehicleId.toString());
      
      if (vehicle) {
        setSelectedVehicle(vehicle);
        setHasGenset(vehicle.genset === "YES");
      } else {
        setSelectedVehicle(null);
        setHasGenset(false);
      }
    } else {
      setSelectedVehicle(null);
      setHasGenset(false);
    }
  }, [vehicleId, vehicleType, trucks, trailers]);

  useEffect(() => {
    const fetchVehicles = async () => {
      try {
        const [trucksRes, trailersRes] = await Promise.all([
          fetch('/api/trucks'),
          fetch('/api/trailers')
        ]);
        
        const trucksData = await trucksRes.json();
        const trailersData = await trailersRes.json();
        
        setTrucks(trucksData);
        setTrailers(trailersData);
        
        if (type === "update" && data.vehicleId) {
          setValue("vehicleId", data.vehicleId);
          
          // Update sayfasında genset durumunu kontrol et
          if (data.vehicleType === "truck") {
            const truck = trucksData.find(t => t.id.toString() === data.vehicleId.toString());
            if (truck) {
              setHasGenset(truck.genset === "YES");
            }
          } else {
            const trailer = trailersData.find(t => t.id.toString() === data.vehicleId.toString());
            if (trailer) {
              setHasGenset(trailer.genset === "YES");
            }
          }
        }
      } catch (error) {
        console.error('Error fetching vehicles:', error);
        toast.error('Error loading vehicles');
      }
    };

    fetchVehicles();
  }, [type, data, setValue]);

  const onFormSubmit = async (formData) => {
    if (onSubmit) {
      onSubmit();
    }

    try {
      const res = await fetch(
        `/api/vehicle-maintenances${type === "update" ? `/${data.id}` : ""}`,
        {
          method: type === "update" ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || "Something went wrong");
      }

      router.refresh();
      setOpen(false);
      toast.success(
        type === "update" 
          ? "Maintenance updated successfully!" 
          : "Maintenance created successfully!"
      );
      onSuccess?.();
      window.dispatchEvent(new Event('maintenanceUpdated'));
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={hookFormSubmit(onFormSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Vehicle Type
        </label>
        <select
          {...register("vehicleType")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
          disabled={type === "update"}
        >
          <option value="truck">Truck</option>
          <option value="trailer">Trailer</option>
        </select>
        {errors.vehicleType && (
          <p className="text-red-500 text-sm">{errors.vehicleType.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Vehicle
        </label>
        <select
          {...register("vehicleId")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
        >
          <option value="">Select a vehicle</option>
          {vehicleType === "truck" 
            ? trucks.map(truck => (
                <option key={truck.id} value={truck.id}>
                  {truck.licensePlate} ({truck.nickName}) {truck.genset === "YES" ? "- Has Genset" : ""}
                </option>
              ))
            : trailers.map(trailer => (
                <option key={trailer.id} value={trailer.id}>
                  {trailer.licensePlate} ({trailer.nickName}) {trailer.genset === "YES" ? "- Has Genset" : ""}
                </option>
              ))
          }
        </select>
        {errors.vehicleId && (
          <p className="text-red-500 text-sm">{errors.vehicleId.message}</p>
        )}
      </div>

      {hasGenset && (
        <div className="flex items-center">
          <input
            type="checkbox"
            id="isGensetMaintenance"
            {...register("isGensetMaintenance")}
            className="h-4 w-4 text-dijle-dark-blue focus:ring-dijle-light-blue border-gray-300 rounded"
          />
          <label htmlFor="isGensetMaintenance" className="ml-2 block text-sm text-gray-900">
            This is a genset maintenance
          </label>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Maintenance Date
        </label>
        <input
          type="date"
          {...register("maintenanceDate")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
        />
        {errors.maintenanceDate && (
          <p className="text-red-500 text-sm">{errors.maintenanceDate.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Cost
        </label>
        <input
          type="text"
          placeholder="e.g. 100.50"
          {...register("cost")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
        />
        {errors.cost && (
          <p className="text-red-500 text-sm">{errors.cost.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Notes
        </label>
        <textarea
          {...register("notes")}
          rows={3}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
        />
        {errors.notes && (
          <p className="text-red-500 text-sm">{errors.notes.message}</p>
        )}
      </div>

      <div className="flex gap-4 justify-end">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="bg-red-500 text-white px-4 py-2 rounded-md hover:bg-red-600 transition-colors duration-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-dijle-dark-blue text-white px-4 py-2 rounded-md hover:bg-dijle-light-blue transition-colors duration-200"
        >
          {type === "update" ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
};

export default VehicleMaintenanceForm; 