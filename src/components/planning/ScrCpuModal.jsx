import React, { useState, useEffect } from 'react';
import Modal from '@/components/Modal';
import { toast } from 'react-toastify';
import { useAppDispatch } from '@/hooks/redux';
import { updateTransportsAndSlots } from '@/redux/features/planningSlice';
import { useSocket } from '@/context/SocketContext';

export default function ScrCpuModal({ isOpen, onClose, transport, onUpdate }) {
  const dispatch = useAppDispatch();
  const { on } = useSocket();
  const [status, setStatus] = useState(transport.scrCpuStatus);
  const [color, setColor] = useState(transport.scrCpuColor);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setStatus(transport.scrCpuStatus);
    setColor(transport.scrCpuColor);
  }, [transport]);

  useEffect(() => {
    if (status === 'SCRCPUNOK') {
      setColor('RED');
    }
  }, [status]);

  // Listen for WebSocket updates
  useEffect(() => {
    const handleTransportUpdate = (updatedTransport) => {
      if (updatedTransport.id === transport.id) {
        // Update local state if the modal is still open
        setStatus(updatedTransport.scrCpuStatus);
        setColor(updatedTransport.scrCpuColor);
      }
    };
    
    const cleanup = on('transport:update', handleTransportUpdate);
    return cleanup;
  }, [transport.id, on]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      
      // Update UI immediately to provide feedback
      onUpdate(status, color);
      
      const response = await fetch(`/api/transports/${transport.id}/scrcpu`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, color }),
      });

      if (!response.ok) throw new Error('Update failed');
      
      // Close modal on success - WebSocket will handle updating other clients
      onClose();
      toast.success('SCR/CPU status updated successfully');
    } catch (error) {
      console.error('Error updating SCR/CPU status:', error);
      toast.error('Failed to update SCR/CPU status');
      // If there was an error, reset to the original values
      setStatus(transport.scrCpuStatus);
      setColor(transport.scrCpuColor);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4">
        <h3 className="text-lg font-medium">Update SCR/CPU Status</h3>
        
        <div className="space-y-2">
          <label className="block text-sm font-medium">Status</label>
          <select 
            value={status || ""} 
            onChange={(e) => setStatus(e.target.value)}
            className="w-full border rounded-md p-2"
            disabled={isSubmitting}
          >
            <option value="SCRCPUNOK">SCR/CPU NOK</option>
            <option value="SCROK">SCR OK</option>
            <option value="CPUOK">CPU OK</option>
          </select>
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-medium">Color</label>
          <select 
            value={color || ""} 
            onChange={(e) => setColor(e.target.value)}
            className="w-full border rounded-md p-2"
            disabled={status === 'SCRCPUNOK' || isSubmitting}
          >
            <option value="RED">Red</option>
            <option value="ORANGE">Orange</option>
            <option value="GREEN">Green</option>
          </select>
        </div>

        <div className="flex justify-end gap-2">
          <button 
            onClick={onClose}
            className="px-4 py-2 text-sm border rounded-md"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button 
            onClick={handleSubmit}
            className={`px-4 py-2 text-sm bg-blue-500 text-white rounded-md flex items-center justify-center ${isSubmitting ? 'opacity-70' : ''}`}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Updating...
              </>
            ) : 'Update'}
          </button>
        </div>
      </div>
    </Modal>
  );
} 