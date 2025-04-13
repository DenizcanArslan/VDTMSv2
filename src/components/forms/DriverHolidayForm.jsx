"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { driverHolidaySchema } from "@/lib/validations/driverHoliday";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

const HOLIDAY_REASONS = {
  ANNUAL_LEAVE: "Annual Leave",
  SICK_LEAVE: "Sick Leave",
  UNPAID_LEAVE: "Unpaid Leave",
  BEREAVEMENT_LEAVE: "Bereavement Leave",
  MARRIAGE_LEAVE: "Marriage Leave",
  OTHER: "Other",
};

const DriverHolidayForm = ({ type = "create", data, setOpen, onSuccess }) => {
  const router = useRouter();
  const [drivers, setDrivers] = useState([]);
  const [showNotes, setShowNotes] = useState(type === "update" ? data?.reason === "OTHER" : false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(driverHolidaySchema),
    defaultValues: type === "update" ? {
      startDate: data?.startDate ? new Date(data.startDate).toISOString().split('T')[0] : "",
      endDate: data?.endDate ? new Date(data.endDate).toISOString().split('T')[0] : "",
      reason: data?.reason || "",
      notes: data?.notes || "",
      driverId: data?.driverId?.toString() || "",
    } : {
      startDate: "",
      endDate: "",
      reason: "",
      notes: "",
      driverId: "",
    }
  });

  const selectedReason = watch("reason");
  const startDate = watch("startDate");
  const endDate = watch("endDate");

  useEffect(() => {
    setShowNotes(selectedReason === "OTHER");
  }, [selectedReason]);

  useEffect(() => {
    const fetchDrivers = async () => {
      try {
        const res = await fetch('/api/drivers');
        const driversData = await res.json();
        setDrivers(driversData);
      } catch (error) {
        console.error('Error fetching drivers:', error);
        toast.error('Error loading drivers');
      }
    };

    fetchDrivers();
  }, []);

  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (end < start) {
        setValue("endDate", "");
      }
    }
  }, [startDate, setValue]);

  useEffect(() => {
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (start > end) {
        setValue("startDate", "");
      }
    }
  }, [endDate, setValue]);

  const onSubmit = async (formData) => {
    console.log("Form Data:", formData);
    try {
      if (!formData.startDate || !formData.endDate || !formData.reason || !formData.driverId) {
        throw new Error("Please fill in all required fields");
      }

      const apiData = {
        ...formData,
        notes: formData.notes || null,
        driverId: parseInt(formData.driverId)
      };

      console.log("Sending API data:", apiData);

      const res = await fetch(
        `/api/driver-holidays${type === "update" ? `/${data?.id}` : ""}`,
        {
          method: type === "update" ? "PUT" : "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(apiData),
        }
      );

      console.log("Response:", await res.clone().text());
      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || "Something went wrong");
      }

      const event = new CustomEvent('holidayUpdated');
      window.dispatchEvent(event);
      setOpen(false);
      onSuccess?.();
      toast.success(
        type === "update" 
          ? "Holiday updated successfully!" 
          : "Holiday created successfully!"
      );
    } catch (error) {
      console.error("Detailed error:", error);
      toast.error(error.message || "An error occurred while saving the holiday");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700">
          Driver
        </label>
        <select
          {...register("driverId")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
          disabled={type === "update"}
        >
          <option value="">Select a driver</option>
          {drivers.map(driver => (
            <option key={driver.id} value={driver.id}>
              {driver.name} {driver.surname} ({driver.nickName})
            </option>
          ))}
        </select>
        {errors.driverId && (
          <p className="text-red-500 text-sm">{errors.driverId.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Start Date
        </label>
        <input
          type="date"
          {...register("startDate")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
        />
        {errors.startDate && (
          <p className="text-red-500 text-sm">{errors.startDate.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          End Date
        </label>
        <input
          type="date"
          {...register("endDate")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
        />
        {errors.endDate && (
          <p className="text-red-500 text-sm">{errors.endDate.message}</p>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700">
          Reason
        </label>
        <select
          {...register("reason")}
          className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
        >
          <option value="">Please select a holiday reason</option>
          {Object.entries(HOLIDAY_REASONS).map(([value, label]) => (
            <option key={value} value={value}>
              {label}
            </option>
          ))}
        </select>
        {errors.reason && (
          <p className="text-red-500 text-sm">{errors.reason.message}</p>
        )}
      </div>

      {showNotes && (
        <div>
          <label className="block text-sm font-medium text-gray-700">
            Notes
          </label>
          <textarea
            {...register("notes")}
            rows={3}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-black"
            placeholder="Please provide details for the holiday reason"
          />
          {errors.notes && (
            <p className="text-red-500 text-sm">{errors.notes.message}</p>
          )}
        </div>
      )}

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

export default DriverHolidayForm; 