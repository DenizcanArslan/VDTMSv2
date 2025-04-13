"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { transportLicenseSchema, transportLicenseUpdateSchema } from "@/lib/validations/transportLicense";
import InputField from "../InputField";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

const TransportLicenseForm = ({ type, data, setOpen }) => {
  const router = useRouter();
  const [trucks, setTrucks] = useState([]);
  const [loading, setLoading] = useState(true);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(
      type === "update" ? transportLicenseUpdateSchema : transportLicenseSchema
    ),
    values: type === "update" 
      ? {
          licenseNumber: data?.licenseNumber || "",
          truckId: data?.truckId?.toString() || "",
        }
      : undefined
  });

  // Truck'ları yükle
  useEffect(() => {
    const fetchTrucks = async () => {
      try {
        const res = await fetch('/api/trucks');
        if (!res.ok) throw new Error('Failed to fetch trucks');
        const allTrucks = await res.json();

        console.log("All trucks:", allTrucks); // Debug için

        // Lisansı olmayan ve aktif olan truck'ları filtrele
        // Eğer update modundaysa, mevcut truck'ı da listeye ekle
        const availableTrucks = allTrucks.filter(truck => {
          const isActive = truck.isActive;
          // Truck'ın transportLicense ilişkisi varsa ve aktifse, bu truck zaten atanmış demektir
          const hasNoLicense = !truck.transportLicense || truck.transportLicense.isActive === false;
          const isCurrentTruck = type === "update" && truck.id === data?.truckId;
          
          console.log("Truck filter debug:", {
            licensePlate: truck.licensePlate,
            isActive,
            hasNoLicense,
            isCurrentTruck,
            transportLicense: truck.transportLicense
          });
          
          return isActive && (hasNoLicense || isCurrentTruck);
        });

        console.log("Available trucks:", availableTrucks); // Debug için
        setTrucks(availableTrucks);
      } catch (error) {
        console.error('Error fetching trucks:', error);
        toast.error('Failed to load trucks');
      } finally {
        setLoading(false);
      }
    };

    fetchTrucks();
  }, [type, data?.truckId]);

  const onSubmit = async (formData) => {
    try {
      console.log("Form data before processing:", formData);
      // truckId'yi number'a çevir veya null yap
      const processedData = {
        ...formData,
        truckId: formData.truckId ? parseInt(formData.truckId) : null
      };
      console.log("Processed data:", processedData);

      const res = await fetch(
        `/api/transport-licenses${type === "update" ? `/${data.id}` : ""}`,
        {
          method: type === "update" ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(processedData),
        }
      );

      const responseData = await res.json();
      console.log("API Response:", responseData);

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Something went wrong");
      }

      router.refresh();
      setOpen(false);
      toast.success(
        type === "update" 
          ? "Transport license updated successfully!" 
          : "Transport license created successfully!"
      );
    } catch (error) {
      console.error("Error:", error);
      toast.error(error.message);
    }
  };

  if (loading) {
    return <div>Loading trucks...</div>;
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center w-full max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-8 text-center w-full">
        {type === "update" ? "Update Transport License" : "Create Transport License"}
      </h1>

      <div className="flex flex-wrap justify-center gap-6 w-full">
        <InputField
          label="License Number *"
          type="text"
          register={register}
          name="licenseNumber"
          error={errors.licenseNumber}
        />

        <div className="flex flex-col gap-2 w-full md:w-[calc(33.33%-1rem)]">
          <label className="text-xs text-gray-500">Assign to Truck</label>
          <select
            {...register("truckId")}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm text-gray-900"
          >
            <option value="">Select a truck</option>
            {trucks.map((truck) => (
              <option key={truck.id} value={truck.id}>
                {truck.licensePlate} {truck.nickName ? `(${truck.nickName})` : ''}
              </option>
            ))}
          </select>
          {errors.truckId && (
            <p className="text-red-600 text-xs">{errors.truckId.message}</p>
          )}
        </div>
      </div>

      <p className="text-xs text-gray-500 mt-6 text-center">* Required fields</p>

      <div className="flex gap-4 mt-8">
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="bg-red-500 text-white px-8 py-3 rounded-md hover:bg-red-600 transition-colors duration-200"
        >
          Cancel
        </button>
        <button
          type="submit"
          className="bg-dijle-dark-blue text-white px-8 py-3 rounded-md hover:bg-dijle-light-blue transition-colors duration-200"
        >
          {type === "update" ? "Update" : "Create"}
        </button>
      </div>
    </form>
  );
};

export default TransportLicenseForm; 