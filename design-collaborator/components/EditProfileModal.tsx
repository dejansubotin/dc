import React, { useState, useEffect } from 'react';
import type { User } from '../types';

interface EditProfileModalProps {
  isOpen: boolean;
  initialUser: User;
  onSave: (user: User) => void;
  onClose: () => void;
}

const EditProfileModal: React.FC<EditProfileModalProps> = ({ isOpen, initialUser, onSave, onClose }) => {
  const [displayName, setDisplayName] = useState(initialUser.displayName);
  const [email, setEmail] = useState(initialUser.email);

  useEffect(() => { if (isOpen) { setDisplayName(initialUser.displayName); setEmail(initialUser.email); } }, [isOpen, initialUser]);
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm" aria-modal="true" role="dialog">
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md m-4 border border-gray-700">
        <h2 className="text-2xl font-bold text-cyan-400 mb-4">Edit Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
            <input value={displayName} onChange={(e)=>setDisplayName(e.target.value)} className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-1">Email</label>
            <input value={email} onChange={(e)=>setEmail(e.target.value)} type="email" className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition" />
          </div>
        </div>
        <div className="flex justify-end gap-3 mt-6">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-500 transition-colors">Cancel</button>
          <button onClick={() => onSave({ displayName: displayName.trim(), email: email.trim() })} className="px-4 py-2 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-700 transition-colors">Save</button>
        </div>
      </div>
    </div>
  );
};

export default EditProfileModal;

