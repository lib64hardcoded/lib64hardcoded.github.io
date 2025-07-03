// IP Protection System for Guest Users
// Prevents abuse by tracking IPs and implementing cooldowns

export interface IPRecord {
  ip: string;
  lastGuestSession: string;
  blockedUntil?: string;
  attemptCount: number;
  firstAttempt: string;
  userAgent?: string;
  location?: string;
}

export interface GuestSession {
  id: string;
  ip: string;
  userAgent: string;
  startTime: string;
  endTime?: string;
  expired: boolean;
  userId: string;
}

const IP_STORAGE_KEY = 'prodomo_ip_records';
const GUEST_SESSIONS_KEY = 'prodomo_guest_sessions';
const IP_PROTECTION_ENABLED_KEY = 'prodomo_ip_protection_enabled';
const BLOCK_DURATION = 3 * 24 * 60 * 60 * 1000; // 3 days in milliseconds
const MAX_ATTEMPTS_PER_DAY = 3; // Maximum guest sessions per IP per day

// Check if IP protection is enabled
export const isProtectionEnabled = (): boolean => {
  try {
    const enabled = localStorage.getItem(IP_PROTECTION_ENABLED_KEY);
    // Default to enabled if not set
    return enabled === null ? true : enabled === 'true';
  } catch (error) {
    console.error('Failed to check IP protection status:', error);
    return true; // Default to enabled on error
  }
};

// Enable or disable IP protection
export const setProtectionEnabled = (enabled: boolean): void => {
  try {
    localStorage.setItem(IP_PROTECTION_ENABLED_KEY, enabled.toString());
    console.log(`IP Protection ${enabled ? 'enabled' : 'disabled'}`);
  } catch (error) {
    console.error('Failed to set IP protection status:', error);
  }
};

// Get user's IP address (mock implementation for demo)
export const getUserIP = async (): Promise<string> => {
  try {
    // In production, you would use a service like ipapi.co or ipinfo.io
    // For demo purposes, we'll generate a consistent IP based on browser fingerprint
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('IP fingerprint', 2, 2);
      const fingerprint = canvas.toDataURL();
      
      // Generate a pseudo-IP from the fingerprint
      let hash = 0;
      for (let i = 0; i < fingerprint.length; i++) {
        const char = fingerprint.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32-bit integer
      }
      
      // Convert hash to IP-like format
      const ip1 = Math.abs(hash) % 256;
      const ip2 = Math.abs(hash >> 8) % 256;
      const ip3 = Math.abs(hash >> 16) % 256;
      const ip4 = Math.abs(hash >> 24) % 256;
      
      return `${ip1}.${ip2}.${ip3}.${ip4}`;
    }
    
    // Fallback IP
    return '192.168.1.' + (Math.floor(Math.random() * 254) + 1);
  } catch (error) {
    console.error('Failed to get IP:', error);
    return '192.168.1.' + (Math.floor(Math.random() * 254) + 1);
  }
};

