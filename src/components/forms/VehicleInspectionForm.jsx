"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { vehicleInspectionSchema } from "@/lib/validations/vehicleInspection";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const VehicleInspectionForm = ({ type = "create", data, setOpen, onSubmit }) => {
  const router = useRouter();
  const [trucks, setTrucks] = useState([]);
  const [trailers, setTrailers] = useState([]);
  const [selectedVehicleType, setSelectedVehicleType] = useState(type === "update" ? (data?.truck ? "truck" : "trailer") : "truck");

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(vehicleInspectionSchema),
    defaultValues: type === "update" ? {
      inspectionDate: data?.inspectionDate ? new Date(data.inspectionDate).toISOString().split('T')[0] : "",
      notes: data?.notes || "",
      cost: data?.cost?.toString() || "",
      vehicleType: data.vehicleType,
      vehicleId: data.vehicleId,
    } : {
      vehicleType: "truck",
      vehicleId: ""
    }
  });

  const vehicleType = watch("vehicleType");

  // Vehicle type değiştiğinde vehicle ID'yi sıfırla
  useEffect(() => {
    if (type === "create") {
      setValue("vehicleId", "");
    }
  }, [vehicleType, setValue, type]);

  // Araçları yükle
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
        
        // Update modunda ve veriler yüklendiğinde vehicleId'yi tekrar set et
        if (type === "update" && data.vehicleId) {
          setValue("vehicleId", data.vehicleId);
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
      onSubmit();  // Form submit başlamadan önce çağır
    }

    try {
      const res = await fetch(
        `/api/vehicle-inspections${type === "update" ? `/${data.id}` : ""}`,
        {
          method: type === "update" ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(formData),
        }
      );

      if (res.ok) {
        router.refresh();  // Başarılı olduğunda router.refresh() çağır
        setOpen(false);
        toast.success(`Inspection ${type === "create" ? "created" : "updated"} successfully`);
        onSubmit?.();  // Bir kez daha çağır
        window.dispatchEvent(new Event('inspectionUpdated'));
      }
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onFormSubmit)} className="space-y-4">
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
                  {truck.licensePlate} ({truck.nickName})
                </option>
              ))
            : trailers.map(trailer => (
                <option key={trailer.id} value={trailer.id}>
                  {trailer.licensePlate} ({trailer.nickName})
                </option>
              ))
          }
        </select>
        {errors.vehicleId && (
          <p className="text-red-500 text-sm">{errors.vehicleId.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Inspection Date
        </label>
        <input
          type="date"
          {...register("inspectionDate")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
        />
        {errors.inspectionDate && (
          <p className="text-red-500 text-sm">{errors.inspectionDate.message}</p>
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

export default VehicleInspectionForm; 