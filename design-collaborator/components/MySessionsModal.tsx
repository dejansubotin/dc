import React from 'react';
import type { Session } from '../types';

interface MySessionsModalProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: Session[];
}

const MySessionsModal: React.FC<MySessionsModalProps> = ({ isOpen, onClose, sessions }) => {
  if (!isOpen) return null;
  const openInNewTab = (sessionId: string) => {
    const url = `${window.location.origin}${window.location.pathname}?sessionId=${sessionId}`;
    window.open(url, '_blank');
  };
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 w-full max-w-3xl rounded-lg shadow-xl border border-gray-700">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-lg font-bold text-cyan-400">My Sessions</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-white">✕</button>
        </div>
        <div className="p-4 max-h-[70vh] overflow-y-auto">
          {sessions.length === 0 ? (
            <p className="text-gray-400">You have no sessions yet.</p>
          ) : (
            <ul className="space-y-3">
              {sessions.map(s => (
                <li key={s.id} className="bg-gray-700/40 hover:bg-gray-700 rounded p-3 flex items-center gap-3">
                  <img src={s.imageUrl} alt="thumb" className="w-20 h-12 object-cover rounded bg-gray-900" />
                  <div className="flex-grow">
                    <p className="text-gray-200 font-semibold">{s.sessionName || `Session ${s.id.slice(0,8)}...`}</p>
                    <p className="text-gray-400 text-sm">{new Date(s.createdAt).toLocaleString()}</p>
                  </div>
                  <button onClick={() => openInNewTab(s.id)} className="px-3 py-1 bg-cyan-600 hover:bg-cyan-700 text-white rounded">Open</button>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="px-4 py-3 border-t border-gray-700 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white">Close</button>
        </div>
      </div>
    </div>
  );
};

export default MySessionsModal;

