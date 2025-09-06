import React from 'react';
import type { HistoryEvent } from '../types';

interface HistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  events: HistoryEvent[];
}

const HistoryModal: React.FC<HistoryModalProps> = ({ isOpen, onClose, events }) => {
  if (!isOpen) return null;
  const sorted = [...(events || [])].sort((a, b) => a.timestamp - b.timestamp);
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 w-full max-w-2xl rounded-lg shadow-xl border border-gray-700">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-lg font-bold text-cyan-400">Session History</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-white">✕</button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto p-4">
          {sorted.length === 0 ? (
            <p className="text-gray-400">No activity yet.</p>
          ) : (
            <ul className="space-y-3">
              {sorted.map(ev => (
                <li key={ev.id} className="bg-gray-700/50 rounded p-3 flex items-start gap-3">
                  <span className="text-xs text-gray-400 mt-0.5 min-w-[150px]">{new Date(ev.timestamp).toLocaleString()}</span>
                  <div>
                    <p className="text-gray-200">{ev.message}</p>
                    {ev.actor && <p className="text-xs text-gray-400">Actor: {ev.actor}</p>}
                  </div>
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

export default HistoryModal;

