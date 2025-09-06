
import React, { useState, FormEvent } from 'react';

interface LoginModalProps {
  isOpen: boolean;
  isJoiningWithPassword?: boolean;
  onSubmit: (displayName: string, email: string, password?: string) => void;
  onClose?: () => void; // Optional: for modals that can be closed
  message?: string; // Optional notice to show at top
  externalError?: string; // Server-side error message to display
}

const LoginModal: React.FC<LoginModalProps> = ({ isOpen, isJoiningWithPassword = false, onSubmit, onClose, message, externalError }) => {
  const [displayName, setDisplayName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!displayName.trim() || !email.trim()) {
      setError('Display Name and Email are required.');
      return;
    }
    if (isJoiningWithPassword && !password.trim()) {
      setError('Password is required to join this session.');
      return;
    }
    setError('');
    onSubmit(displayName.trim(), email.trim(), password);
  };

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80 backdrop-blur-sm"
      aria-modal="true"
      role="dialog"
    >
      <div className="bg-gray-800 rounded-lg shadow-xl p-8 w-full max-w-md m-4 border border-gray-700">
        <form onSubmit={handleSubmit}>
          <h2 className="text-2xl font-bold text-cyan-400 mb-4">
            {isJoiningWithPassword ? 'Join Session' : 'Welcome!'}
          </h2>
          <p className="text-gray-400 mb-6">
            {message || 'Please enter your details to continue.'}
          </p>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-300 mb-1">Display Name</label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
                required
              />
            </div>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-1">Email Address</label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
                required
              />
            </div>
            {isJoiningWithPassword && (
              <div>
                <div className="mb-2 text-sm text-yellow-300">This session is password‑protected.</div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-1">Session Password</label>
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
                  required
                />
              </div>
            )}
          </div>

          {(externalError || error) && <p className="text-red-400 text-sm mt-4">{externalError || error}</p>}
          
          <div className="flex justify-end gap-4 mt-8">
            {onClose && (
                <button
                    type="button"
                    onClick={onClose}
                    className="px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-500 transition-colors"
                >
                    Cancel
                </button>
            )}
            <button
              type="submit"
              className="px-6 py-2 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-700 transition-colors"
            >
              Continue
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
