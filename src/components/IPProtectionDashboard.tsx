import React, { useState, useEffect } from 'react';
import {
  Shield,
  Globe,
  Clock,
  Users,
  AlertTriangle,
  CheckCircle,
  X,
  RefreshCw,
  Unlock,
  Eye,
  Calendar,
  Activity,
  Ban,
  TrendingUp,
  ToggleLeft,
  ToggleRight,
  Lock,
  Settings
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { 
  getIPStatistics, 
  getIPRecords, 
  forceUnblockIP, 
  getIPDetails, 
  cleanupOldRecords,
  isProtectionEnabled,
  setProtectionEnabled,
  IPRecord,
  GuestSession 
} from '../lib/ipProtection';
import { showNotification } from '../lib/notifications';
import { securityManager } from '../lib/security';

const IPProtectionDashboard: React.FC = () => {
  const { hasAccess } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [selectedIP, setSelectedIP] = useState<string | null>(null);
  const [ipDetails, setIPDetails] = useState<IPRecord | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [loading, setLoading] = useState(false);
  const [protectionEnabled, setProtectionEnabledState] = useState(isProtectionEnabled());
  const [securityStats, setSecurityStats] = useState<any>(null);
  const [loginRateLimitEnabled, setLoginRateLimitEnabled] = useState(false);

  useEffect(() => {
    loadStats();
    loadSecurityStats();
  }, [protectionEnabled]);

  const loadStats = () => {
    setLoading(true);
    try {
      const statistics = getIPStatistics();
      setStats(statistics);
    } catch (error) {
      console.error('Failed to load IP statistics:', error);
      showNotification.error('Failed to load IP protection statistics');
    } finally {
      setLoading(false);
    }
  };

  const loadSecurityStats = () => {
    try {
      const stats = securityManager.getSecurityStats();
      setSecurityStats(stats);
      
      // Check if login rate limiting is enabled
      setLoginRateLimitEnabled(securityManager.getRateLimitStatus('login'));
    } catch (error) {
      console.error('Failed to load security stats:', error);
    }
  };

  const handleUnblockIP = (ip: string) => {
    if (confirm(`Are you sure you want to unblock IP ${ip}?`)) {
      const success = forceUnblockIP(ip);
      if (success) {
        // Also unblock in security manager
        securityManager.unblockIP(ip);
        
        showNotification.ipUnblocked(ip);
        loadStats();
        loadSecurityStats();
        if (selectedIP === ip) {
          setShowDetails(false);
        }
      } else {
        showNotification.error('Failed to unblock IP');
      }
    }
  };

  const handleViewDetails = (ip: string) => {
    const details = getIPDetails(ip);
    setIPDetails(details);
    setSelectedIP(ip);
    setShowDetails(true);
  };

  const handleCleanup = () => {
    if (confirm('This will remove old IP records and sessions. Continue?')) {
      cleanupOldRecords();
      loadStats();
      showNotification.success('Old records cleaned up successfully');
    }
  };

  const toggleProtection = () => {
    const newState = !protectionEnabled;
    setProtectionEnabled(newState);
    setProtectionEnabledState(newState);
    
    if (newState) {
      showNotification.success('IP Protection has been enabled', 'Protection Active');
    } else {
      showNotification.warning('IP Protection has been disabled', 'Protection Inactive');
    }
    
    loadStats();
  };

  const toggleLoginRateLimit = () => {
    const newState = !loginRateLimitEnabled;
    securityManager.toggleRateLimit('login', newState);
    setLoginRateLimitEnabled(newState);
    
    if (newState) {
      showNotification.success('Login rate limiting has been enabled', 'Protection Active');
    } else {
      showNotification.warning('Login rate limiting has been disabled', 'Protection Inactive');
    }
    
    loadSecurityStats();
  };

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  const formatTimeRemaining = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInMs = date.getTime() - now.getTime();
    
    if (diffInMs <= 0) return 'Expired';
    
    const hours = Math.floor(diffInMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffInMs % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 24) {
      const days = Math.floor(hours / 24);
      return `${days}d ${hours % 24}h`;
    }
    
    return `${hours}h ${minutes}m`;
  };

  const isIPCurrentlyBlocked = (record: IPRecord) => {
    if (!record.blockedUntil) return false;
    return new Date(record.blockedUntil) > new Date();
  };

  if (!hasAccess('Admin')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Restricted</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You need Admin privileges to access IP protection dashboard.
          </p>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">IP Protection Dashboard</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Monitor and manage IP-based protection for guest users.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={handleCleanup}
            className="flex items-center space-x-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors duration-200"
          >
            <Activity size={18} />
            <span>Cleanup Old Records</span>
          </button>
          <button
            onClick={loadStats}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Protection Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${protectionEnabled ? 'bg-emerald-100 dark:bg-emerald-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
              <Shield className={`w-6 h-6 ${protectionEnabled ? 'text-emerald-500' : 'text-red-500'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                IP Protection System
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {protectionEnabled 
                  ? 'Protection is active - Guest IPs will be blocked for 3 days after session expiry' 
                  : 'Protection is disabled - Guest IPs will not be blocked after session expiry'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleProtection}
            className={`mt-4 sm:mt-0 flex items-center space-x-2 px-6 py-3 ${
              protectionEnabled 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'bg-red-600 hover:bg-red-700'
            } text-white rounded-lg font-medium transition-colors duration-200`}
          >
            {protectionEnabled ? (
              <>
                <ToggleRight size={20} />
                <span>Protection Enabled</span>
              </>
            ) : (
              <>
                <ToggleLeft size={20} />
                <span>Protection Disabled</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Login Rate Limiting Toggle */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center space-x-3">
            <div className={`p-3 rounded-lg ${loginRateLimitEnabled ? 'bg-emerald-100 dark:bg-emerald-900/20' : 'bg-red-100 dark:bg-red-900/20'}`}>
              <Lock className={`w-6 h-6 ${loginRateLimitEnabled ? 'text-emerald-500' : 'text-red-500'}`} />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Login Rate Limiting
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {loginRateLimitEnabled 
                  ? 'Rate limiting is active - Too many login attempts will be temporarily blocked' 
                  : 'Rate limiting is disabled - No cooldown for failed login attempts'}
              </p>
            </div>
          </div>
          <button
            onClick={toggleLoginRateLimit}
            className={`mt-4 sm:mt-0 flex items-center space-x-2 px-6 py-3 ${
              loginRateLimitEnabled 
                ? 'bg-emerald-600 hover:bg-emerald-700' 
                : 'bg-red-600 hover:bg-red-700'
            } text-white rounded-lg font-medium transition-colors duration-200`}
          >
            {loginRateLimitEnabled ? (
              <>
                <ToggleRight size={20} />
                <span>Rate Limiting Enabled</span>
              </>
            ) : (
              <>
                <ToggleLeft size={20} />
                <span>Rate Limiting Disabled</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        {[
          {
            title: 'Tracked IPs',
            value: stats.totalTrackedIPs,
            icon: Globe,
            color: 'bg-blue-500',
            description: 'Total IPs in system'
          },
          {
            title: 'Blocked IPs',
            value: stats.blockedIPs,
            icon: Ban,
            color: 'bg-red-500',
            description: 'Currently blocked'
          },
          {
            title: 'Sessions Today',
            value: stats.guestSessionsToday,
            icon: Users,
            color: 'bg-emerald-500',
            description: 'Guest sessions today'
          },
          {
            title: 'Unique IPs Today',
            value: stats.uniqueIPsToday,
            icon: TrendingUp,
            color: 'bg-purple-500',
            description: 'Different IPs today'
          }
        ].map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {stat.value}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {stat.description}
                  </p>
                </div>
                <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}>
                  <IconComponent className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Security Stats */}
      {securityStats && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center space-x-3 mb-4">
            <Settings className="w-5 h-5 text-blue-500" />
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Security Settings</h3>
          </div>
          
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Rate Limiting Configuration</h4>
                <div className="space-y-3">
                  {Object.entries(securityStats.rateLimitConfigs || {}).map(([endpoint, config]: [string, any]) => (
                    <div key={endpoint} className="flex items-center justify-between">
                      <div>
                        <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">{endpoint}</span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {config.maxRequests} requests / {Math.round(config.windowMs / 1000)}s
                        </p>
                      </div>
                      <button
                        onClick={() => {
                          securityManager.toggleRateLimit(endpoint, !config.enabled);
                          loadSecurityStats();
                          if (endpoint === 'login') {
                            setLoginRateLimitEnabled(!config.enabled);
                          }
                        }}
                        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 ${
                          config.enabled ? 'bg-blue-600' : 'bg-gray-200 dark:bg-gray-600'
                        }`}
                      >
                        <span
                          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform duration-200 ${
                            config.enabled ? 'translate-x-6' : 'translate-x-1'
                          }`}
                        />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">Security Statistics</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Total Events</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{securityStats.totalEvents}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Blocked Requests</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{securityStats.blockedRequests}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Critical Events</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{securityStats.criticalEvents}</p>
                  </div>
                  <div>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Recent Events (1h)</p>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{securityStats.recentEvents}</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
              <div className="flex items-start space-x-3">
                <Shield className="text-blue-600 dark:text-blue-400 w-5 h-5 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                    Security Configuration
                  </p>
                  <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                    You can enable or disable various security features above. Login rate limiting is currently 
                    <span className={`font-medium ${loginRateLimitEnabled ? ' text-emerald-600 dark:text-emerald-400' : ' text-red-600 dark:text-red-400'}`}>
                      {loginRateLimitEnabled ? ' enabled' : ' disabled'}
                    </span>.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* IP Records Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">IP Records</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Recent IP addresses and their protection status
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  IP Address
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Attempts
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Session
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Block Expires
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {stats.records.map((record: IPRecord) => {
                const isBlocked = isIPCurrentlyBlocked(record);
                return (
                  <tr key={record.ip} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Globe size={16} className="text-gray-400" />
                        <span className="text-sm font-medium text-gray-900 dark:text-white">
                          {record.ip}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        {isBlocked ? (
                          <>
                            <Ban size={16} className="text-red-500" />
                            <span className="px-2 py-1 text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 rounded-full">
                              Blocked
                            </span>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={16} className="text-emerald-500" />
                            <span className="px-2 py-1 text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400 rounded-full">
                              Active
                            </span>
                          </>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Activity size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-white">
                          {record.attemptCount}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <Clock size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">
                          {formatTimeAgo(record.lastGuestSession)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {record.blockedUntil ? (
                        <div className="flex items-center space-x-2">
                          <Calendar size={16} className="text-amber-500" />
                          <span className="text-sm text-amber-600 dark:text-amber-400">
                            {formatTimeRemaining(record.blockedUntil)}
                          </span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-500 dark:text-gray-400">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewDetails(record.ip)}
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        {isBlocked && (
                          <button
                            onClick={() => handleUnblockIP(record.ip)}
                            className="p-2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200"
                            title="Unblock IP"
                          >
                            <Unlock size={16} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {stats.records.length === 0 && (
          <div className="text-center py-12">
            <Shield className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No IP records</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              IP records will appear here as guest sessions are created.
            </p>
          </div>
        )}
      </div>

      {/* Recent Sessions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Guest Sessions</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Latest guest sessions and their details
          </p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {stats.recentSessions.map((session: GuestSession, index: number) => (
              <div key={session.id} className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${session.expired ? 'bg-red-100 dark:bg-red-900/20' : 'bg-emerald-100 dark:bg-emerald-900/20'}`}>
                    {session.expired ? (
                      <X className="w-5 h-5 text-red-500" />
                    ) : (
                      <CheckCircle className="w-5 h-5 text-emerald-500" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {session.ip}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">
                      Started: {formatTimeAgo(session.startTime)}
                      {session.endTime && ` • Ended: ${formatTimeAgo(session.endTime)}`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                    session.expired 
                      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
                      : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
                  }`}>
                    {session.expired ? 'Expired' : 'Active'}
                  </span>
                  <button
                    onClick={() => handleViewDetails(session.ip)}
                    className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                  >
                    <Eye size={14} />
                  </button>
                </div>
              </div>
            ))}

            {stats.recentSessions.length === 0 && (
              <div className="text-center py-8">
                <Users className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No recent sessions</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Guest sessions will appear here as they are created.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* IP Details Modal */}
      {showDetails && ipDetails && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowDetails(false)}></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Shield className="w-6 h-6 text-blue-500" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    IP Details: {ipDetails.ip}
                  </h3>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Status */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Status</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Current Status</p>
                      <div className="flex items-center space-x-2 mt-1">
                        {isIPCurrentlyBlocked(ipDetails) ? (
                          <>
                            <Ban size={16} className="text-red-500" />
                            <span className="text-red-600 dark:text-red-400 font-medium">Blocked</span>
                          </>
                        ) : (
                          <>
                            <CheckCircle size={16} className="text-emerald-500" />
                            <span className="text-emerald-600 dark:text-emerald-400 font-medium">Active</span>
                          </>
                        )}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Block Expires</p>
                      <p className="text-gray-900 dark:text-white font-medium mt-1">
                        {ipDetails.blockedUntil ? formatTimeRemaining(ipDetails.blockedUntil) : 'Not blocked'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Activity */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Activity</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Total Attempts</p>
                      <p className="text-gray-900 dark:text-white font-medium mt-1">{ipDetails.attemptCount}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Last Session</p>
                      <p className="text-gray-900 dark:text-white font-medium mt-1">
                        {formatTimeAgo(ipDetails.lastGuestSession)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">First Attempt</p>
                      <p className="text-gray-900 dark:text-white font-medium mt-1">
                        {formatTimeAgo(ipDetails.firstAttempt)}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">Location</p>
                      <p className="text-gray-900 dark:text-white font-medium mt-1">
                        {ipDetails.location || 'Unknown'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Technical Details */}
                <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                  <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Technical Details</h4>
                  <div className="space-y-2">
                    <div>
                      <p className="text-sm text-gray-500 dark:text-gray-400">User Agent</p>
                      <p className="text-xs text-gray-900 dark:text-white font-mono mt-1 break-all">
                        {ipDetails.userAgent || 'Not available'}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Actions */}
                {isIPCurrentlyBlocked(ipDetails) && (
                  <div className="flex justify-end space-x-3">
                    <button
                      onClick={() => {
                        handleUnblockIP(ipDetails.ip);
                        setShowDetails(false);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors duration-200"
                    >
                      <Unlock size={16} />
                      <span>Unblock IP</span>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default IPProtectionDashboard;