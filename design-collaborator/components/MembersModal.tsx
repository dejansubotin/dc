import React from 'react';
import type { Collaborator, Session, User } from '../types';

interface MembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  session: Session;
  currentUser: User | null;
  onRemove: (email: string) => void;
}

const MembersModal: React.FC<MembersModalProps> = ({ isOpen, onClose, session, currentUser, onRemove }) => {
  if (!isOpen) return null;
  const ownerEmail = session.ownerId;
  const profiles = session.collaboratorProfiles || [];
  const byEmail: Record<string,string> = {};
  profiles.forEach(p => { byEmail[p.email] = p.displayName; });
  const members = [ownerEmail, ...session.collaboratorIds.filter(e => e.toLowerCase() !== ownerEmail.toLowerCase())];
  const isOwner = currentUser?.email?.toLowerCase() === ownerEmail.toLowerCase();
  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-gray-800 w-full max-w-lg rounded-lg shadow-xl border border-gray-700">
        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700">
          <h3 className="text-lg font-bold text-cyan-400">Session Members</h3>
          <button onClick={onClose} className="text-gray-300 hover:text-white">✕</button>
        </div>
        <div className="p-4 space-y-2 max-h-[70vh] overflow-y-auto">
          {members.map(email => {
            const isOwnerRow = email.toLowerCase() === ownerEmail.toLowerCase();
            const display = byEmail[email] || email;
            return (
              <div key={email} className="flex items-center justify-between bg-gray-700/40 rounded p-2">
                <div>
                  <div className="text-gray-200 font-medium">{display}</div>
                  <div className="text-xs text-gray-400">{email} {isOwnerRow && '(Owner)'}</div>
                </div>
                {isOwner && !isOwnerRow && (
                  <button onClick={() => onRemove(email)} className="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded text-sm">Remove</button>
                )}
              </div>
            );
          })}
        </div>
        <div className="px-4 py-3 border-t border-gray-700 flex justify-end">
          <button onClick={onClose} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 rounded text-white">Close</button>
        </div>
      </div>
    </div>
  );
};

export default MembersModal;

