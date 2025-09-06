
import React from 'react';
import type { Session } from '../types';

interface SessionHistoryProps {
  sessions: Session[];
  onSelectSession: (sessionId: string) => void;
}

const SessionHistory: React.FC<SessionHistoryProps> = ({ sessions, onSelectSession }) => {
  if (sessions.length === 0) {
    return (
      <div className="text-center p-8 bg-gray-800 rounded-lg">
        <h3 className="text-lg font-semibold text-gray-400">No recent sessions</h3>
        <p className="text-gray-500">Upload an image to start your first collaboration session.</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-800 rounded-lg p-6 w-full">
      <h2 className="text-xl font-bold text-cyan-400 mb-4">Recent Sessions</h2>
      <div className="space-y-3 max-h-96 overflow-y-auto">
        {sessions.map(session => (
          <button
            key={session.id}
            onClick={() => onSelectSession(session.id)}
            className="w-full flex items-center p-3 bg-gray-700/50 hover:bg-gray-700 rounded-lg transition-colors text-left"
          >
            <img 
              src={session.sessionThumbnailUrl || session.imageUrl} 
              alt="Session thumbnail"
              className="w-16 h-10 object-cover rounded-md mr-4 bg-gray-900" 
            />
            <div className="flex-grow">
              <p className="font-semibold text-gray-200">{session.sessionName || `Session ${session.id.substring(0, 8)}...`}</p>
              <p className="text-sm text-gray-400">
                Created on {new Date(session.createdAt).toLocaleDateString()}
              </p>
            </div>
            <span className="text-cyan-400 text-sm font-semibold">Open</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export default SessionHistory;
