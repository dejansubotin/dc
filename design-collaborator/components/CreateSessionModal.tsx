import React, { useState, useEffect } from 'react';

interface CreateSessionModalProps {
  isOpen: boolean;
  defaultName?: string;
  onCreate: (sessionName: string, sessionDescription?: string) => void;
  onClose: () => void;
}

const CreateSessionModal: React.FC<CreateSessionModalProps> = ({ isOpen, defaultName = '', onCreate, onClose }) => {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');

  useEffect(() => {
    if (isOpen) setName(defaultName || '');
  }, [isOpen, defaultName]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm" aria-modal="true" role="dialog">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md m-4 border border-gray-700">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Create Session</h2>
        <p className="text-gray-400 mb-3">Give your session a descriptive name to find it easily later.</p>
        <div className="mb-6 text-xs text-amber-300 bg-amber-900/30 border border-amber-700 rounded p-2">
          Note: Sessions are automatically deleted after 20 days of inactivity.
        </div>

        <label htmlFor="sessionName" className="block text-sm font-medium text-gray-300 mb-1">Session Name</label>
        <input
          id="sessionName"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g., Project XYZ – Home Screen"
          className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
          autoFocus
        />

        <label htmlFor="sessionDesc" className="block text-sm font-medium text-gray-300 mb-1 mt-4">Description (optional)</label>
        <textarea
          id="sessionDesc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Short context for collaborators"
          className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
          rows={3}
        />

        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-500 transition-colors">Cancel</button>
          <button onClick={() => onCreate(name.trim(), description.trim() || undefined)} className="px-4 py-2 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-700 transition-colors">Create</button>
        </div>
      </div>
    </div>
  );
};

export default CreateSessionModal;
