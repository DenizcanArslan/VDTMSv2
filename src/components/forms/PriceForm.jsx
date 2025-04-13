"use client";
import { useForm } from "react-hook-form";
import { Dialog, Combobox, Transition } from "@headlessui/react";
import { useEffect, useState, Fragment } from "react";
import { toast } from "react-toastify";
import { zodResolver } from "@hookform/resolvers/zod";
import { priceSchema } from "@/lib/validations/price";
import { HiCheck, HiChevronUpDown } from "react-icons/hi2";

export default function PriceForm({ isOpen, onClose, onSubmit, initialData }) {
  const [clients, setClients] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [totalPrice, setTotalPrice] = useState(0);
  const [isFixedPrice, setIsFixedPrice] = useState(false);
  const [clientQuery, setClientQuery] = useState('');
  const [locationQuery, setLocationQuery] = useState('');
  const [selectedClient, setSelectedClient] = useState(null);
  const [selectedLocation, setSelectedLocation] = useState(null);

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm({
    defaultValues: initialData ? {
      clientId: initialData.clientId.toString(),
      frequentLocationId: initialData.frequentLocationId.toString(),
      isFixedPrice: false,
      basePrice: initialData.basePrice,
      dieselSurcharge: initialData.dieselSurcharge,
      roadTax: initialData.roadTax,
      gensetPrice: initialData.gensetPrice,
    } : {
      clientId: "",
      frequentLocationId: "",
      isFixedPrice: false,
      basePrice: "",
      dieselSurcharge: "",
      roadTax: "",
      gensetPrice: "",
    },
    resolver: zodResolver(priceSchema),
  });

  // Watch form values for total calculation
  const basePrice = watch("basePrice") || 0;
  const dieselSurcharge = watch("dieselSurcharge") || 0;
  const roadTax = watch("roadTax") || 0;
  const gensetPrice = watch("gensetPrice") || 0;
  const watchIsFixedPrice = watch("isFixedPrice");

  // Filtrelenmiş müşteriler ve lokasyonlar
  const filteredClients = clientQuery === ''
    ? clients
    : clients.filter((client) => 
        client.name.toLowerCase().includes(clientQuery.toLowerCase())
      );

  const filteredLocations = locationQuery === ''
    ? locations
    : locations.filter((location) => 
        location.name.toLowerCase().includes(locationQuery.toLowerCase())
      );

  // Update isFixedPrice state when the checkbox changes
  useEffect(() => {
    setIsFixedPrice(watchIsFixedPrice);
    
    // Sabit fiyat değiştiğinde, değerleri sıfırla
    if (watchIsFixedPrice) {
      setValue("dieselSurcharge", null);
      setValue("roadTax", null);
    }
  }, [watchIsFixedPrice, setValue]);

  // Calculate total price
  useEffect(() => {
    const base = parseFloat(basePrice) || 0;
    const genset = parseFloat(gensetPrice) || 0;
    
    if (isFixedPrice) {
      const total = base + genset;
      setTotalPrice(total.toFixed(2));
    } else {
      const diesel = parseFloat(dieselSurcharge) || 0;
      const tax = parseFloat(roadTax) || 0;
      
      const total = base + diesel + tax + genset;
      setTotalPrice(total.toFixed(2));
    }
  }, [basePrice, dieselSurcharge, roadTax, gensetPrice, isFixedPrice]);

  useEffect(() => {
    // Client ve FrequentLocation verilerini getir
    const fetchData = async () => {
      try {
        const [clientsRes, locationsRes] = await Promise.all([
          fetch("/api/clients"),
          fetch("/api/frequent-locations"),
        ]);

        const [clientsData, locationsData] = await Promise.all([
          clientsRes.json(),
          locationsRes.json(),
        ]);

        setClients(clientsData);
        setLocations(locationsData);
      } catch (error) {
        toast.error("Failed to fetch form data");
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (initialData) {
      // Determine if it's a fixed price based on data
      const isFixed = initialData.dieselSurcharge === null && initialData.roadTax === null;
      
      reset({
        ...initialData,
        clientId: initialData.clientId.toString(),
        frequentLocationId: initialData.frequentLocationId.toString(),
        isFixedPrice: isFixed,
      });
      setIsFixedPrice(isFixed);
      
      // Seçili client ve location'ı ayarla
      const client = clients.find(c => c.id === initialData.clientId);
      const location = locations.find(l => l.id === initialData.frequentLocationId);
      setSelectedClient(client || null);
      setSelectedLocation(location || null);
    } else {
      reset({
        clientId: "",
        frequentLocationId: "",
        isFixedPrice: false,
        basePrice: "",
        dieselSurcharge: "",
        roadTax: "",
        gensetPrice: "",
      });
      setIsFixedPrice(false);
      setSelectedClient(null);
      setSelectedLocation(null);
    }
  }, [initialData, reset, isOpen, clients, locations]);

  const handleFormSubmit = async (data) => {
    setLoading(true);
    try {
      const response = await fetch(
        initialData ? `/api/prices/${initialData.id}` : "/api/prices",
        {
          method: initialData ? "PUT" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(data),
        }
      );

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || "Failed to save price");
      }

      toast.success(
        initialData ? "Price updated successfully" : "Price added successfully"
      );
      onSubmit();
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onClose={onClose} className="relative z-50">
      <div className="fixed inset-0 bg-black/30" aria-hidden="true" />
      <div className="fixed inset-0 flex items-center justify-center p-4">
        <Dialog.Panel className="mx-auto max-w-lg w-full bg-white rounded-xl p-6">
          <Dialog.Title className="text-lg font-medium mb-4">
            {initialData ? "Edit Price" : "Add New Price"}
          </Dialog.Title>

          <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-1">Client</label>
                <Combobox 
                  value={selectedClient} 
                  onChange={(client) => {
                    setSelectedClient(client);
                    setValue("clientId", client?.id.toString() || "");
                  }}
                >
                  <div className="relative">
                    <div className="relative w-full cursor-default overflow-hidden rounded border bg-white text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-300 sm:text-sm">
                      <Combobox.Input
                        className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                        displayValue={(client) => client?.name || ""}
                        onChange={(event) => setClientQuery(event.target.value)}
                        placeholder="Select Client"
                      />
                      <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <HiChevronUpDown
                          className="h-5 w-5 text-gray-400"
                          aria-hidden="true"
                        />
                      </Combobox.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                      afterLeave={() => setClientQuery('')}
                    >
                      <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                        {filteredClients.length === 0 && clientQuery !== '' ? (
                          <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                            Nothing found.
                          </div>
                        ) : (
                          filteredClients.map((client) => (
                            <Combobox.Option
                              key={client.id}
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                  active ? 'bg-blue-600 text-white' : 'text-gray-900'
                                }`
                              }
                              value={client}
                            >
                              {({ selected, active }) => (
                                <>
                                  <span
                                    className={`block truncate ${
                                      selected ? 'font-medium' : 'font-normal'
                                    }`}
                                  >
                                    {client.name}
                                  </span>
                                  {selected ? (
                                    <span
                                      className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                        active ? 'text-white' : 'text-blue-600'
                                      }`}
                                    >
                                      <HiCheck className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </Combobox.Option>
                          ))
                        )}
                      </Combobox.Options>
                    </Transition>
                  </div>
                </Combobox>
                <input type="hidden" {...register("clientId", { required: "Client is required" })} />
                {errors.clientId && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.clientId.message}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Location</label>
                <Combobox 
                  value={selectedLocation} 
                  onChange={(location) => {
                    setSelectedLocation(location);
                    setValue("frequentLocationId", location?.id.toString() || "");
                  }}
                >
                  <div className="relative">
                    <div className="relative w-full cursor-default overflow-hidden rounded border bg-white text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-opacity-75 focus-visible:ring-offset-2 focus-visible:ring-offset-blue-300 sm:text-sm">
                      <Combobox.Input
                        className="w-full border-none py-2 pl-3 pr-10 text-sm leading-5 text-gray-900 focus:ring-0"
                        displayValue={(location) => location?.name || ""}
                        onChange={(event) => setLocationQuery(event.target.value)}
                        placeholder="Select Location"
                      />
                      <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                        <HiChevronUpDown
                          className="h-5 w-5 text-gray-400"
                          aria-hidden="true"
                        />
                      </Combobox.Button>
                    </div>
                    <Transition
                      as={Fragment}
                      leave="transition ease-in duration-100"
                      leaveFrom="opacity-100"
                      leaveTo="opacity-0"
                      afterLeave={() => setLocationQuery('')}
                    >
                      <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                        {filteredLocations.length === 0 && locationQuery !== '' ? (
                          <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                            Nothing found.
                          </div>
                        ) : (
                          filteredLocations.map((location) => (
                            <Combobox.Option
                              key={location.id}
                              className={({ active }) =>
                                `relative cursor-default select-none py-2 pl-10 pr-4 ${
                                  active ? 'bg-blue-600 text-white' : 'text-gray-900'
                                }`
                              }
                              value={location}
                            >
                              {({ selected, active }) => (
                                <>
                                  <span
                                    className={`block truncate ${
                                      selected ? 'font-medium' : 'font-normal'
                                    }`}
                                  >
                                    {location.name}
                                  </span>
                                  {selected ? (
                                    <span
                                      className={`absolute inset-y-0 left-0 flex items-center pl-3 ${
                                        active ? 'text-white' : 'text-blue-600'
                                      }`}
                                    >
                                      <HiCheck className="h-5 w-5" aria-hidden="true" />
                                    </span>
                                  ) : null}
                                </>
                              )}
                            </Combobox.Option>
                          ))
                        )}
                      </Combobox.Options>
                    </Transition>
                  </div>
                </Combobox>
                <input type="hidden" {...register("frequentLocationId", { required: "Location is required" })} />
                {errors.frequentLocationId && (
                  <p className="text-red-500 text-sm mt-1">
                    {errors.frequentLocationId.message}
                  </p>
                )}
              </div>

              <div className="col-span-2">
                <label className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    {...register("isFixedPrice")}
                    className="rounded text-blue-600"
                  />
                  <span className="text-sm font-medium">Fixed Price</span>
                </label>
              </div>

              {isFixedPrice ? (
                <div className="col-span-2">
                  <label className="block text-sm font-medium mb-1">
                    Fixed Price (€)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register("basePrice", {
                      required: "Fixed price is required",
                      min: { value: 0, message: "Price must be positive" },
                    })}
                    className="w-full p-2 border rounded bg-purple-50"
                  />
                  {errors.basePrice && (
                    <p className="text-red-500 text-sm mt-1">
                      {errors.basePrice.message}
                    </p>
                  )}
                </div>
              ) : (
                <>
                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Base Price (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("basePrice", {
                        required: "Base price is required",
                        min: { value: 0, message: "Price must be positive" },
                      })}
                      className="w-full p-2 border rounded"
                    />
                    {errors.basePrice && (
                      <p className="text-red-500 text-sm mt-1">
                        {errors.basePrice.message}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Diesel Surcharge (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("dieselSurcharge")}
                      className="w-full p-2 border rounded"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium mb-1">
                      Road Tax (€)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      {...register("roadTax")}
                      className="w-full p-2 border rounded"
                    />
                  </div>
                </>
              )}

              <div className={isFixedPrice ? "col-span-2" : ""}>
                <label className="block text-sm font-medium mb-1">
                  Genset Price (€)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register("gensetPrice")}
                  className="w-full p-2 border rounded"
                />
              </div>
              
              <div className="col-span-2 mt-4 p-3 bg-gray-50 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="font-medium">Total Price:</span>
                  <span className="font-bold text-lg">€{totalPrice}</span>
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={loading}
                className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:opacity-50"
              >
                {loading
                  ? "Saving..."
                  : initialData
                  ? "Update Price"
                  : "Add Price"}
              </button>
            </div>
          </form>
        </Dialog.Panel>
      </div>
    </Dialog>
  );
} 