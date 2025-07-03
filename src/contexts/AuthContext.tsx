import React, { createContext, useContext, useState, useEffect } from 'react';
import { showNotification } from '../lib/notifications';
import { registerGuestSession, expireGuestSession, isIPBlocked, cleanupOldRecords, isProtectionEnabled } from '../lib/ipProtection';
import { securityManager, withSecurity, sanitizeInput } from '../lib/security';
import { supabase } from '../lib/supabase';

export type UserGrade = 'Guest' | 'V4' | 'V5' | 'Support' | 'Admin';

interface User {
  id: string;
  name: string;
  email: string;
  grade: UserGrade;
  avatar_url?: string;
  join_date: string;
  last_active: string;
  total_downloads: number;
  is_guest?: boolean;
  guest_expires_at?: string;
  is_blocked?: boolean;
  blocked_until?: string;
  admin_notes?: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  signIn: (email: string, password: string, adminToken?: string) => Promise<void>;
  signInAsGuest: () => Promise<void>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
  hasAccess: (requiredGrade: UserGrade) => boolean;
  timeRemaining: number | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [loginAttempts, setLoginAttempts] = useState<number>(0);

  const gradeHierarchy: UserGrade[] = ['Guest', 'V4', 'V5', 'Support', 'Admin'];

  useEffect(() => {
    // Clean up old IP records on app start
    cleanupOldRecords();
    
    // Check for existing session on mount
    const checkSession = async () => {
      try {
        // First check localStorage for a user session
        const storedUser = localStorage.getItem('prodomo_current_user');
        if (storedUser) {
          const userData = JSON.parse(storedUser);
          
          // Check if it's a guest user with an expiration time
          if (userData.is_guest && userData.guest_expires_at) {
            const expiresAt = new Date(userData.guest_expires_at).getTime();
            const now = new Date().getTime();
            
            // If expired, remove the user
            if (now > expiresAt) {
              localStorage.removeItem('prodomo_current_user');
              return;
            }
          }
          
          setUser(userData);
          console.log('AuthContext: Restored user session from localStorage:', userData.name);
          
          // Ensure user exists in Supabase
          await ensureUserInDatabase(userData);
          
          return;
        }
        
        // If no localStorage session, check Supabase
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();
        
        if (sessionError) {
          console.error('Error checking session:', sessionError);
          return;
        }
        
        if (session) {
          // Get user data from users table
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id);
            
          if (userError) {
            console.error('Error fetching user data:', userError);
            return;
          }
          
          if (userData && userData.length > 0) {
            setUser(userData[0]);
            // Store in localStorage for faster access
            localStorage.setItem('prodomo_current_user', JSON.stringify(userData[0]));
            console.log('AuthContext: Restored user session from Supabase:', userData[0].name);
          }
        }
      } catch (err) {
        console.error('AuthContext: Failed to check session:', err);
      }
    };
    
    checkSession();
  }, []);

  // Timer for guest accounts
  useEffect(() => {
    let interval: NodeJS.Timeout;
    
    if (user?.is_guest && user.guest_expires_at) {
      interval = setInterval(() => {
        const expiresAt = new Date(user.guest_expires_at!).getTime();
        const now = new Date().getTime();
        const remaining = Math.max(0, expiresAt - now);
        
        setTimeRemaining(remaining);
        
        // Show warning when 1 minute remaining
        if (remaining <= 60000 && remaining > 59000) {
          showNotification.sessionExpiring();
        }
        
        if (remaining <= 0) {
          console.log('AuthContext: Guest session expired');
          // Apply IP protection when session expires
          if (isProtectionEnabled()) {
            expireGuestSession(user.id);
          }
          signOut();
        }
      }, 1000);
    } else {
      setTimeRemaining(null);
    }

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [user]);

  // Helper function to ensure user exists in Supabase
  const ensureUserInDatabase = async (userData: User): Promise<void> => {
    try {
      // Check if user already exists
      const { data: existingUsers, error: checkError } = await supabase
        .from('users')
        .select('id')
        .eq('id', userData.id);

      if (checkError) {
        console.error('Error checking if user exists:', checkError);
        return;
      }

      // If user doesn't exist, create them
      if (!existingUsers || existingUsers.length === 0) {
        const { error: insertError } = await supabase
          .from('users')
          .insert({
            id: userData.id,
            name: userData.name,
            email: userData.email,
            grade: userData.grade,
            join_date: userData.join_date,
            last_active: userData.last_active,
            total_downloads: userData.total_downloads,
            is_guest: userData.is_guest || false,
            guest_expires_at: userData.guest_expires_at || null,
            is_blocked: userData.is_blocked || false,
            blocked_until: userData.blocked_until || null,
            admin_notes: userData.admin_notes || null
          });

        if (insertError) {
          console.error('Error creating user in database:', insertError);
          // Don't throw error here to avoid breaking the login flow
        } else {
          console.log('User created in database:', userData.name);
        }
      } else {
        // User exists, update their last_active time
        const { error: updateError } = await supabase
          .from('users')
          .update({ last_active: new Date().toISOString() })
          .eq('id', userData.id);

        if (updateError) {
          console.error('Error updating user last_active:', updateError);
        }
      }
    } catch (err) {
      console.error('Error ensuring user exists in database:', err);
      // Don't throw error here to avoid breaking the login flow
    }
  };

  const signIn = async (email: string, password: string, adminToken?: string) => {
    try {
      // Check if login rate limiting is enabled
      const loginRateLimitEnabled = securityManager.getRateLimitStatus('login');
      
      // Apply rate limiting for login attempts only if enabled
      if (loginRateLimitEnabled) {
        const rateCheck = await securityManager.checkRateLimit('login');
        if (!rateCheck.allowed) {
          throw new Error(`Rate limit exceeded. Please try again in ${rateCheck.retryAfter} seconds.`);
        }
      }
      
      console.log('AuthContext: Sign in attempt for:', email);
      setLoading(true);
      setError(null);
      
      // Sanitize inputs
      const sanitizedEmail = sanitizeInput(email);
      const sanitizedPassword = sanitizeInput(password);
      const sanitizedToken = adminToken ? sanitizeInput(adminToken) : undefined;
      
      // Check if this is an admin login attempt
      const isAdminAttempt = sanitizedEmail.includes('admin') || sanitizedToken;
      
      if (isAdminAttempt && sanitizedToken !== 'T0KEN') {
        setLoginAttempts(prev => prev + 1);
        throw new Error('Invalid admin token');
      }

      // For demo purposes, we'll use hardcoded credentials
      // In a real app, you would use Supabase Auth
      let userData: User | null = null;

      if (sanitizedEmail === 'admin@prodomo.local' && sanitizedPassword === 'admin123') {
        userData = {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Admin User',
          email: 'admin@prodomo.local',
          grade: 'Admin',
          join_date: new Date().toISOString(),
          last_active: new Date().toISOString(),
          total_downloads: 0,
          is_guest: false,
          is_blocked: false
        };
      } else if (sanitizedEmail === 'v4@prodomo.local' && sanitizedPassword === 'v4pass') {
        userData = {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'V4 User',
          email: 'v4@prodomo.local',
          grade: 'V4',
          join_date: new Date().toISOString(),
          last_active: new Date().toISOString(),
          total_downloads: 0,
          is_guest: false,
          is_blocked: false
        };
      } else if (sanitizedEmail === 'v5@prodomo.local' && sanitizedPassword === 'v5pass') {
        userData = {
          id: '33333333-3333-3333-3333-333333333333',
          name: 'V5 User',
          email: 'v5@prodomo.local',
          grade: 'V5',
          join_date: new Date().toISOString(),
          last_active: new Date().toISOString(),
          total_downloads: 0,
          is_guest: false,
          is_blocked: false
        };
      } else if (sanitizedEmail === 'support@prodomo.local' && sanitizedPassword === 'support123') {
        userData = {
          id: '44444444-4444-4444-4444-444444444444',
          name: 'Support User',
          email: 'support@prodomo.local',
          grade: 'Support',
          join_date: new Date().toISOString(),
          last_active: new Date().toISOString(),
          total_downloads: 0,
          is_guest: false,
          is_blocked: false
        };
      } else {
        setLoginAttempts(prev => prev + 1);
        throw new Error('Invalid credentials');
      }

      if (!userData) {
        throw new Error('User not found');
      }

      // Ensure user exists in Supabase database
      await ensureUserInDatabase(userData);
      
      // Store user in localStorage for persistence
      localStorage.setItem('prodomo_current_user', JSON.stringify(userData));
      
      setUser(userData);
      
      // Reset login attempts on successful login
      setLoginAttempts(0);
      setError(null);
      
      // Show welcome notification
      showNotification.login(userData.name);
      console.log('AuthContext: Sign in successful');
      
    } catch (err) {
      console.error('AuthContext: Sign in error:', err);
      setError(err instanceof Error ? err.message : 'Failed to sign in');
      
      // If too many failed attempts and rate limiting is enabled, apply temporary block
      if (loginAttempts >= 5 && securityManager.getRateLimitStatus('login')) {
        const ip = await securityManager.getUserIP();
        securityManager.blockIP(ip, 15 * 60 * 1000); // 15 minutes
        showNotification.error('Too many failed login attempts. Your IP has been temporarily blocked.', 'Security Alert');
        setLoginAttempts(0);
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signInAsGuest = async () => {
    try {
      // Apply rate limiting for guest sessions
      const rateCheck = await securityManager.checkRateLimit('guest');
      
      console.log('AuthContext: Creating guest session');
      setLoading(true);
      setError(null);
      
      // Check IP protection first
      const ip = await securityManager.getUserIP();
      const blockStatus = isIPBlocked(ip);
      if (blockStatus.blocked) {
        throw new Error(blockStatus.reason || 'IP is blocked from creating guest sessions');
      }

      // Create a temporary guest account
      const guestId = crypto.randomUUID();
      const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

      const guestData: User = {
        id: guestId,
        name: 'Guest User',
        email: `${guestId}@temp.local`,
        grade: 'Guest',
        join_date: new Date().toISOString(),
        last_active: new Date().toISOString(),
        total_downloads: 0,
        is_guest: true,
        guest_expires_at: expiresAt.toISOString(),
        is_blocked: false
      };

      // Register the guest session with IP protection
      const registrationResult = await registerGuestSession(guestId);
      if (!registrationResult.success) {
        throw new Error(registrationResult.error || 'Failed to create guest session');
      }

      // Ensure guest user exists in Supabase database
      await ensureUserInDatabase(guestData);

      // Store guest user in localStorage
      try {
        // Get existing users
        const usersKey = 'prodomo_users';
        const usersJson = localStorage.getItem(usersKey);
        const users = usersJson ? JSON.parse(usersJson) : [];
        
        // Add guest user
        users.push(guestData);
        
        // Save back to localStorage
        localStorage.setItem(usersKey, JSON.stringify(users));
        
        // Also save as current user
        localStorage.setItem('prodomo_current_user', JSON.stringify(guestData));
        
        console.log('Guest user stored in localStorage');
      } catch (storageError) {
        console.error('Failed to store guest user in localStorage:', storageError);
        // Continue anyway
      }

      setUser(guestData);
      setError(null);
      
      // Show guest session notification with IP protection info
      showNotification.guestSession('5 minutes');
      if (isProtectionEnabled()) {
        showNotification.info('Your IP will be blocked for 3 days after this session expires', 'IP Protection Active');
      } else {
        showNotification.info('IP protection is currently disabled', 'Protection Status');
      }
      console.log('AuthContext: Guest session created with IP protection status:', isProtectionEnabled() ? 'enabled' : 'disabled');
      
    } catch (err) {
      console.error('AuthContext: Guest sign in error:', err);
      setError(err instanceof Error ? err.message : 'Failed to create guest session');
      
      // Show specific error for IP blocks
      if (err instanceof Error && (err.message.includes('blocked') || err.message.includes('exceeded'))) {
        showNotification.error(err.message, 'Access Restricted');
      }
      
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const signOut = async () => {
    try {
      console.log('AuthContext: Signing out user');
      
      // If it's a guest user, apply IP protection and clean up from localStorage and database
      if (user?.is_guest) {
        if (isProtectionEnabled()) {
          await expireGuestSession(user.id);
          showNotification.warning('Guest session ended. Your IP is now blocked for 3 days.', 'IP Protection Applied');
        } else {
          showNotification.info('Guest session ended.', 'Session Expired');
        }
        
        // Remove guest user from Supabase database
        try {
          await supabase
            .from('users')
            .delete()
            .eq('id', user.id);
          console.log('Guest user removed from database');
        } catch (deleteError) {
          console.error('Failed to delete guest user from database:', deleteError);
          // Continue anyway
        }
        
        // Try to remove guest user from localStorage
        try {
          const usersKey = 'prodomo_users';
          const usersJson = localStorage.getItem(usersKey);
          if (usersJson) {
            const users = JSON.parse(usersJson);
            const filteredUsers = users.filter((u: any) => u.id !== user.id);
            localStorage.setItem(usersKey, JSON.stringify(filteredUsers));
          }
        } catch (deleteError) {
          console.error('Failed to delete guest user from localStorage:', deleteError);
          // Continue anyway
        }
      } else {
        showNotification.logout();
      }
      
      // Remove current user from localStorage
      localStorage.removeItem('prodomo_current_user');
      
      // Sign out from Supabase
      try {
        await supabase.auth.signOut();
      } catch (signOutError) {
        console.error('Error signing out from Supabase:', signOutError);
        // Continue anyway
      }
      
      setUser(null);
      setTimeRemaining(null);
      setError(null);
      
      console.log('AuthContext: Sign out complete');
    } catch (err) {
      console.error('AuthContext: Error signing out:', err);
    }
  };

  const hasAccess = (requiredGrade: UserGrade): boolean => {
    if (!user) return false;
    
    // Special case for Support role - they can access bug management but not admin features
    if (requiredGrade === 'Support' && user.grade === 'Support') return true;
    
    // Admin can access everything
    if (user.grade === 'Admin') return true;
    
    // Support can access V4 and V5 features
    if (user.grade === 'Support' && (requiredGrade === 'V4' || requiredGrade === 'V5' || requiredGrade === 'Guest')) return true;
    
    const userIndex = gradeHierarchy.indexOf(user.grade);
    const requiredIndex = gradeHierarchy.indexOf(requiredGrade);
    return userIndex >= requiredIndex;
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      error,
      signIn,
      signInAsGuest,
      signOut,
      isAuthenticated: !!user,
      hasAccess,
      timeRemaining
    }}>
      {children}
    </AuthContext.Provider>
  );
};