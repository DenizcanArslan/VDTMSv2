"use client";
import { useState, useEffect, useRef } from "react";
import { FiPlus, FiEdit2, FiTrash2, FiSearch, FiFilter, FiChevronDown } from "react-icons/fi";
import PriceForm from "@/components/forms/PriceForm";
import PriceDeleteModal from "@/components/PriceDeleteModal";
import { toast } from "react-toastify";

export default function PricesPage() {
  const [prices, setPrices] = useState([]);
  const [clients, setClients] = useState([]);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(false);
  const filterDropdownRef = useRef(null);
  const [deleteModal, setDeleteModal] = useState({
    isOpen: false,
    priceId: null
  });

  // Dropdown dışına tıklandığında kapanması için
  useEffect(() => {
    function handleClickOutside(event) {
      if (filterDropdownRef.current && !filterDropdownRef.current.contains(event.target)) {
        setIsFilterDropdownOpen(false);
      }
    }
    
    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // Filtrelenmiş prices
  const filteredPrices = prices.filter(price => {
    // Önce arama terimine göre filtrele
    const matchesSearch = 
      price.client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      price.frequentLocation.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      price.basePrice.toString().includes(searchTerm);
    
    // Sonra seçili client'a göre filtrele
    const matchesClient = selectedClient ? price.clientId === parseInt(selectedClient) : true;
    
    return matchesSearch && matchesClient;
  });

  // Fiyatları ve müşterileri getir
  const fetchData = async () => {
    try {
      setLoading(true);
      const [pricesRes, clientsRes] = await Promise.all([
        fetch("/api/prices"),
        fetch("/api/clients")
      ]);
      
      if (!pricesRes.ok) throw new Error("Failed to fetch prices");
      if (!clientsRes.ok) throw new Error("Failed to fetch clients");
      
      const [pricesData, clientsData] = await Promise.all([
        pricesRes.json(),
        clientsRes.json()
      ]);
      
      setPrices(pricesData);
      setClients(clientsData);
    } catch (error) {
      toast.error("Failed to fetch data");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleEdit = (price) => {
    setEditingPrice(price);
    setIsFormOpen(true);
  };

  const handleDelete = (id) => {
    setDeleteModal({
      isOpen: true,
      priceId: id
    });
  };

  const confirmDelete = async () => {
    try {
      const response = await fetch(`/api/prices/${deleteModal.priceId}`, {
        method: "DELETE",
      });
      if (!response.ok) throw new Error("Failed to delete price");
      
      toast.success("Price deleted successfully");
      fetchData();
      setDeleteModal({ isOpen: false, priceId: null });
    } catch (error) {
      toast.error("Failed to delete price");
    }
  };

  // Toplam fiyat hesaplama
  const calculateTotalPrice = (price) => {
    // Sabit fiyat kontrolü
    const isFixedPrice = price.dieselSurcharge === null && price.roadTax === null;
    
    const basePrice = price.basePrice || 0;
    const gensetPrice = price.gensetPrice || 0;
    
    if (isFixedPrice) {
      return (basePrice + gensetPrice).toFixed(2);
    }
    
    const dieselSurcharge = price.dieselSurcharge || 0;
    const roadTax = price.roadTax || 0;
    
    return (basePrice + dieselSurcharge + roadTax + gensetPrice).toFixed(2);
  };

  // Fiyat tipini belirle
  const getPriceType = (price) => {
    return price.dieselSurcharge === null && price.roadTax === null ? 'Fixed' : 'Variable';
  };

  // Seçili client'ın adını bul
  const getSelectedClientName = () => {
    if (!selectedClient) return "All Clients";
    const client = clients.find(c => c.id === parseInt(selectedClient));
    return client ? client.name : "All Clients";
  };

  if (loading) return <div>Loading...</div>;

  return (
    <div className="p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-lg font-medium">Prices</h1>
        <div className="flex items-center gap-3">
          <div className="relative" ref={filterDropdownRef}>
            <button
              onClick={() => setIsFilterDropdownOpen(!isFilterDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 border border-gray-300 rounded-md text-sm hover:bg-gray-50"
            >
              <FiFilter className="w-4 h-4" />
              <span>{getSelectedClientName()}</span>
              <FiChevronDown className="w-4 h-4" />
            </button>
            
            {isFilterDropdownOpen && (
              <div className="absolute z-10 mt-1 w-56 bg-white rounded-md shadow-lg border border-gray-200">
                <ul className="py-1 max-h-60 overflow-auto">
                  <li 
                    className={`px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer ${!selectedClient ? 'bg-blue-50 text-blue-700' : ''}`}
                    onClick={() => {
                      setSelectedClient("");
                      setIsFilterDropdownOpen(false);
                    }}
                  >
                    All Clients
                  </li>
                  {clients.map((client) => (
                    <li 
                      key={client.id} 
                      className={`px-4 py-2 text-sm hover:bg-gray-100 cursor-pointer ${selectedClient === client.id.toString() ? 'bg-blue-50 text-blue-700' : ''}`}
                      onClick={() => {
                        setSelectedClient(client.id.toString());
                        setIsFilterDropdownOpen(false);
                      }}
                    >
                      {client.name}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
          
          <div className="relative">
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className="pl-9 pr-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-1 focus:ring-blue-500 focus:border-blue-500 w-64"
            />
            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          </div>
          <button
            onClick={() => {
              setEditingPrice(null);
              setIsFormOpen(true);
            }}
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700"
          >
            <FiPlus /> Add Price
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <table className="min-w-full">
          <thead>
            <tr className="border-b">
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Client</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Location</th>
              <th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Base Price</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Diesel Surcharge</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Road Tax</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Genset Price</th>
              <th className="px-4 py-2 text-right text-xs font-medium text-gray-500">Total</th>
              <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredPrices.map((price) => (
              <tr key={price.id} className="border-b hover:bg-gray-50">
                <td className="px-4 py-2 text-sm">{price.client.name}</td>
                <td className="px-4 py-2 text-sm">{price.frequentLocation.name}</td>
                <td className="px-4 py-2 text-sm">
                  <span className={`px-2 py-1 rounded-full text-xs ${getPriceType(price) === 'Fixed' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'}`}>
                    {getPriceType(price)}
                  </span>
                </td>
                <td className="px-4 py-2 text-right text-sm">€{price.basePrice}</td>
                <td className="px-4 py-2 text-right text-sm">
                  {getPriceType(price) === 'Fixed' ? "-" : (price.dieselSurcharge ? `€${price.dieselSurcharge}` : "-")}
                </td>
                <td className="px-4 py-2 text-right text-sm">
                  {getPriceType(price) === 'Fixed' ? "-" : (price.roadTax ? `€${price.roadTax}` : "-")}
                </td>
                <td className="px-4 py-2 text-right text-sm">
                  {price.gensetPrice ? `€${price.gensetPrice}` : "-"}
                </td>
                <td className="px-4 py-2 text-right text-sm font-medium">
                  €{calculateTotalPrice(price)}
                </td>
                <td className="px-4 py-2">
                  <div className="flex justify-center gap-2">
                    <button
                      onClick={() => handleEdit(price)}
                      className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-full"
                    >
                      <FiEdit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(price.id)}
                      className="p-1.5 text-red-600 hover:bg-red-50 rounded-full"
                    >
                      <FiTrash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filteredPrices.length === 0 && (
              <tr>
                <td colSpan="9" className="px-4 py-8 text-center text-sm text-gray-500">
                  No prices found matching your search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PriceForm
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setEditingPrice(null);
        }}
        onSubmit={() => {
          fetchData();
          setIsFormOpen(false);
          setEditingPrice(null);
        }}
        initialData={editingPrice}
      />

      <PriceDeleteModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, priceId: null })}
        onConfirm={confirmDelete}
      />
    </div>
  );
}