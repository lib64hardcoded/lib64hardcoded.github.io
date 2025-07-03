import React from 'react';
import { Clock, AlertTriangle, Shield, ToggleLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { isProtectionEnabled } from '../lib/ipProtection';

const GuestTimer: React.FC = () => {
  const { user, timeRemaining, signOut } = useAuth();
  const protectionEnabled = isProtectionEnabled();

  if (!user?.is_guest || timeRemaining === null) return null;

  const minutes = Math.floor(timeRemaining / 60000);
  const seconds = Math.floor((timeRemaining % 60000) / 1000);
  const isLowTime = timeRemaining < 60000; // Less than 1 minute

  return (
    <div className={`fixed top-4 right-4 z-40 px-4 py-3 rounded-lg shadow-lg border ${
      isLowTime 
        ? 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800 text-red-800 dark:text-red-200'
        : 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800 text-blue-800 dark:text-blue-200'
    }`}>
      <div className="flex flex-col space-y-2">
        <div className="flex items-center space-x-2">
          {isLowTime ? (
            <AlertTriangle className="w-4 h-4" />
          ) : (
            <Clock className="w-4 h-4" />
          )}
          <span className="text-sm font-medium">
            Guest Session: {minutes}:{seconds.toString().padStart(2, '0')}
          </span>
          <button
            onClick={signOut}
            className="text-xs underline hover:no-underline"
          >
            End Session
          </button>
        </div>
        
        <div className="flex items-center space-x-2 text-xs">
          {protectionEnabled ? (
            <>
              <Shield className="w-3 h-3" />
              <span className="text-amber-700 dark:text-amber-300">
                IP will be blocked for 3 days after session expires
              </span>
            </>
          ) : (
            <>
              <ToggleLeft className="w-3 h-3" />
              <span className="text-gray-600 dark:text-gray-400">
                IP protection is disabled
              </span>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default GuestTimer;