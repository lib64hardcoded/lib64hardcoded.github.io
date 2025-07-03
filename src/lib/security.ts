// Advanced Security and Rate Limiting System
import { showNotification } from './notifications';

// Rate limiting configuration
interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  blockDuration: number;
  enabled: boolean; // Added enabled flag
}

interface RateLimitEntry {
  count: number;
  firstRequest: number;
  blocked: boolean;
  blockedUntil?: number;
}

interface SecurityEvent {
  id: string;
  type: 'rate_limit' | 'ddos_attempt' | 'suspicious_activity' | 'brute_force';
  ip: string;
  timestamp: string;
  details: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  blocked: boolean;
}

interface DDoSMetrics {
  requestsPerSecond: number;
  uniqueIPs: number;
  suspiciousPatterns: number;
  blockedRequests: number;
  totalRequests: number;
}

class SecurityManager {
  private rateLimits: Map<string, RateLimitEntry> = new Map();
  private securityEvents: SecurityEvent[] = [];
  private ddosMetrics: DDoSMetrics = {
    requestsPerSecond: 0,
    uniqueIPs: 0,
    suspiciousPatterns: 0,
    blockedRequests: 0,
    totalRequests: 0
  };

  // Rate limiting configurations for different endpoints
  private configs: Record<string, RateLimitConfig> = {
    login: { windowMs: 15 * 60 * 1000, maxRequests: 5, blockDuration: 30 * 1000, enabled: false }, // Disabled by default
    api: { windowMs: 60 * 1000, maxRequests: 100, blockDuration: 5 * 60 * 1000, enabled: true },
    download: { windowMs: 60 * 1000, maxRequests: 10, blockDuration: 10 * 60 * 1000, enabled: true },
    guest: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 3, blockDuration: 24 * 60 * 60 * 1000, enabled: true },
    upload: { windowMs: 60 * 1000, maxRequests: 5, blockDuration: 15 * 60 * 1000, enabled: true },
    bruteforce: { windowMs: 5 * 60 * 1000, maxRequests: 10, blockDuration: 60 * 60 * 1000, enabled: true }
  };

  constructor() {
    this.loadFromStorage();
    this.startCleanupInterval();
    this.startMetricsCollection();
  }

  // Get user's IP with multiple fallback methods
  async getUserIP(): Promise<string> {
    try {
      // Try multiple IP detection methods
      const methods = [
        () => this.getIPFromWebRTC(),
        () => this.getIPFromFingerprint(),
        () => this.getIPFromHeaders()
      ];

      for (const method of methods) {
        try {
          const ip = await method();
          if (ip && this.isValidIP(ip)) {
            return ip;
          }
        } catch (error) {
          console.warn('IP detection method failed:', error);
        }
      }

      // Fallback to generated IP
      return this.generateConsistentIP();
    } catch (error) {
      console.error('Failed to get IP:', error);
      return this.generateConsistentIP();
    }
  }

  private async getIPFromWebRTC(): Promise<string> {
    return new Promise((resolve, reject) => {
      const rtc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
      
      rtc.createDataChannel('');
      rtc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          const ipMatch = candidate.match(/(\d+\.\d+\.\d+\.\d+)/);
          if (ipMatch) {
            rtc.close();
            resolve(ipMatch[1]);
          }
        }
      };
      
      rtc.createOffer().then(offer => rtc.setLocalDescription(offer));
      
      setTimeout(() => {
        rtc.close();
        reject(new Error('WebRTC IP detection timeout'));
      }, 3000);
    });
  }

  private async getIPFromFingerprint(): Promise<string> {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas not supported');

    // Create a unique fingerprint
    ctx.textBaseline = 'top';
    ctx.font = '14px Arial';
    ctx.fillText('Security fingerprint', 2, 2);
    
    const fingerprint = canvas.toDataURL();
    const userAgent = navigator.userAgent;
    const screen = `${window.screen.width}x${window.screen.height}`;
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    
    const combined = fingerprint + userAgent + screen + timezone;
    
    // Generate consistent IP from fingerprint
    let hash = 0;
    for (let i = 0; i < combined.length; i++) {
      const char = combined.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    
    const ip1 = Math.abs(hash) % 256;
    const ip2 = Math.abs(hash >> 8) % 256;
    const ip3 = Math.abs(hash >> 16) % 256;
    const ip4 = Math.abs(hash >> 24) % 256;
    
    return `${ip1}.${ip2}.${ip3}.${ip4}`;
  }

  private async getIPFromHeaders(): Promise<string> {
    // In a real application, this would check headers like X-Forwarded-For
    // For demo purposes, we'll simulate this
    const headers = {
      'X-Forwarded-For': '203.0.113.' + (Math.floor(Math.random() * 254) + 1),
      'X-Real-IP': '198.51.100.' + (Math.floor(Math.random() * 254) + 1)
    };
    
    return headers['X-Forwarded-For'] || headers['X-Real-IP'];
  }

  private generateConsistentIP(): string {
    const stored = localStorage.getItem('security_consistent_ip');
    if (stored) return stored;
    
    const ip = `192.168.1.${Math.floor(Math.random() * 254) + 1}`;
    localStorage.setItem('security_consistent_ip', ip);
    return ip;
  }

  private isValidIP(ip: string): boolean {
    const ipRegex = /^(\d{1,3}\.){3}\d{1,3}$/;
    if (!ipRegex.test(ip)) return false;
    
    const parts = ip.split('.').map(Number);
    return parts.every(part => part >= 0 && part <= 255);
  }

  // Toggle rate limiting for a specific endpoint
  toggleRateLimit(endpoint: string, enabled: boolean): boolean {
    if (this.configs[endpoint]) {
      this.configs[endpoint].enabled = enabled;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Get rate limit status for a specific endpoint
  getRateLimitStatus(endpoint: string): boolean {
    return this.configs[endpoint]?.enabled || false;
  }

  // Advanced rate limiting with adaptive thresholds
  async checkRateLimit(endpoint: string, customIP?: string): Promise<{ allowed: boolean; reason?: string; retryAfter?: number }> {
    const ip = customIP || await this.getUserIP();
    const config = this.configs[endpoint] || this.configs.api;
    
    // If rate limiting is disabled for this endpoint, always allow
    if (!config.enabled) {
      return { allowed: true };
    }
    
    const key = `${ip}:${endpoint}`;
    const now = Date.now();

    let entry = this.rateLimits.get(key);
    
    if (!entry) {
      entry = { count: 0, firstRequest: now, blocked: false };
      this.rateLimits.set(key, entry);
    }

    // Check if currently blocked
    if (entry.blocked && entry.blockedUntil && now < entry.blockedUntil) {
      const retryAfter = Math.ceil((entry.blockedUntil - now) / 1000);
      this.logSecurityEvent('rate_limit', ip, `Rate limit exceeded for ${endpoint}`, 'medium', true);
      return { allowed: false, reason: 'Rate limit exceeded', retryAfter };
    }

    // Reset if window expired
    if (now - entry.firstRequest > config.windowMs) {
      entry.count = 0;
      entry.firstRequest = now;
      entry.blocked = false;
      entry.blockedUntil = undefined;
    }

    entry.count++;

    // Check if limit exceeded
    if (entry.count > config.maxRequests) {
      entry.blocked = true;
      entry.blockedUntil = now + config.blockDuration;
      
      this.logSecurityEvent('rate_limit', ip, `Rate limit exceeded for ${endpoint} (${entry.count} requests)`, 'high', true);
      
      const retryAfter = Math.ceil(config.blockDuration / 1000);
      return { allowed: false, reason: 'Rate limit exceeded', retryAfter };
    }

    this.rateLimits.set(key, entry);
    this.saveToStorage();
    
    return { allowed: true };
  }

  // DDoS detection and mitigation
  async detectDDoS(): Promise<{ isDDoS: boolean; severity: string; metrics: DDoSMetrics }> {
    const now = Date.now();
    const oneSecondAgo = now - 1000;
    const oneMinuteAgo = now - 60000;

    // Count recent requests
    const recentEvents = this.securityEvents.filter(event => 
      new Date(event.timestamp).getTime() > oneSecondAgo
    );

    const recentMinuteEvents = this.securityEvents.filter(event => 
      new Date(event.timestamp).getTime() > oneMinuteAgo
    );

    const requestsPerSecond = recentEvents.length;
    const uniqueIPs = new Set(recentMinuteEvents.map(e => e.ip)).size;
    const suspiciousPatterns = this.detectSuspiciousPatterns(recentMinuteEvents);
    const blockedRequests = recentMinuteEvents.filter(e => e.blocked).length;

    this.ddosMetrics = {
      requestsPerSecond,
      uniqueIPs,
      suspiciousPatterns,
      blockedRequests,
      totalRequests: recentMinuteEvents.length
    };

    // DDoS detection thresholds
    const isDDoS = 
      requestsPerSecond > 50 || // More than 50 requests per second
      (uniqueIPs < 5 && recentMinuteEvents.length > 100) || // Few IPs, many requests
      suspiciousPatterns > 10; // Many suspicious patterns

    let severity = 'low';
    if (requestsPerSecond > 100 || suspiciousPatterns > 20) severity = 'critical';
    else if (requestsPerSecond > 75 || suspiciousPatterns > 15) severity = 'high';
    else if (requestsPerSecond > 50 || suspiciousPatterns > 10) severity = 'medium';

    if (isDDoS) {
      this.logSecurityEvent('ddos_attempt', 'multiple', `DDoS detected: ${requestsPerSecond} req/s`, severity as any, true);
      this.activateEmergencyMode();
    }

    return { isDDoS, severity, metrics: this.ddosMetrics };
  }

  private detectSuspiciousPatterns(events: SecurityEvent[]): number {
    let suspiciousCount = 0;

    // Pattern 1: Same IP making too many requests
    const ipCounts = events.reduce((acc, event) => {
      acc[event.ip] = (acc[event.ip] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    Object.values(ipCounts).forEach(count => {
      if (count > 20) suspiciousCount++;
    });

    // Pattern 2: Rapid sequential requests
    const sortedEvents = events.sort((a, b) => 
      new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (let i = 1; i < sortedEvents.length; i++) {
      const timeDiff = new Date(sortedEvents[i].timestamp).getTime() - 
                      new Date(sortedEvents[i-1].timestamp).getTime();
      if (timeDiff < 100 && sortedEvents[i].ip === sortedEvents[i-1].ip) {
        suspiciousCount++;
      }
    }

    return suspiciousCount;
  }

  private activateEmergencyMode(): void {
    // Implement emergency DDoS protection
    console.warn('🚨 EMERGENCY MODE ACTIVATED - DDoS DETECTED');
    
    // Increase rate limiting
    Object.keys(this.configs).forEach(key => {
      this.configs[key].maxRequests = Math.floor(this.configs[key].maxRequests * 0.1);
      this.configs[key].blockDuration *= 2;
    });

    // Show notification
    showNotification.error('DDoS attack detected! Emergency protection activated.', 'Security Alert');
    
    // Auto-disable emergency mode after 10 minutes
    setTimeout(() => {
      this.deactivateEmergencyMode();
    }, 10 * 60 * 1000);
  }

  private deactivateEmergencyMode(): void {
    console.log('🛡️ Emergency mode deactivated');
    
    // Reset rate limiting to normal
    this.configs = {
      login: { windowMs: 15 * 60 * 1000, maxRequests: 5, blockDuration: 30 * 1000, enabled: false },
      api: { windowMs: 60 * 1000, maxRequests: 100, blockDuration: 5 * 60 * 1000, enabled: true },
      download: { windowMs: 60 * 1000, maxRequests: 10, blockDuration: 10 * 60 * 1000, enabled: true },
      guest: { windowMs: 24 * 60 * 60 * 1000, maxRequests: 3, blockDuration: 24 * 60 * 60 * 1000, enabled: true },
      upload: { windowMs: 60 * 1000, maxRequests: 5, blockDuration: 15 * 60 * 1000, enabled: true },
      bruteforce: { windowMs: 5 * 60 * 1000, maxRequests: 10, blockDuration: 60 * 60 * 1000, enabled: true }
    };

    showNotification.success('Emergency protection deactivated. Normal operation resumed.', 'Security Status');
  }

  // Brute force protection
  async checkBruteForce(identifier: string, action: string): Promise<{ allowed: boolean; reason?: string }> {
    const key = `bruteforce:${identifier}:${action}`;
    return this.checkRateLimit('bruteforce', key);
  }

  // Log security events
  private logSecurityEvent(type: SecurityEvent['type'], ip: string, details: string, severity: SecurityEvent['severity'], blocked: boolean = false): void {
    const event: SecurityEvent = {
      id: `sec_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      type,
      ip,
      timestamp: new Date().toISOString(),
      details,
      severity,
      blocked
    };

    this.securityEvents.unshift(event);
    
    // Keep only last 1000 events
    if (this.securityEvents.length > 1000) {
      this.securityEvents = this.securityEvents.slice(0, 1000);
    }

    this.saveToStorage();
    console.log(`🔒 Security Event [${severity.toUpperCase()}]: ${details}`);
  }

  // Get security statistics
  getSecurityStats() {
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const recentEvents = this.securityEvents.filter(event => 
      new Date(event.timestamp).getTime() > oneHourAgo
    );

    const dailyEvents = this.securityEvents.filter(event => 
      new Date(event.timestamp).getTime() > oneDayAgo
    );

    return {
      totalEvents: this.securityEvents.length,
      recentEvents: recentEvents.length,
      dailyEvents: dailyEvents.length,
      blockedRequests: this.securityEvents.filter(e => e.blocked).length,
      criticalEvents: this.securityEvents.filter(e => e.severity === 'critical').length,
      ddosMetrics: this.ddosMetrics,
      rateLimitedIPs: Array.from(this.rateLimits.entries())
        .filter(([_, entry]) => entry.blocked)
        .map(([key, entry]) => ({
          key,
          blockedUntil: entry.blockedUntil,
          count: entry.count
        })),
      rateLimitConfigs: this.configs
    };
  }

  // Get security events for dashboard
  getSecurityEvents(limit: number = 50): SecurityEvent[] {
    return this.securityEvents.slice(0, limit);
  }

  // Clear security events
  clearSecurityEvents(): void {
    this.securityEvents = [];
    this.saveToStorage();
  }

  // Unblock IP manually
  unblockIP(ip: string): boolean {
    let unblocked = false;
    
    for (const [key, entry] of this.rateLimits.entries()) {
      if (key.startsWith(ip + ':')) {
        entry.blocked = false;
        entry.blockedUntil = undefined;
        entry.count = 0;
        unblocked = true;
      }
    }
    
    if (unblocked) {
      this.saveToStorage();
      this.logSecurityEvent('rate_limit', ip, 'IP manually unblocked by admin', 'low', false);
    }
    
    return unblocked;
  }

  // Block IP manually
  blockIP(ip: string, duration: number = 60 * 60 * 1000): boolean {
    const now = Date.now();
    let blocked = false;
    
    // Block all endpoints for this IP
    Object.keys(this.configs).forEach(endpoint => {
      const key = `${ip}:${endpoint}`;
      this.rateLimits.set(key, {
        count: 999,
        firstRequest: now,
        blocked: true,
        blockedUntil: now + duration
      });
      blocked = true;
    });
    
    if (blocked) {
      this.saveToStorage();
      this.logSecurityEvent('rate_limit', ip, `IP manually blocked by admin for ${duration/1000}s`, 'high', true);
    }
    
    return blocked;
  }

  // Storage management
  private saveToStorage(): void {
    try {
      const data = {
        rateLimits: Array.from(this.rateLimits.entries()),
        securityEvents: this.securityEvents.slice(0, 500), // Save only recent events
        ddosMetrics: this.ddosMetrics,
        configs: this.configs
      };
      localStorage.setItem('security_manager_data', JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save security data:', error);
    }
  }

  private loadFromStorage(): void {
    try {
      const stored = localStorage.getItem('security_manager_data');
      if (stored) {
        const data = JSON.parse(stored);
        this.rateLimits = new Map(data.rateLimits || []);
        this.securityEvents = data.securityEvents || [];
        this.ddosMetrics = data.ddosMetrics || this.ddosMetrics;
        
        // Load configs but ensure all required fields exist
        if (data.configs) {
          Object.keys(data.configs).forEach(key => {
            if (this.configs[key]) {
              this.configs[key] = {
                ...this.configs[key],
                ...data.configs[key],
                // Ensure enabled property exists
                enabled: data.configs[key].hasOwnProperty('enabled') 
                  ? data.configs[key].enabled 
                  : this.configs[key].enabled
              };
            }
          });
        }
      }
    } catch (error) {
      console.error('Failed to load security data:', error);
    }
  }

  // Cleanup expired entries
  private startCleanupInterval(): void {
    setInterval(() => {
      const now = Date.now();
      
      // Clean up expired rate limits
      for (const [key, entry] of this.rateLimits.entries()) {
        if (entry.blockedUntil && now > entry.blockedUntil) {
          entry.blocked = false;
          entry.blockedUntil = undefined;
        }
        
        // Remove very old entries
        if (now - entry.firstRequest > 24 * 60 * 60 * 1000) {
          this.rateLimits.delete(key);
        }
      }
      
      // Clean up old security events
      const oneDayAgo = now - 24 * 60 * 60 * 1000;
      this.securityEvents = this.securityEvents.filter(event => 
        new Date(event.timestamp).getTime() > oneDayAgo
      );
      
      this.saveToStorage();
    }, 5 * 60 * 1000); // Every 5 minutes
  }

  // Start metrics collection
  private startMetricsCollection(): void {
    setInterval(() => {
      this.detectDDoS();
    }, 1000); // Every second
  }
}

// Create singleton instance
export const securityManager = new SecurityManager();

// Security middleware for API calls
export const withSecurity = async <T>(operation: string, fn: () => Promise<T>): Promise<T> => {
  try {
    const rateCheck = await securityManager.checkRateLimit(operation);
    
    if (!rateCheck.allowed) {
      throw new Error(`Rate limit exceeded. ${rateCheck.reason}. Retry after ${rateCheck.retryAfter} seconds.`);
    }
    
    return await fn();
  } catch (error) {
    // Log failed operations for brute force detection
    const ip = await securityManager.getUserIP();
    await securityManager.checkBruteForce(ip, operation);
    throw error;
  }
};

// Input sanitization
export const sanitizeInput = (input: string): string => {
  if (!input) return '';
  
  return input
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocols
    .replace(/on\w+=/gi, '') // Remove event handlers
    .trim()
    .substring(0, 1000); // Limit length
};

// SQL injection prevention (for demo purposes)
export const sanitizeSQL = (input: string): string => {
  if (!input) return '';
  
  return input
    .replace(/['";\\]/g, '') // Remove SQL injection characters
    .replace(/\b(DROP|DELETE|INSERT|UPDATE|SELECT|UNION|ALTER|CREATE)\b/gi, '') // Remove SQL keywords
    .trim();
};

// XSS prevention
export const sanitizeHTML = (input: string): string => {
  if (!input) return '';
  
  const div = document.createElement('div');
  div.textContent = input;
  return div.innerHTML;
};

// CSRF token generation
export const generateCSRFToken = (): string => {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
};

// Secure random string generation
export const generateSecureRandom = (length: number = 32): string => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, byte => chars[byte % chars.length]).join('');
};

export default securityManager;