import { Dialog, Transition } from '@headlessui/react';
import { Fragment, useState, useEffect, useRef } from 'react';
import { FiX } from 'react-icons/fi';
import { toast } from 'react-toastify';
import { useDispatch, useSelector } from 'react-redux';
import { updateTransportsAndSlots } from '@/redux/features/planningSlice';
import { useSocket } from '@/context/SocketContext';

const NOTE_COLORS = {
  yellow: {
    bg: 'bg-yellow-50',
    text: 'text-yellow-800',
    border: 'border-yellow-200'
  },
  red: {
    bg: 'bg-red-50',
    text: 'text-red-800',
    border: 'border-red-200'
  },
  green: {
    bg: 'bg-green-50',
    text: 'text-green-800',
    border: 'border-green-200'
  },
  blue: {
    bg: 'bg-blue-50',
    text: 'text-blue-800',
    border: 'border-blue-200'
  },
  purple: {
    bg: 'bg-purple-50',
    text: 'text-purple-800',
    border: 'border-purple-200'
  }
};

export default function TransportNoteModal({ isOpen, onClose, transportId, notes: initialNotes, onNotesChange, currentTransport }) {
  const dispatch = useDispatch();
  const [notes, setNotes] = useState(initialNotes || []);
  const [newNote, setNewNote] = useState('');
  const [selectedColor, setSelectedColor] = useState('BLUE');
  const [isLoading, setIsLoading] = useState(false);
  const { on, off } = useSocket();
  const socketListenerRef = useRef(null);
  const lastUpdateTimeRef = useRef(0);
  const isInitialFetchDoneRef = useRef(false);
  const manualUpdateInProgressRef = useRef(false);

  // Socket.IO güncellemelerini dinle - transport:update olayını bileşen mount olduğunda başlat ve unmount olduğunda durdur
  useEffect(() => {
    // Transport güncellemesi geldiğinde çalışacak callback
    const handleTransportUpdate = (data) => {
      const now = Date.now();
      // Manuel bir güncelleme işlemi yürütülüyorsa, socket güncellemesini yoksay
      if (manualUpdateInProgressRef.current) {
        console.log('Ignoring socket update due to manual update in progress');
        return;
      }
      
      // Check if this is a notes update specifically
      if (data && data.id === parseInt(transportId) && data.updateType === 'notes') {
        console.log('Socket.IO transport notes update received in modal', {
          transportId,
          received: now,
          lastUpdate: lastUpdateTimeRef.current,
          timeSinceLastUpdate: now - lastUpdateTimeRef.current,
          hasNotes: !!data.notes,
          noteCount: data.notes?.length
        });
        
        // Gelen transport verisinde notes varsa, doğrudan kullan
        if (data.notes && Array.isArray(data.notes)) {
          // Compare incoming notes with current notes to avoid unnecessary updates
          const currentNoteIds = new Set(notes.map(note => note.id));
          const newNoteIds = new Set(data.notes.map(note => note.id));
          
          // Only update if there are actual differences
          const hasChanges = 
            currentNoteIds.size !== newNoteIds.size || 
            data.notes.some(note => !currentNoteIds.has(note.id)) ||
            notes.some(note => !newNoteIds.has(note.id));
            
          if (hasChanges) {
            console.log('Setting notes from socket update - changes detected');
            setNotes(data.notes);
            lastUpdateTimeRef.current = now;
            
            // Redux store'u güncelle
            dispatch(updateTransportsAndSlots({
              transportUpdates: [data],
              type: 'update'
            }));
          } else {
            console.log('Ignoring socket update - no changes detected in notes');
          }
        }
      }
    };

    // Önceki dinleyiciyi kaldır
    if (socketListenerRef.current) {
      socketListenerRef.current();
    }

    // Socket dinlemeyi başlat
    socketListenerRef.current = on('transport:update', handleTransportUpdate);
    
    // İlk kez açıldığında notları getir
    if (isOpen && transportId && !isInitialFetchDoneRef.current) {
      console.log('Modal first opened, fetching notes for transport', transportId);
      fetchNotes();
      isInitialFetchDoneRef.current = true;
    }

    // Cleanup
    return () => {
      // Socket dinlemeyi durdur
      if (socketListenerRef.current) {
        socketListenerRef.current();
        socketListenerRef.current = null;
      }
    };
  }, [transportId, isOpen, on, dispatch, notes]);

  // Modal kapandığında initialFetch flag'ini sıfırla
  useEffect(() => {
    if (!isOpen) {
      isInitialFetchDoneRef.current = false;
    }
  }, [isOpen]);

  // Redux'taki en güncel transport notlarını kullan
  useEffect(() => {
    if (currentTransport?.notes && currentTransport?.notes.length > 0) {
      console.log('Setting notes from Redux store', { 
        transportId, 
        count: currentTransport.notes.length 
      });
      setNotes(currentTransport.notes);
    }
  }, [currentTransport?.notes, transportId]);

  // Prop değiştiğinde notes state'ini güncelle
  useEffect(() => {
    if (initialNotes && initialNotes.length > 0) {
      console.log('Setting notes from initial props', { 
        transportId, 
        count: initialNotes.length 
      });
      setNotes(initialNotes);
    }
  }, [initialNotes, transportId]);

  // Sunucudan güncel notları getir - sadece ilk açılışta veya manuel tetiklendiğinde çalışır
  const fetchNotes = async () => {
    if (!transportId) return;
    
    try {
      console.log('Fetching notes from API for transport', transportId);
      const response = await fetch(`/api/transport-notes?transportId=${transportId}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      
      console.log('Fetched notes from API:', { transportId, count: data.length });
      setNotes(data);
      lastUpdateTimeRef.current = Date.now();
      
      // Parent component'e bildir
      if (onNotesChange) {
        onNotesChange(data);
      }
    } catch (error) {
      console.error('Error fetching notes:', error);
      toast.error('Failed to fetch notes');
    }
  };

  // Yeni not ekle
  const handleAddNote = async (e) => {
    e.preventDefault();
    if (!newNote.trim()) return;

    setIsLoading(true);
    manualUpdateInProgressRef.current = true; // Manuel güncelleme başladığını işaretle
    
    try {
      console.log('Adding new note for transport', transportId);
      const response = await fetch('/api/transport-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transportId,
          content: newNote.trim(),
          color: selectedColor
        }),
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error);

      // Not eklendiğinde input'u temizle
      setNewNote('');
      
      // API'den dönen note'u notes state'ine ekle (optimistik güncelleme)
      const newNoteData = {
        id: data.id,
        content: data.content,
        color: data.color,
        createdAt: data.createdAt,
        transportId: data.transportId
      };
      
      // Yeni notu en başa ekle
      setNotes(prev => [newNoteData, ...prev]);
      lastUpdateTimeRef.current = Date.now();
      
      console.log('Note added successfully, API response:', data._meta);
      
      // Parent component'e bildir
      if (onNotesChange) {
        onNotesChange();
      }

      toast.success('Note added successfully');
    } catch (error) {
      console.error('Error adding note:', error);
      toast.error('Failed to add note');
    } finally {
      setIsLoading(false);
      // Manuel güncelleme işlemi bittikten 300ms sonra socket güncellemelerine izin ver
      setTimeout(() => {
        manualUpdateInProgressRef.current = false;
      }, 300);
    }
  };

  // Not sil
  const handleDeleteNote = async (noteId) => {
    manualUpdateInProgressRef.current = true; // Manuel güncelleme başladığını işaretle
    
    try {
      console.log('Deleting note', noteId, 'for transport', transportId);
      
      // Optimistik UI güncelleme - önce UI'dan notu kaldır
      setNotes(prev => prev.filter(note => note.id !== noteId));
      
      const response = await fetch(`/api/transport-notes?id=${noteId}`, {
        method: 'DELETE',
      });

      if (!response.ok) throw new Error('Failed to delete note');
      
      lastUpdateTimeRef.current = Date.now();
      console.log('Note deleted successfully, API response:', response);
      
      // Parent component'e bildir
      if (onNotesChange) {
        onNotesChange();
      }
      
      toast.success('Note deleted successfully');
    } catch (error) {
      console.error('Error deleting note:', error);
      toast.error('Failed to delete note');
      // Hata durumunda notları tekrar getir
      fetchNotes();
    } finally {
      // Manuel güncelleme işlemi bittikten 300ms sonra socket güncellemelerine izin ver
      setTimeout(() => {
        manualUpdateInProgressRef.current = false;
      }, 300);
    }
  };

  return (
    <Transition appear show={isOpen} as={Fragment}>
      <Dialog as="div" className="relative z-50" onClose={onClose}>
        <Transition.Child
          as={Fragment}
          enter="ease-out duration-300"
          enterFrom="opacity-0"
          enterTo="opacity-100"
          leave="ease-in duration-200"
          leaveFrom="opacity-100"
          leaveTo="opacity-0"
        >
          <div className="fixed inset-0 bg-black bg-opacity-25" />
        </Transition.Child>

        <div className="fixed inset-0 overflow-y-auto">
          <div className="flex min-h-full items-center justify-center p-4">
            <Transition.Child
              as={Fragment}
              enter="ease-out duration-300"
              enterFrom="opacity-0 scale-95"
              enterTo="opacity-100 scale-100"
              leave="ease-in duration-200"
              leaveFrom="opacity-100 scale-100"
              leaveTo="opacity-0 scale-95"
            >
              <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-lg bg-white p-6 shadow-xl transition-all">
                <div className="flex justify-between items-center mb-4">
                  <Dialog.Title className="text-lg font-medium">
                    Transport Notes {notes.length > 0 && `(${notes.length})`}
                  </Dialog.Title>
                  <button
                    onClick={onClose}
                    className="text-gray-400 hover:text-gray-500"
                  >
                    <FiX className="w-5 h-5" />
                  </button>
                </div>

                {/* Not ekleme formu */}
                <form onSubmit={handleAddNote} className="mb-4">
                  <textarea
                    value={newNote}
                    onChange={(e) => setNewNote(e.target.value)}
                    className="w-full p-2 border rounded-md mb-2"
                    placeholder="Add a note..."
                    rows={3}
                  />
                  <div className="flex items-center justify-between">
                    <div className="flex gap-2">
                      {Object.entries(NOTE_COLORS).map(([key, color]) => (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setSelectedColor(key)}
                          className={`w-6 h-6 rounded-full ${color.bg} ${
                            selectedColor === key ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                          }`}
                          title={key.charAt(0).toUpperCase() + key.slice(1)}
                        />
                      ))}
                    </div>
                    <button
                      type="submit"
                      disabled={isLoading || !newNote.trim()}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isLoading ? 'Adding...' : 'Add Note'}
                    </button>
                  </div>
                </form>

                {/* Notların listesi */}
                <div className="space-y-2 max-h-[300px] overflow-y-auto">
                  {notes.map((note) => (
                    <div
                      key={note.id}
                      className={`p-3 rounded-lg ${NOTE_COLORS[note.color]?.bg || 'bg-gray-50'} ${NOTE_COLORS[note.color]?.text || 'text-gray-800'} ${NOTE_COLORS[note.color]?.border || 'border-gray-200'} border`}
                    >
                      <div className="flex justify-between items-start">
                        <p className="whitespace-pre-wrap">{note.content}</p>
                        <button
                          onClick={() => handleDeleteNote(note.id)}
                          className="ml-2 text-gray-400 hover:text-gray-600"
                        >
                          <FiX className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="text-xs mt-2">
                        {new Date(note.createdAt).toLocaleString()}
                      </div>
                    </div>
                  ))}
                  {notes.length === 0 && (
                    <p className="text-center text-gray-500 py-4">
                      No notes yet
                    </p>
                  )}
                </div>
              </Dialog.Panel>
            </Transition.Child>
          </div>
        </div>
      </Dialog>
    </Transition>
  );
} 