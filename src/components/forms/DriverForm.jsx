"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { driverSchema } from "@/lib/validations/driver";
import InputField from "../InputField";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { z } from "zod";

const DriverForm = ({ type, data, setOpen }) => {
  const router = useRouter();

  const schema = z.object({
    name: z.string().min(1, "Name is required"),
    surname: z.string().min(1, "Surname is required"),
    nickName: z.string().min(1, "Nick name is required"),
    phoneNumber: z.string().optional().nullable(),
    birthday: z.string().optional().nullable(),
    alphaPassNumber: z.string().optional().nullable(),
    alphaPassExpireDate: z.string().optional().nullable(),
    driverLicenseExpireDate: z.string().optional().nullable(),
    tachographExpireDate: z.string().optional().nullable(),
    adr: z.enum(["YES", "NO"]),
    adrExpireDate: z.string().optional().nullable(),
    cargoCard: z.enum(["YES", "NO", null]).nullable(),
    cargoCardNumber: z.string().optional().nullable(),
    cargoCardExpireDate: z.string().optional().nullable(),
  });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
    setValue,
  } = useForm({
    resolver: zodResolver(driverSchema),
    values: {
      name: data?.name || "",
      surname: data?.surname || "",
      nickName: data?.nickName || "",
      birthday: data?.birthday ? new Date(data.birthday).toISOString().split('T')[0] : "",
      phoneNumber: data?.phoneNumber || "",
      alphaPassNumber: data?.alphaPassNumber || "",
      alphaPassExpireDate: data?.alphaPassExpireDate ? new Date(data.alphaPassExpireDate).toISOString().split('T')[0] : "",
      driverLicenseExpireDate: data?.driverLicenseExpireDate ? new Date(data.driverLicenseExpireDate).toISOString().split('T')[0] : "",
      tachographExpireDate: data?.tachographExpireDate ? new Date(data.tachographExpireDate).toISOString().split('T')[0] : "",
      adr: data?.adr || "NO",
      adrExpireDate: data?.adrExpireDate ? new Date(data.adrExpireDate).toISOString().split('T')[0] : "",
      cargoCard: data?.cargoCard || "NO",
      cargoCardNumber: data?.cargoCardNumber || "",
      cargoCardExpireDate: data?.cargoCardExpireDate ? new Date(data.cargoCardExpireDate).toISOString().split('T')[0] : "",
    },
  });

  const cargoCardValue = watch("cargoCard");
  const adrValue = watch("adr");

  useEffect(() => {
    if (cargoCardValue === "NO") {
      setValue("cargoCardNumber", "");
      setValue("cargoCardExpireDate", "");
    }
    
    if (adrValue === "NO") {
      setValue("adrExpireDate", "");
    }
  }, [cargoCardValue, adrValue, setValue]);

  const onSubmit = async (formData) => {
    try {
      const capitalizedData = {
        ...formData,
        name: formData.name.charAt(0).toUpperCase() + formData.name.slice(1).toLowerCase(),
        surname: formData.surname.charAt(0).toUpperCase() + formData.surname.slice(1).toLowerCase()
      };

      console.log("Form data with nickName:", {
        ...capitalizedData,
        nickName: capitalizedData.nickName
      });

      if (!capitalizedData.nickName) {
        toast.error("Nick name is required!");
        return;
      }

      const res = await fetch(`/api/drivers${type === "update" ? `/${data.id}` : ""}`, {
        method: type === "update" ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(capitalizedData),
      });

      const responseData = await res.json();
      console.log("API Response:", responseData);

      if (!res.ok) {
        throw new Error(responseData.error || "Something went wrong");
      }

      router.refresh();
      setOpen(false);
      toast.success(
        type === "update" ? "Driver updated successfully!" : "Driver created successfully!"
      );
    } catch (error) {
      console.error("Error in form submission:", error);
      toast.error(error.message || "Something went wrong!");
    }
  };

  const handleCancel = () => {
    setOpen(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center w-full max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-8 text-center w-full">
        {type === "update" ? "Update Driver" : "Create Driver"}
      </h1>

      <div className="flex flex-wrap justify-center gap-6 w-full">
        <InputField
          label="Name *"
          type="text"
          register={register}
          name="name"
          error={errors.name}
        />

        <InputField
          label="Surname *"
          type="text"
          register={register}
          name="surname"
          error={errors.surname}
        />

        <InputField
          label="Nick Name *"
          type="text"
          register={register}
          name="nickName"
          error={errors.nickName}
        />

        <InputField
          label="Birthday"
          type="date"
          register={register}
          name="birthday"
          error={errors.birthday}
        />

        <InputField
          label="Phone Number"
          type="tel"
          register={register}
          name="phoneNumber"
          error={errors.phoneNumber}
        />

        <InputField
          label="Alpha Pass Number"
          type="text"
          register={register}
          name="alphaPassNumber"
          error={errors.alphaPassNumber}
        />

        <InputField
          label="Alpha Pass Expire Date"
          type="date"
          register={register}
          name="alphaPassExpireDate"
          error={errors.alphaPassExpireDate}
        />

        <InputField
          label="Driver License Expire Date"
          type="date"
          register={register}
          name="driverLicenseExpireDate"
          error={errors.driverLicenseExpireDate}
        />

        <InputField
          label="Tachograph Expire Date"
          type="date"
          register={register}
          name="tachographExpireDate"
          error={errors.tachographExpireDate}
        />

        <div className="flex flex-col gap-2 w-full md:w-[calc(33.33%-1rem)]">
          <label className="text-xs text-gray-500">ADR *</label>
          <select
            {...register("adr")}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm text-gray-900"
          >
            <option value="NO">NO</option>
            <option value="YES">YES</option>
          </select>
          {errors.adr && (
            <p className="text-red-600 text-xs">{errors.adr.message}</p>
          )}
        </div>

        {adrValue === "YES" && (
          <InputField
            label="ADR Expire Date"
            type="date"
            register={register}
            name="adrExpireDate"
            error={errors.adrExpireDate}
          />
        )}

        <div className="flex flex-col gap-2 w-full md:w-[calc(33.33%-1rem)]">
          <label className="text-xs text-gray-500">Cargo Card *</label>
          <select
            {...register("cargoCard")}
            className="ring-[1.5px] ring-gray-300 p-2 rounded-md text-sm text-gray-900"
          >
            <option value="NO">NO</option>
            <option value="YES">YES</option>
          </select>
          {errors.cargoCard && (
            <p className="text-red-600 text-xs">{errors.cargoCard.message}</p>
          )}
        </div>

        <InputField
          label="Cargo Card Number"
          type="text"
          register={register}
          name="cargoCardNumber"
          error={errors.cargoCardNumber}
          inputProps={{ 
            disabled: cargoCardValue === "NO" 
          }}
        />

        {cargoCardValue === "YES" && (
          <InputField
            label="Cargo Card Expire Date"
            type="date"
            register={register}
            name="cargoCardExpireDate"
            error={errors.cargoCardExpireDate}
          />
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

export default DriverForm;