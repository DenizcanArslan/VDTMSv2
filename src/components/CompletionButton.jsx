"use client";
import { useRouter } from "next/navigation";
import { toast } from "react-toastify";
import { useState } from 'react';

const CompletionButton = ({ id, status, table }) => {
  const router = useRouter();
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const handleStatusChange = async () => {
    try {
      const newStatus = status === 'COMPLETED' ? 'NOT_COMPLETED' : 'COMPLETED';
      
      const res = await fetch(`/api/${table}/${id}/completion`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) throw new Error('Failed to update completion status');

      window.dispatchEvent(new Event('statusUpdated'));
      
      router.refresh();
      toast.success(`${newStatus === 'COMPLETED' ? 'Marked as completed' : 'Marked as not completed'}`);
      setShowConfirmModal(false);
    } catch (error) {
      console.error('Error updating completion status:', error);
      toast.error('Failed to update completion status');
    }
  };

  return (
    <>
      <button
        onClick={() => setShowConfirmModal(true)}
        className={`px-2 py-1 text-xs font-medium rounded-full ${
          status === 'COMPLETED'
            ? 'bg-green-100 text-green-800 hover:bg-green-200'
            : 'bg-yellow-100 text-yellow-800 hover:bg-yellow-200'
        }`}
      >
        {status === 'COMPLETED' ? 'Completed' : 'Not Completed'}
      </button>

      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 rounded-lg shadow-lg w-[90%] max-w-lg">
            <h2 className="text-xl font-semibold mb-6">Confirm Status Change</h2>
            <p className="text-base text-gray-600 mb-8">
              Are you sure you want to mark this as {status === 'COMPLETED' ? 'not completed' : 'completed'}?
            </p>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => setShowConfirmModal(false)}
                className="px-4 py-2 text-base text-gray-600 hover:text-gray-800 transition-colors duration-200"
              >
                Cancel
              </button>
              <button
                onClick={handleStatusChange}
                className="px-4 py-2 text-base text-white rounded bg-dijle-dark-blue hover:bg-opacity-90 transition-colors duration-200"
              >
                Confirm
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CompletionButton; 