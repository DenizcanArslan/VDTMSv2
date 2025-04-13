"use client";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { clientSchema } from "@/lib/validations/client";
import InputField from "../InputField";
import { toast } from "react-toastify";
import { useRouter } from "next/navigation";

const ClientForm = ({ type, data, setOpen }) => {
  const router = useRouter();
  
  const {
    register,
    control,
    handleSubmit,
    formState: { errors },
  } = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      name: data?.name || "",
      address: data?.address || "",
      vatNumber: data?.vatNumber || "",
      emergencyContacts: data?.emergencyContacts?.length > 0 
        ? data.emergencyContacts.map(contact => ({
            name: contact.name || "",
            phoneNumber: contact.phoneNumber || ""
          }))
        : [{ name: "", phoneNumber: "" }],
      invoiceMails: data?.invoiceMails?.length > 0
        ? data.invoiceMails.map(mail => ({
            email: mail.email || ""
          }))
        : [{ email: "" }]
    }
  });

  const { fields: emergencyFields, append: appendEmergency, remove: removeEmergency } = useFieldArray({
    control,
    name: "emergencyContacts"
  });

  const { fields: mailFields, append: appendMail, remove: removeMail } = useFieldArray({
    control,
    name: "invoiceMails"
  });

  const handleCancel = () => {
    setOpen(false);
  };

  const onSubmit = async (formData) => {
    try {
      const url = type === "create" 
        ? "/api/clients" 
        : `/api/clients/${data.id}`;

      const response = await fetch(url, {
        method: type === "create" ? "POST" : "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(formData)
      });

      const responseData = await response.json();

      if (!response.ok) {
        if (responseData.error === "A client with this name already exists") {
          toast.error("Bu isimde bir müşteri zaten mevcut!");
          return;
        }
        throw new Error("İşlem başarısız");
      }

      toast.success(
        type === "create"
          ? "Client başarıyla oluşturuldu!"
          : "Client başarıyla güncellendi!"
      );
      
      setOpen(false);
      router.refresh();
    } catch (error) {
      console.error("Error:", error);
      toast.error("Bir hata oluştu!");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col items-center w-full max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-8 text-center w-full">
        {type === "update" ? "Update Client" : "Create Client"}
      </h1>

      <div className="flex flex-wrap justify-center gap-6 w-full">
        <InputField
          label="Name *"
          register={register}
          name="name"
          error={errors.name}
        />

        <InputField
          label="Address"
          register={register}
          name="address"
          placeholder="Enter full address"
          error={errors.address}
        />

        <InputField
          label="VAT Number"
          register={register}
          name="vatNumber"
          placeholder="Enter VAT number"
          error={errors.vatNumber}
        />

        {/* Emergency Contacts */}
        <div className="flex flex-col gap-2 w-full">
          <label className="text-md text-black ">Emergency Contacts</label>
          {emergencyFields.map((field, index) => (
            <div key={field.id} className="flex gap-4">
              <InputField
                register={register}
                name={`emergencyContacts.${index}.name`}
                placeholder="Contact Person Name"
                label="Contact Name"
                error={errors?.emergencyContacts?.[index]?.name}
                className="flex-1"
              />
              <InputField
                register={register}
                name={`emergencyContacts.${index}.phoneNumber`}
                placeholder="+90 XXX XXX XX XX"
                label="Phone Number"
                error={errors?.emergencyContacts?.[index]?.phoneNumber}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => removeEmergency(index)}
                className="px-4 bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-200 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => appendEmergency({ name: "", phoneNumber: "" })}
            className="mt-2 px-4 py-2 bg-dijle-dark-blue text-white rounded hover:bg-dijle-light-blue transition-colors duration-200"
          >
            Add Emergency Contact
          </button>
        </div>

        {/* Invoice Mails */}
        <div className="flex flex-col gap-2 w-full">
          <label className="text-md text-black">Invoice Emails</label>
          {mailFields.map((field, index) => (
            <div key={field.id} className="flex gap-4">
              <InputField
                register={register}
                name={`invoiceMails.${index}.email`}
                placeholder="example@company.com"
                label="Email Address"
                error={errors?.invoiceMails?.[index]?.email}
                className="flex-1"
              />
              <button
                type="button"
                onClick={() => removeMail(index)}
                className="px-4   bg-red-500 text-white rounded hover:bg-red-600 transition-colors duration-200 text-sm"
              >
                Remove
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => appendMail({ email: "" })}
            className="mt-2 px-4 py-2 bg-dijle-dark-blue text-white rounded hover:bg-dijle-light-blue transition-colors duration-200"
          >
            Add Invoice Email
          </button>
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

export default ClientForm;
