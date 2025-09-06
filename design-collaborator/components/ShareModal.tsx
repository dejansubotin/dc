
import React, { useState } from 'react';
import type { Session } from '../types';

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSetPassword: (password: string) => void;
  session: Session;
}

const ShareModal: React.FC<ShareModalProps> = ({ isOpen, onClose, onSetPassword, session }) => {
  const [password, setPassword] = useState(session.password || '');
  const [copyButtonText, setCopyButtonText] = useState('Copy Link');

  if (!isOpen) return null;

  const shareUrl = window.location.href;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(shareUrl).then(() => {
      setCopyButtonText('Copied!');
      setTimeout(() => setCopyButtonText('Copy Link'), 2000);
    });
  };

  const handleSave = () => {
    onSetPassword(password);
    onClose();
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-70 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div 
        className="bg-gray-800 rounded-lg shadow-xl p-6 w-full max-w-lg m-4 border border-gray-700"
        onClick={e => e.stopPropagation()}
      >
        <h2 className="text-xl font-bold text-cyan-400 mb-4">Share Session</h2>
        
        <div className="mb-6">
            <label htmlFor="share-link" className="block text-sm font-medium text-gray-300 mb-1">Shareable Link</label>
            <div className="flex gap-2">
                <input
                    id="share-link"
                    type="text"
                    value={shareUrl}
                    readOnly
                    className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md outline-none"
                />
                <button
                    onClick={handleCopyLink}
                    className="px-4 py-2 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-700 transition-colors w-32"
                >
                    {copyButtonText}
                </button>
            </div>
        </div>

        <div className="mb-6">
            <label htmlFor="session-password" className="block text-sm font-medium text-gray-300 mb-1">
                Session Password (optional)
            </label>
            <input
                id="session-password"
                type="text"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Leave blank for public access"
                className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
            />
             <p className="text-xs text-gray-500 mt-1">Anyone with the link will need this password to join.</p>
        </div>

        <div className="flex justify-end gap-4">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-500 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-700 transition-colors"
          >
            Save & Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default ShareModal;
