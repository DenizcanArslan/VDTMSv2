"use client";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { frequentLocationSchema } from "@/lib/validations/frequentLocation";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { EUROPEAN_COUNTRIES } from "@/lib/constants/countries";

const FrequentLocationForm = ({ type, data, setOpen }) => {
  const router = useRouter();
  const [countrySearch, setCountrySearch] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);

  const filteredCountries = EUROPEAN_COUNTRIES.filter(country =>
    country.name.toLowerCase().includes(countrySearch.toLowerCase())
  );

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(frequentLocationSchema),
    defaultValues: {
      name: data?.name || "",
      country: data?.country || "",
      postalCode: data?.postalCode || "",
      km: data?.km?.toString() || "",
    }
  });

  const onSubmit = async (formData) => {
    try {
      const res = await fetch(`/api/frequent-locations${type === "update" ? `/${data.id}` : ""}`, {
        method: type === "update" ? "PUT" : "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData),
      });

      const responseData = await res.json();

      if (!res.ok) {
        throw new Error(responseData.error || "Something went wrong");
      }

      router.refresh();
      setOpen(false);
      toast.success(
        type === "update" ? "Location updated successfully!" : "Location created successfully!"
      );
    } catch (error) {
      console.error("Error in form submission:", error);
      toast.error(error.message || "Something went wrong!");
    }
  };

  const handleCancel = () => {
    setOpen(false);
  };

  const inputClassName = "mt-1 block w-full px-3 py-2 text-sm text-black rounded-md border border-gray-400 bg-white shadow-sm focus:border-dijle-dark-blue focus:ring-1 focus:ring-dijle-dark-blue disabled:cursor-not-allowed disabled:bg-gray-50";

  const handleCountrySelect = (countryName) => {
    setValue("country", countryName);
    setCountrySearch(countryName);
    setShowDropdown(false);
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center w-full max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-8 text-center w-full">
        {type === "update" ? "Update Location" : "Create Location"}
      </h1>

      <div className="flex flex-wrap justify-center gap-6 w-full">
        <div className="w-[calc(50%-12px)]">
          <label className="block text-sm font-medium text-gray-700">Name *</label>
          <input
            type="text"
            {...register("name")}
            className={inputClassName}
          />
          {errors.name && (
            <p className="mt-1 text-sm text-red-600">{errors.name.message}</p>
          )}
        </div>

        <div className="w-[calc(50%-12px)]">
          <label className="block text-sm font-medium text-gray-700">Country *</label>
          <input
            type="text"
            {...register("country")}
            value={countrySearch}
            onChange={(e) => {
              setCountrySearch(e.target.value);
              setValue("country", e.target.value);
              setShowDropdown(true);
            }}
            onFocus={() => setShowDropdown(true)}
            className={inputClassName}
          />
          {showDropdown && countrySearch && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-md shadow-lg max-h-60 overflow-auto">
              {filteredCountries.map((country) => (
                <div
                  key={country.code}
                  className="px-4 py-2 hover:bg-gray-100 cursor-pointer text-gray-900"
                  onClick={() => handleCountrySelect(country.name)}
                >
                  {country.name} ({country.code})
                </div>
              ))}
              {filteredCountries.length === 0 && (
                <div className="px-4 py-2 text-gray-500">No matches found</div>
              )}
            </div>
          )}
          {errors.country && (
            <p className="mt-1 text-sm text-red-600">{errors.country.message}</p>
          )}
        </div>

        <div className="w-[calc(50%-12px)]">
          <label className="block text-sm font-medium text-gray-700">Postal Code</label>
          <input
            type="text"
            {...register("postalCode")}
            className={inputClassName}
          />
          {errors.postalCode && (
            <p className="mt-1 text-sm text-red-600">{errors.postalCode.message}</p>
          )}
        </div>

        <div className="w-[calc(50%-12px)]">
          <label className="block text-sm font-medium text-gray-700">KM *</label>
          <input
            type="number"
            {...register("km")}
            className={inputClassName}
          />
          {errors.km && (
            <p className="mt-1 text-sm text-red-600">{errors.km.message}</p>
          )}
        </div>
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

export default FrequentLocationForm; 