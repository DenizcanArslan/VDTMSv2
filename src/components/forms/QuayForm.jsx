"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { quaySchema } from "@/lib/validations/quay";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

const QuayForm = ({ type, data, setOpen }) => {
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    trigger,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(quaySchema),
    defaultValues: {
      name: data?.name || "",
      quayNumber: data?.quayNumber || "",
      isLoRo: data?.isLoRo || "",
      address: data?.address || "",
      terminalFee: data?.terminalFee?.toString() || "",
      workingHoursStart: data?.workingHoursStart || "",
      workingHoursEnd: data?.workingHoursEnd || "",
      defaultTar: data?.defaultTar || "",
      tarType: data?.tarType || "NONE",
      tarPositiveColor: data?.tarPositiveColor || "GREEN",
      tarNegativeColor: data?.tarNegativeColor || "RED",
      status: "ACTIVE",
    }
  });

  const tarTypeValue = watch("tarType");

  useEffect(() => {
    if (tarTypeValue === "NONE") {
      setValue("defaultTar", "");
      setValue("tarPositiveColor", "GREEN");
      setValue("tarNegativeColor", "RED");
      trigger("defaultTar");
    }
  }, [tarTypeValue, setValue, trigger]);

  const onSubmit = async (formData) => {
    if (formData.tarType !== "NONE" && (!formData.defaultTar || formData.defaultTar.trim() === "")) {
      toast.error("Default TAR is required when TAR Type is selected");
      return;
    }

    const cleanedData = Object.fromEntries(
      Object.entries(formData).map(([key, value]) => [
        key,
        value === "" ? null : value
      ])
    );

    if (cleanedData.tarType === "NONE") {
      cleanedData.defaultTar = null;
      cleanedData.tarPositiveColor = null;
      cleanedData.tarNegativeColor = null;
    }

    try {
      const res = await fetch(`/api/quays${type === "update" ? `/${data.id}` : ""}`, {
        method: type === "update" ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(cleanedData),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || "Something went wrong");
      }

      router.refresh();
      reset();
      setOpen(false);
      toast.success(
        type === "update" ? "Quay updated successfully!" : "Quay created successfully!"
      );
    } catch (error) {
      console.error("Error in form submission:", error);
      toast.error(error.message || "Something went wrong!");
    }
  };

  const handleCancel = () => {
    reset();
    setOpen(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center w-full max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-8 text-center w-full">
        {type === "update" ? "Update Quay" : "Create Quay"}
      </h1>

      <div className="flex flex-wrap justify-center gap-6 w-full">
        <div className="w-[calc(50%-12px)]">
          <label className="block text-sm font-medium text-gray-700">Name *</label>
          <input
            type="text"
            {...register("name")}
            className="mt-1 block w-full px-3 py-2 text-sm text-gray-900
rounded-md border border-gray-400 
bg-white shadow-sm
focus:border-dijle-dark-blue focus:ring-1 focus:ring-dijle-dark-blue
disabled:cursor-not-allowed disabled:bg-gray-50"
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div className="w-[calc(50%-12px)]">
          <label className="block text-sm font-medium text-gray-700">Quay Number</label>
          <input
            type="text"
            {...register("quayNumber")}
            className="mt-1 block w-full px-3 py-2 text-sm text-gray-900
rounded-md border border-gray-400 
bg-white shadow-sm
focus:border-dijle-dark-blue focus:ring-1 focus:ring-dijle-dark-blue
disabled:cursor-not-allowed disabled:bg-gray-50"
          />
          {errors.quayNumber && (
            <p className="mt-1 text-sm text-red-600">{errors.quayNumber.message}</p>
          )}
        </div>

        <div className="w-[calc(50%-12px)]">
          <label className="block text-sm font-medium text-gray-700">Lo/Ro *</label>
          <select
            {...register("isLoRo")}
            className="mt-1 block w-full px-3 py-2 text-sm
rounded-md border border-gray-400 text-gray-900
bg-white shadow-sm
focus:border-dijle-dark-blue focus:ring-1 focus:ring-dijle-dark-blue
disabled:cursor-not-allowed disabled:bg-gray-50"
          >
            <option value="">Select Lo/Ro</option>
            <option value="LO">LO</option>
            <option value="RO">RO</option>
          </select>
          {errors.isLoRo && (
            <p className="mt-1 text-sm text-red-600">{errors.isLoRo.message}</p>
          )}
        </div>

        <div className="w-[calc(50%-12px)]">
          <label className="block text-sm font-medium text-gray-700">Address</label>
          <input
            type="text"
            {...register("address")}
            className="mt-1 block w-full px-3 py-2 text-sm text-gray-900
rounded-md border border-gray-400 
bg-white shadow-sm
focus:border-dijle-dark-blue focus:ring-1 focus:ring-dijle-dark-blue
disabled:cursor-not-allowed disabled:bg-gray-50"
          />
          {errors.address && (
            <p className="mt-1 text-sm text-red-600">{errors.address.message}</p>
          )}
        </div>

        <div className="w-[calc(50%-12px)]">
          <label className="block text-sm font-medium text-gray-700">Terminal Fee</label>
          <input
            type="text"
            {...register("terminalFee")}
            placeholder="e.g. 10.20"
            className="mt-1 block w-full px-3 py-2 text-sm text-gray-900
rounded-md border border-gray-400 
bg-white shadow-sm
focus:border-dijle-dark-blue focus:ring-1 focus:ring-dijle-dark-blue
disabled:cursor-not-allowed disabled:bg-gray-50"
          />
          {errors.terminalFee && (
            <p className="mt-1 text-sm text-red-600">{errors.terminalFee.message}</p>
          )}
        </div>

        <div className="w-[calc(50%-12px)]">
          <label className="block text-sm font-medium text-gray-700">Working Hours Start</label>
          <input
            type="time"
            {...register("workingHoursStart")}
            className="mt-1 block w-full px-3 py-2 text-sm text-gray-900
rounded-md border border-gray-400 
bg-white shadow-sm
focus:border-dijle-dark-blue focus:ring-1 focus:ring-dijle-dark-blue
disabled:cursor-not-allowed disabled:bg-gray-50"
          />
          {errors.workingHoursStart && (
            <p className="mt-1 text-sm text-red-600">{errors.workingHoursStart.message}</p>
          )}
        </div>

        <div className="w-[calc(50%-12px)]">
          <label className="block text-sm font-medium text-gray-700">Working Hours End</label>
          <input
            type="time"
            {...register("workingHoursEnd")}
            className="mt-1 block w-full px-3 py-2 text-sm text-gray-900
rounded-md border border-gray-400 
bg-white shadow-sm
focus:border-dijle-dark-blue focus:ring-1 focus:ring-dijle-dark-blue
disabled:cursor-not-allowed disabled:bg-gray-50"
          />
          {errors.workingHoursEnd && (
            <p className="mt-1 text-sm text-red-600">{errors.workingHoursEnd.message}</p>
          )}
        </div>

        <div className="w-[calc(50%-12px)]">
          <label className="block text-sm font-medium text-gray-700">
            Default TAR {tarTypeValue !== "NONE" && <span className="text-red-500">*</span>}
          </label>
          <input
            type="text"
            {...register("defaultTar", {
              required: tarTypeValue !== "NONE" ? "Default TAR is required when TAR Type is selected" : false
            })}
            placeholder="e.g., 913TARNOK"
            disabled={tarTypeValue === "NONE"}
            className="mt-1 block w-full px-3 py-2 text-sm text-gray-900
              rounded-md border border-gray-400 
              bg-white shadow-sm
              focus:border-dijle-dark-blue focus:ring-1 focus:ring-dijle-dark-blue
              disabled:cursor-not-allowed disabled:bg-gray-50"
          />
          {errors.defaultTar && (
            <p className="mt-1 text-sm text-red-600">{errors.defaultTar.message}</p>
          )}
        </div>

        <div className="w-[calc(50%-12px)]">
          <label className="block text-sm font-medium text-gray-700">TAR Type</label>
          <select
            {...register("tarType")}
            className="mt-1 block w-full px-3 py-2 text-sm
              rounded-md border border-gray-400 text-gray-900
              bg-white shadow-sm
              focus:border-dijle-dark-blue focus:ring-1 focus:ring-dijle-dark-blue
              disabled:cursor-not-allowed disabled:bg-gray-50"
          >
            <option value="NONE">No TAR Required</option>
            <option value="PICKUP">Only for Pick-up</option>
            <option value="DROPOFF">Only for Drop-off</option>
            <option value="BOTH">Both Pick-up and Drop-off</option>
          </select>
          {errors.tarType && (
            <p className="mt-1 text-sm text-red-600">{errors.tarType.message}</p>
          )}
        </div>

        {tarTypeValue !== "NONE" && (
          <>
            <div className="w-[calc(50%-12px)]">
              <label className="block text-sm font-medium text-gray-700">
                Positive Status Color
              </label>
              <select
                {...register("tarPositiveColor")}
                className="mt-1 block w-full px-3 py-2 text-sm
                  rounded-md border border-gray-400 text-gray-900
                  bg-white shadow-sm
                  focus:border-dijle-dark-blue focus:ring-1 focus:ring-dijle-dark-blue"
              >
                <option value="GREEN">Green</option>
                <option value="BLUE">Blue</option>
                <option value="PURPLE">Purple</option>
                <option value="TEAL">Teal</option>
              </select>
            </div>
            
            <div className="w-[calc(50%-12px)]">
              <label className="block text-sm font-medium text-gray-700">
                Negative Status Color
              </label>
              <select
                {...register("tarNegativeColor")}
                className="mt-1 block w-full px-3 py-2 text-sm
                  rounded-md border border-gray-400 text-gray-900
                  bg-white shadow-sm
                  focus:border-dijle-dark-blue focus:ring-1 focus:ring-dijle-dark-blue"
              >
                <option value="RED">Red</option>
                <option value="ORANGE">Orange</option>
                <option value="YELLOW">Yellow</option>
                <option value="GRAY">Gray</option>
              </select>
            </div>
          </>
        )}
      </div>

      <p className="text-xs text-gray-500 mt-6 text-center">* Required fields</p>

      <div className="flex gap-4 mt-8">
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
    </form>
  );
};

export default QuayForm; 