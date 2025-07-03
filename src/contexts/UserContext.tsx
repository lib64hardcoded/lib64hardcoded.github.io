import React, { createContext, useContext } from 'react';
import { useAuth } from './AuthContext';

// This component is now deprecated in favor of AuthContext
// Keeping it for backward compatibility

export type UserGrade = 'Guest' | 'V4' | 'V5' | 'Admin';

interface User {
  id: string;
  name: string;
  email: string;
  grade: UserGrade;
  avatar?: string;
  joinDate: string;
  lastActive: string;
}

interface UserContextType {
  user: User;
  setUser: (user: User) => void;
  hasAccess: (requiredGrade: UserGrade) => boolean;
}

const UserContext = createContext<UserContextType | undefined>(undefined);

export const useUser = () => {
  const auth = useAuth();
  
  // Convert auth user to legacy user format for backward compatibility
  const legacyUser: User = {
    id: auth.user?.id || '1',
    name: auth.user?.name || 'Guest User',
    email: auth.user?.email || 'guest@example.com',
    grade: auth.user?.grade || 'Guest',
    joinDate: auth.user?.join_date || new Date().toISOString(),
    lastActive: auth.user?.last_active || new Date().toISOString()
  };

  return {
    user: legacyUser,
    setUser: () => {}, // No-op for backward compatibility
    hasAccess: auth.hasAccess
  };
};

export const UserProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // This provider is no longer needed as we use AuthProvider
  return <>{children}</>;
};