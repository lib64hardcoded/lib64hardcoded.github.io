import React, { useState, useEffect } from 'react';
import { X, Mail, Lock, Clock, AlertCircle, Shield, Globe, ToggleLeft, ToggleRight, LogIn, HeadsetIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getUserIP, isIPBlocked, isProtectionEnabled } from '../lib/ipProtection';
import { securityManager } from '../lib/security';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose }) => {
  const { signIn, signInAsGuest, loading, error: authError } = useAuth();
  const [mode, setMode] = useState<'signin' | 'guest'>('signin');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    adminToken: ''
  });
  const [ipStatus, setIPStatus] = useState<{ blocked: boolean; reason?: string; unblockTime?: string } | null>(null);
  const [userIP, setUserIP] = useState<string>('');
  const [checkingIP, setCheckingIP] = useState(false);
  const [protectionEnabled, setProtectionEnabled] = useState(isProtectionEnabled());
  const [loginCooldown, setLoginCooldown] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      checkIPStatus();
      checkLoginCooldown();
    }
  }, [isOpen]);

  useEffect(() => {
    // Update protection status when it changes
    setProtectionEnabled(isProtectionEnabled());
  }, [isOpen, mode]);

  // Update local error state when auth error changes
  useEffect(() => {
    if (authError) {
      setError(authError);
    }
  }, [authError]);

  // Check if there's a login cooldown period
  const checkLoginCooldown = () => {
    const cooldownData = localStorage.getItem('login_cooldown');
    if (cooldownData) {
      try {
        const { until } = JSON.parse(cooldownData);
        const now = Date.now();
        if (until > now) {
          setLoginCooldown(Math.ceil((until - now) / 1000));
          
          // Set up countdown timer
          const timer = setInterval(() => {
            setLoginCooldown(prev => {
              if (prev === null || prev <= 1) {
                clearInterval(timer);
                localStorage.removeItem('login_cooldown');
                return null;
              }
              return prev - 1;
            });
          }, 1000);
          
          return () => clearInterval(timer);
        } else {
          localStorage.removeItem('login_cooldown');
        }
      } catch (error) {
        console.error('Failed to parse login cooldown:', error);
        localStorage.removeItem('login_cooldown');
      }
    }
  };

  const checkIPStatus = async () => {
    setCheckingIP(true);
    try {
      const ip = await getUserIP();
      setUserIP(ip);
      const status = isIPBlocked(ip);
      setIPStatus(status);
    } catch (error) {
      console.error('Failed to check IP status:', error);
    } finally {
      setCheckingIP(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    
    try {
      // Check for cooldown first
      if (loginCooldown !== null) {
        showCooldownError();
        return;
      }
      
      if (mode === 'guest') {
        // Check IP status again before proceeding
        const status = isIPBlocked(userIP);
        if (status.blocked) {
          setIPStatus(status);
          return;
        }
        
        await signInAsGuest();
      } else {
        await signIn(formData.email, formData.password, formData.adminToken);
      }
      onClose();
    } catch (err: any) {
      // Set local error state
      setError(err.message || 'Authentication failed');
      console.error('Auth error:', err);
      
      // If rate limit error, set cooldown
      if (err.message && err.message.includes('Rate limit exceeded')) {
        const match = err.message.match(/(\d+) seconds/);
        if (match && match[1]) {
          const seconds = parseInt(match[1], 10);
          // Use 30 seconds instead of the original value
          const cooldownSeconds = Math.min(30, seconds);
          const until = Date.now() + (cooldownSeconds * 1000);
          localStorage.setItem('login_cooldown', JSON.stringify({ until }));
          setLoginCooldown(cooldownSeconds);
        }
      }
    }
  };

  const isAdminLogin = formData.email.includes('admin') || formData.adminToken;

  const handleQuickLogin = async (email: string, password: string, token?: string) => {
    try {
      setError(null);
      
      // Check for cooldown first
      if (loginCooldown !== null) {
        showCooldownError();
        return;
      }
      
      await signIn(email, password, token);
      onClose();
    } catch (err) {
      // Set local error state
      setError(err instanceof Error ? err.message : 'Quick login failed');
      console.error('Quick login error:', err);
      
      // If rate limit error, set cooldown
      if (err instanceof Error && err.message.includes('Rate limit exceeded')) {
        const match = err.message.match(/(\d+) seconds/);
        if (match && match[1]) {
          const seconds = parseInt(match[1], 10);
          // Use 30 seconds instead of the original value
          const cooldownSeconds = Math.min(30, seconds);
          const until = Date.now() + (cooldownSeconds * 1000);
          localStorage.setItem('login_cooldown', JSON.stringify({ until }));
          setLoginCooldown(cooldownSeconds);
        }
      }
    }
  };
  
  const showCooldownError = () => {
    setError(`Too many login attempts. Please try again in ${loginCooldown} seconds.`);
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={onClose}></div>
        
        <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-md sm:w-full sm:p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-medium text-gray-900 dark:text-white">
              {mode === 'guest' ? 'Guest Access' : 'Sign In'}
            </h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
            >
              <X size={24} />
            </button>
          </div>

          {error && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <AlertCircle className="text-red-600 dark:text-red-400 w-5 h-5 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300" id="login-error">{error}</p>
              </div>
            </div>
          )}

          {loginCooldown !== null && (
            <div className="mb-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
              <div className="flex items-start space-x-2">
                <Clock className="text-red-600 dark:text-red-400 w-5 h-5 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-700 dark:text-red-300">
                  Too many login attempts. Please try again in {loginCooldown} seconds.
                </p>
              </div>
            </div>
          )}

          <div className="flex space-x-1 mb-6 bg-gray-100 dark:bg-gray-700 rounded-lg p-1">
            <button
              onClick={() => setMode('signin')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200 ${
                mode === 'signin'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => setMode('guest')}
              className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors duration-200 ${
                mode === 'guest'
                  ? 'bg-white dark:bg-gray-600 text-gray-900 dark:text-white shadow-sm'
                  : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
              }`}
            >
              Guest (5 min)
            </button>
          </div>

          {mode === 'guest' ? (
            <div className="space-y-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Clock className="text-blue-600 dark:text-blue-400 w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                      5-Minute Guest Access
                    </h4>
                    <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                      Get temporary access to download test clients and view patch notes. 
                      Your session will expire after 5 minutes.
                    </p>
                  </div>
                </div>
              </div>
              
              {/* IP Protection Info */}
              <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-4">
                <div className="flex items-start space-x-3">
                  <Shield className="text-amber-600 dark:text-amber-400 w-5 h-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        IP Protection {protectionEnabled ? 'Active' : 'Inactive'}
                      </h4>
                      {protectionEnabled ? (
                        <ToggleRight className="w-5 h-5 text-emerald-500" />
                      ) : (
                        <ToggleLeft className="w-5 h-5 text-red-500" />
                      )}
                    </div>
                    <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                      {protectionEnabled 
                        ? 'To prevent abuse, your IP address will be blocked for 3 days after your guest session expires.' 
                        : 'IP protection is currently disabled. Your IP will not be blocked after session expiry.'}
                    </p>
                    {userIP && (
                      <div className="flex items-center space-x-2 mt-2">
                        <Globe size={14} className="text-amber-600 dark:text-amber-400" />
                        <span className="text-xs font-mono text-amber-800 dark:text-amber-200">
                          Your IP: {userIP}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
              
              {/* IP Block Status */}
              {ipStatus?.blocked && (
                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="text-red-600 dark:text-red-400 w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-red-800 dark:text-red-200">
                        Access Restricted
                      </h4>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        {ipStatus.reason}
                      </p>
                      {ipStatus.unblockTime && (
                        <p className="text-xs text-red-600 dark:text-red-400 mt-2">
                          Block expires: {new Date(ipStatus.unblockTime).toLocaleString()}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              )}
              
              <button
                onClick={handleSubmit}
                disabled={loading || checkingIP || (ipStatus?.blocked || false) || loginCooldown !== null}
                className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200"
              >
                <Clock size={18} />
                <span>
                  {loading ? 'Creating Guest Session...' : 
                   checkingIP ? 'Checking IP Status...' : 
                   ipStatus?.blocked ? 'IP Blocked' : 
                   loginCooldown !== null ? `Try again in ${loginCooldown}s` :
                   'Start Guest Session'}
                </span>
              </button>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Quick Login Buttons for Demo */}
              <div className="space-y-2">
                <p className="text-sm text-gray-600 dark:text-gray-400">Quick Login (Demo):</p>
                <div className="grid grid-cols-1 gap-2">
                  <button
                    onClick={() => handleQuickLogin('admin@prodomo.local', 'admin123', 'T0KEN')}
                    disabled={loading || loginCooldown !== null}
                    className="flex items-center justify-center space-x-2 px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900/20 dark:hover:bg-red-900/30 text-red-800 dark:text-red-200 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50"
                  >
                    <Shield size={16} />
                    <span>{loading ? 'Signing in...' : loginCooldown !== null ? `Cooldown: ${loginCooldown}s` : 'Admin Login'}</span>
                  </button>
                  <button
                    onClick={() => handleQuickLogin('support@prodomo.local', 'support123')}
                    disabled={loading || loginCooldown !== null}
                    className="flex items-center justify-center space-x-2 px-3 py-2 bg-amber-100 hover:bg-amber-200 dark:bg-amber-900/20 dark:hover:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50"
                  >
                    <HeadsetIcon size={16} />
                    <span>{loading ? 'Signing in...' : loginCooldown !== null ? `Cooldown: ${loginCooldown}s` : 'Support Login'}</span>
                  </button>
                  <button
                    onClick={() => handleQuickLogin('v4@prodomo.local', 'v4pass')}
                    disabled={loading || loginCooldown !== null}
                    className="flex items-center justify-center space-x-2 px-3 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-800 dark:text-blue-200 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50"
                  >
                    <Mail size={16} />
                    <span>{loading ? 'Signing in...' : loginCooldown !== null ? `Cooldown: ${loginCooldown}s` : 'V4 User Login'}</span>
                  </button>
                  <button
                    onClick={() => handleQuickLogin('v5@prodomo.local', 'v5pass')}
                    disabled={loading || loginCooldown !== null}
                    className="flex items-center justify-center space-x-2 px-3 py-2 bg-purple-100 hover:bg-purple-200 dark:bg-purple-900/20 dark:hover:bg-purple-900/30 text-purple-800 dark:text-purple-200 rounded-lg text-sm font-medium transition-colors duration-200 disabled:opacity-50"
                  >
                    <Mail size={16} />
                    <span>{loading ? 'Signing in...' : loginCooldown !== null ? `Cooldown: ${loginCooldown}s` : 'V5 User Login'}</span>
                  </button>
                </div>
              </div>

              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-300 dark:border-gray-600" />
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-2 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or sign in manually</span>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your email"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="password"
                      value={formData.password}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter your password"
                      required
                    />
                  </div>
                </div>

                {isAdminLogin && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Admin Token
                    </label>
                    <div className="relative">
                      <Shield className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <input
                        type="password"
                        value={formData.adminToken}
                        onChange={(e) => setFormData({...formData, adminToken: e.target.value})}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                        placeholder="Enter admin token (T0KEN)"
                        required
                      />
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Admin accounts require a special token for security
                    </p>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || loginCooldown !== null}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200"
                >
                  <span>
                    {loading ? 'Signing in...' : 
                     loginCooldown !== null ? `Try again in ${loginCooldown}s` : 
                     'Sign In'}
                  </span>
                </button>

                <div className="text-center">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    Only admins can create new accounts. Contact an administrator for access.
                  </p>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthModal;