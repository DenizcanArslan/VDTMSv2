"use client";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { IoCheckmarkCircle, IoCloseCircle } from 'react-icons/io5';
import { useState } from 'react';

const StatusButton = ({ id, isActive, table = "driver" }) => {
  const router = useRouter();
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingStatus, setPendingStatus] = useState(null);

  const handleStatusChange = async (newStatus) => {
    try {
      const res = await fetch(`/api/${table}s/${id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ isActive: newStatus })
      });

      if (!res.ok) throw new Error('Status update failed');

      router.refresh();
      toast.success(`${table.charAt(0).toUpperCase() + table.slice(1)} ${newStatus ? 'activated' : 'deactivated'} successfully!`);
      setShowConfirmModal(false);
    } catch (error) {
      console.error(`Error updating ${table} status:`, error);
      toast.error(`Failed to update ${table} status`);
    }
  };

  const openConfirmModal = (newStatus) => {
    setPendingStatus(newStatus);
    setShowConfirmModal(true);
  };

  return (
    <>
      <button
        onClick={() => openConfirmModal(!isActive)}
        className={`w-7 h-7 flex items-center justify-center rounded-full ${
          isActive ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
        } transition duration-200`}
      >
        {isActive ? 
          <IoCheckmarkCircle size={20} color="white" /> : 
          <IoCloseCircle size={20} color="white" />
        }
      </button>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-[90%] max-w-md">
            <h2 className="text-2xl font-semibold mb-4">Confirm Status Change</h2>
            <p className="text-lg text-gray-600 mb-6">
              Are you sure you want to {pendingStatus ? 'activate' : 'deactivate'} this {table}?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-lg text-gray-600 hover:text-gray-800 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={() => handleStatusChange(pendingStatus)}
                className={`px-4 py-2 text-lg text-white rounded ${
                  pendingStatus ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'
                } transition-colors duration-200`}
              >
                {pendingStatus ? 'Activate' : 'Deactivate'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default StatusButton; 