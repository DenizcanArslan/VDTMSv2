"use client";
import { useForm } from "react-hook-form";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { trailerSchema } from "@/lib/validations/trailer";

const TrailerForm = ({ type = "create", data, id, setOpen }) => {
  const router = useRouter();

  const defaultValues = type === "update" && data ? {
    licensePlate: data.licensePlate,
    nickName: data.nickName,
    model: data.model || "",
    modelYear: data.modelYear?.toString() || "",
    chasisNumber: data.chasisNumber || "",
    genset: data.genset || "NO",
    insuranceExpireDate: data?.insuranceExpireDate 
      ? new Date(data.insuranceExpireDate).toISOString().split('T')[0] 
      : "",
  } : {};

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(trailerSchema),
    defaultValues,
  });

  const onSubmit = async (formData) => {
    try {
      const url = type === "create" 
        ? "/api/trailers" 
        : `/api/trailers/${id}`;
      
      const method = type === "create" ? "POST" : "PUT";

      console.log("Submitting form data:", formData);
      console.log("Request URL:", url);
      console.log("Request method:", method);

      const res = await fetch(url, {
        method: method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const responseData = await res.json();
      console.log("Response data:", responseData);

      if (!res.ok) {
        throw new Error(responseData.error || "Something went wrong");
      }

      toast.success(
        type === "create"
          ? "Trailer created successfully!"
          : "Trailer updated successfully!"
      );
      
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Form submission error:", error);
      toast.error(error.message);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
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
        {errors.model && (
          <p className="text-red-500 text-sm">{errors.model.message}</p>
        )}
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
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          GENSET
        </label>
        <select
          {...register("genset")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
        >
          <option value="NO">NO</option>
          <option value="YES">YES</option>
        </select>
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

      <button
        type="submit"
        className="w-full rounded-md bg-dijle-dark-blue px-3 py-2 text-white"
      >
        {type === "create" ? "Create Trailer" : "Update Trailer"}
      </button>
    </form>
  );
};

export default TrailerForm;