// Get stored IP records
export const getIPRecords = (): IPRecord[] => {
  try {
    const stored = localStorage.getItem(IP_STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load IP records:', error);
    return [];
  }
};

// Save IP records
export const saveIPRecords = (records: IPRecord[]): void => {
  try {
    localStorage.setItem(IP_STORAGE_KEY, JSON.stringify(records));
  } catch (error) {
    console.error('Failed to save IP records:', error);
  }
};

// Get stored guest sessions
export const getGuestSessions = (): GuestSession[] => {
  try {
    const stored = localStorage.getItem(GUEST_SESSIONS_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch (error) {
    console.error('Failed to load guest sessions:', error);
    return [];
  }
};

// Save guest sessions
export const saveGuestSessions = (sessions: GuestSession[]): void => {
  try {
    localStorage.setItem(GUEST_SESSIONS_KEY, JSON.stringify(sessions));
  } catch (error) {
    console.error('Failed to save guest sessions:', error);
  }
};

// Check if IP is currently blocked
export const isIPBlocked = (ip: string): { blocked: boolean; reason?: string; unblockTime?: string } => {
  // If protection is disabled, always return not blocked
  if (!isProtectionEnabled()) {
    return { blocked: false };
  }
  
  const records = getIPRecords();
  const record = records.find(r => r.ip === ip);
  
  if (!record) {
    return { blocked: false };
  }
  
  // Check if IP is explicitly blocked
  if (record.blockedUntil) {
    const blockedUntil = new Date(record.blockedUntil);
    const now = new Date();
    
    if (now < blockedUntil) {
      const hoursRemaining = Math.ceil((blockedUntil.getTime() - now.getTime()) / (1000 * 60 * 60));
      return {
        blocked: true,
        reason: `IP blocked due to guest session abuse. ${hoursRemaining} hours remaining.`,
        unblockTime: record.blockedUntil
      };
    } else {
      // Block has expired, remove it
      record.blockedUntil = undefined;
      record.attemptCount = 0;
      saveIPRecords(records);
    }
  }
  
  // Check daily attempt limit
  const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const sessions = getGuestSessions();
  const recentSessions = sessions.filter(s => 
    s.ip === ip && new Date(s.startTime) > oneDayAgo
  );
  
  if (recentSessions.length >= MAX_ATTEMPTS_PER_DAY) {
    return {
      blocked: true,
      reason: `Maximum ${MAX_ATTEMPTS_PER_DAY} guest sessions per day exceeded. Try again tomorrow.`
    };
  }
  
  return { blocked: false };
};

// Register a new guest session
export const registerGuestSession = async (userId: string): Promise<{ success: boolean; error?: string }> => {
  try {
    const ip = await getUserIP();
    const userAgent = navigator.userAgent;
    
    // Check if IP is blocked
    const blockStatus = isIPBlocked(ip);
    if (blockStatus.blocked) {
      return {
        success: false,
        error: blockStatus.reason
      };
    }
    
    // Create new guest session
    const newSession: GuestSession = {
      id: `guest_session_${Date.now()}`,
      ip,
      userAgent,
      startTime: new Date().toISOString(),
      expired: false,
      userId
    };
    
    // Save session
    const sessions = getGuestSessions();
    sessions.push(newSession);
    saveGuestSessions(sessions);
    
    // Update IP record
    const records = getIPRecords();
    let record = records.find(r => r.ip === ip);
    
    if (!record) {
      record = {
        ip,
        lastGuestSession: new Date().toISOString(),
        attemptCount: 1,
        firstAttempt: new Date().toISOString(),
        userAgent,
        location: 'Unknown' // In production, you'd get this from IP geolocation
      };
      records.push(record);
    } else {
      record.lastGuestSession = new Date().toISOString();
      record.attemptCount += 1;
      record.userAgent = userAgent;
    }
    
    saveIPRecords(records);
    
    console.log('🛡️ Guest session registered for IP:', ip);
    return { success: true };
    
  } catch (error) {
    console.error('Failed to register guest session:', error);
    return {
      success: false,
      error: 'Failed to register guest session'
    };
  }
};

// Mark guest session as expired and apply protection
export const expireGuestSession = async (userId: string): Promise<void> => {
  try {
    // If protection is disabled, just mark the session as expired without blocking
    if (!isProtectionEnabled()) {
      // Update session as expired without blocking IP
      const sessions = getGuestSessions();
      const session = sessions.find(s => s.userId === userId && !s.expired);
      
      if (session) {
        session.expired = true;
        session.endTime = new Date().toISOString();
        saveGuestSessions(sessions);
      }
      
      return;
    }
    
    const ip = await getUserIP();
    
    // Update session as expired
    const sessions = getGuestSessions();
    const session = sessions.find(s => s.userId === userId && !s.expired);
    
    if (session) {
      session.expired = true;
      session.endTime = new Date().toISOString();
      saveGuestSessions(sessions);
    }
    
    // Apply 3-day block to IP
    const records = getIPRecords();
    let record = records.find(r => r.ip === ip);
    
    if (record) {
      const blockUntil = new Date(Date.now() + BLOCK_DURATION);
      record.blockedUntil = blockUntil.toISOString();
      record.lastGuestSession = new Date().toISOString();
      
      saveIPRecords(records);
      
      console.log('🚫 IP blocked for 3 days:', ip, 'until:', blockUntil.toLocaleString());
    }
    
  } catch (error) {
    console.error('Failed to expire guest session:', error);
  }
};

// Get IP statistics for admin dashboard
export const getIPStatistics = () => {
  const records = getIPRecords();
  const sessions = getGuestSessions();
  const now = new Date();
  
  const blockedIPs = records.filter(r => {
    if (!r.blockedUntil) return false;
    return new Date(r.blockedUntil) > now;
  });
  
  const recentSessions = sessions.filter(s => {
    const sessionTime = new Date(s.startTime);
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    return sessionTime > oneDayAgo;
  });
  
  const uniqueIPsToday = new Set(recentSessions.map(s => s.ip)).size;
  
  return {
    totalTrackedIPs: records.length,
    blockedIPs: blockedIPs.length,
    guestSessionsToday: recentSessions.length,
    uniqueIPsToday,
    records: records.slice(0, 10), // Return top 10 for display
    recentSessions: sessions.slice(-10), // Return last 10 sessions
    protectionEnabled: isProtectionEnabled()
  };
};

// Clean up old records (call this periodically)
export const cleanupOldRecords = (): void => {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    
    // Clean up old IP records
    const records = getIPRecords();
    const activeRecords = records.filter(r => {
      const lastSession = new Date(r.lastGuestSession);
      return lastSession > thirtyDaysAgo || (r.blockedUntil && new Date(r.blockedUntil) > new Date());
    });
    
    if (activeRecords.length !== records.length) {
      saveIPRecords(activeRecords);
      console.log('🧹 Cleaned up', records.length - activeRecords.length, 'old IP records');
    }
    
    // Clean up old sessions
    const sessions = getGuestSessions();
    const activeSessions = sessions.filter(s => {
      const sessionTime = new Date(s.startTime);
      return sessionTime > thirtyDaysAgo;
    });
    
    if (activeSessions.length !== sessions.length) {
      saveGuestSessions(activeSessions);
      console.log('🧹 Cleaned up', sessions.length - activeSessions.length, 'old guest sessions');
    }
    
  } catch (error) {
    console.error('Failed to cleanup old records:', error);
  }
};

// Force unblock an IP (admin function)
export const forceUnblockIP = (ip: string): boolean => {
  try {
    const records = getIPRecords();
    const record = records.find(r => r.ip === ip);
    
    if (record) {
      record.blockedUntil = undefined;
      record.attemptCount = 0;
      saveIPRecords(records);
      console.log('🔓 Force unblocked IP:', ip);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error('Failed to force unblock IP:', error);
    return false;
  }
};

// Get detailed IP information
export const getIPDetails = (ip: string): IPRecord | null => {
  const records = getIPRecords();
  return records.find(r => r.ip === ip) || null;
};