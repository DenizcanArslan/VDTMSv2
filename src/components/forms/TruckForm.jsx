"use client";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { truckSchema } from "@/lib/validations/truck";

const TruckForm = ({ type, data, setOpen }) => {
  const router = useRouter();
  
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(truckSchema),
    defaultValues: type === "update" ? {
      licensePlate: data?.licensePlate || "",
      nickName: data?.nickName || "",
      model: data?.model || "",
      modelYear: data?.modelYear?.toString() || "",
      chasisNumber: data?.chasisNumber || "",
      genset: data?.genset || "NO",
      insuranceExpireDate: data?.insuranceExpireDate 
        ? new Date(data.insuranceExpireDate).toISOString().split('T')[0] 
        : "",
    } : {}
  });

  const handleCancel = () => {
    setOpen(false);
  };

  const onSubmit = async (formData) => {
    try {
      const res = await fetch(`/api/trucks${type === "update" ? `/${data.id}` : ""}`, {
        method: type === "update" ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error);
      }

      router.refresh();
      setOpen(false);
      toast.success(
        type === "update" ? "Truck updated successfully!" : "Truck created successfully!"
      );
    } catch (error) {
      toast.error(error.message || "Bir hata oluştu");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="p-4">
      <h2 className="text-2xl font-bold mb-4">
        {type === "create" ? "Create New Truck" : "Update Truck"}
      </h2>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">
            License Plate
          </label>
          <input
            {...register("licensePlate", { required: "License plate is required" })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
          />
          {errors.licensePlate && (
            <p className="text-red-500 text-sm">{errors.licensePlate.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Nick Name
          </label>
          <input
            {...register("nickName", { required: "Nick name is required" })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
          />
          {errors.nickName && (
            <p className="text-red-500 text-sm">{errors.nickName.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Model
          </label>
          <input
            {...register("model")}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Model Year
          </label>
          <input
            type="number"
            {...register("modelYear")}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
          />
          {errors.modelYear && (
            <p className="text-red-500 text-sm">{errors.modelYear.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Chasis Number
          </label>
          <input
            {...register("chasisNumber")}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
          />
          {errors.chasisNumber && (
            <p className="text-red-500 text-sm">{errors.chasisNumber.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Genset
          </label>
          <select
            {...register("genset")}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
          >
            <option value="NO">NO</option>
            <option value="YES">YES</option>
          </select>
          {errors.genset && (
            <p className="text-red-500 text-sm">{errors.genset.message}</p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">
            Insurance Expire Date
          </label>
          <input
            type="date"
            {...register("insuranceExpireDate")}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
          />
          {errors.insuranceExpireDate && (
            <p className="text-red-500 text-sm">{errors.insuranceExpireDate.message}</p>
          )}
        </div>

        <div className="flex gap-4 mt-8 justify-end">
          <button
            type="button"
            onClick={handleCancel}
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
      </div>
    </form>
  );
};

export default TruckForm;
