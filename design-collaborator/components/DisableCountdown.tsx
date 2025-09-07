import React, { useEffect, useState } from 'react';

const DisableCountdown: React.FC<{ deleteAt: number }> = ({ deleteAt }) => {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const remain = Math.max(0, deleteAt - now);
  const mins = Math.floor(remain / 60000);
  const secs = Math.floor((remain % 60000) / 1000);
  return (
    <div className="fixed bottom-4 right-4 bg-red-800/80 border border-red-600 text-white px-4 py-3 rounded shadow-lg z-40">
      <div className="font-semibold">Session scheduled for deletion</div>
      <div className="text-sm">Time remaining: {String(mins).padStart(2,'0')}:{String(secs).padStart(2,'0')}</div>
    </div>
  );
};

export default DisableCountdown;

