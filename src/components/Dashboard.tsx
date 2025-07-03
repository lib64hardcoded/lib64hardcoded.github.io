import React, { useState, useEffect } from 'react';
import { 
  Download, 
  Users, 
  Server, 
  Activity, 
  TrendingUp, 
  Clock,
  Shield,
  AlertTriangle,
  FileText,
  Settings,
  BarChart3,
  FolderOpen,
  User,
  Edit,
  Upload,
  LogIn,
  LogOut,
  CheckCircle,
  X,
  Wifi,
  Database,
  HardDrive,
  Cpu
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDatabase } from '../hooks/useDatabase';
import { showNotification } from '../lib/notifications';
import { useActivityLogger } from '../hooks/useActivityLogger';

interface DashboardProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ activeSection, setActiveSection }) => {
  const { user, hasAccess } = useAuth();
  const { getActivityLogs, getDownloadLogs, getUsers, getServerFiles } = useDatabase();
  const { logSystemAction } = useActivityLogger();
  const [activeQuickAction, setActiveQuickAction] = useState<string | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [systemHealth, setSystemHealth] = useState({
    cpu: 46,
    memory: 68,
    storage: 32,
    network: 89,
    status: 'healthy' as 'healthy' | 'warning' | 'critical'
  });
  const [realStats, setRealStats] = useState({
    totalDownloads: 0,
    activeUsers: 0,
    serverUptime: '99.9%',
    totalFiles: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDashboardData();
    // Simulate system health updates
    const interval = setInterval(updateSystemHealth, 30000); // Update every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadDashboardData = async () => {
    setLoading(true);
    try {
      const [activities, downloads, users, files] = await Promise.all([
        getActivityLogs(20),
        getDownloadLogs(100),
        getUsers(),
        getServerFiles()
      ]);

      // Calculate real stats
      const totalDownloads = downloads.length;
      const activeUsers = new Set(downloads.map(d => d.user_id)).size;
      const totalFiles = files.length;
      
      // Calculate uptime (mock calculation based on current time)
      const uptimePercentage = 99.5 + (Math.random() * 0.5);
      const serverUptime = `${uptimePercentage.toFixed(1)}%`;

      setRealStats({
        totalDownloads,
        activeUsers,
        serverUptime,
        totalFiles
      });

      // Filter activities based on user access level
      let filteredActivities = activities;
      if (!hasAccess('Admin')) {
        // For non-admin users, filter out admin-only activities
        filteredActivities = activities.filter(activity => 
          !activity.action.includes('[ADMIN]')
        );
      }

      // Combine and sort activities
      const combinedActivities = [
        ...filteredActivities.map(a => ({ ...a, type: 'activity' })),
        ...downloads.slice(0, 5).map(d => ({ 
          ...d, 
          type: 'download',
          action: `Downloaded ${d.file_name} v${d.file_version}`,
          details: `File: ${d.file_name}`
        }))
      ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

      // Add user info to activities and filter out guest users
      const activitiesWithUsers = combinedActivities.slice(0, 10).map(activity => {
        const activityUser = users.find(u => u.id === activity.user_id);
        return {
          ...activity,
          user_avatar: activityUser?.avatar_url,
          user_grade: activityUser?.grade,
          is_guest: activityUser?.is_guest || false
        };
      }).filter(activity => !activity.is_guest); // Filter out guest users

      setRecentActivity(activitiesWithUsers);
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  const updateSystemHealth = () => {
    // Simulate realistic system metrics with rounded values
    setSystemHealth(prev => ({
      cpu: Math.round(Math.max(20, Math.min(90, prev.cpu + (Math.random() - 0.5) * 10))),
      memory: Math.round(Math.max(30, Math.min(85, prev.memory + (Math.random() - 0.5) * 8))),
      storage: Math.round(Math.max(15, Math.min(95, prev.storage + (Math.random() - 0.5) * 3))),
      network: Math.round(Math.max(70, Math.min(100, prev.network + (Math.random() - 0.5) * 5))),
      status: prev.cpu > 80 || prev.memory > 80 ? 'warning' : prev.cpu > 90 || prev.memory > 90 ? 'critical' : 'healthy'
    }));
  };

  const stats = [
    {
      title: 'Total Downloads',
      value: realStats.totalDownloads.toLocaleString(),
      change: '+12%',
      changeType: 'positive',
      icon: Download,
      color: 'bg-blue-500'
    },
    {
      title: 'Active Users',
      value: realStats.activeUsers.toLocaleString(),
      change: '+5%',
      changeType: 'positive',
      icon: Users,
      color: 'bg-emerald-500'
    },
    {
      title: 'Server Uptime',
      value: realStats.serverUptime,
      change: '+0.1%',
      changeType: 'positive',
      icon: Server,
      color: 'bg-purple-500'
    },
    {
      title: 'Total Files',
      value: realStats.totalFiles.toString(),
      change: `${realStats.totalFiles} available`,
      changeType: 'positive',
      icon: FileText,
      color: 'bg-amber-500'
    }
  ];

  const quickActions = [
    {
      id: 'downloads',
      title: 'Latest Downloads',
      description: 'View and download server files',
      icon: Download,
      color: 'blue',
      action: () => {
        console.log('Dashboard: Navigating to downloads');
        setActiveSection('downloads');
        showNotification.info('Navigating to Downloads section');
        logSystemAction('Accessed downloads via quick action');
      },
      requiresAccess: 'Guest' as const
    },
    {
      id: 'server-status',
      title: 'Server Status',
      description: 'Check system health and uptime',
      icon: Activity,
      color: 'emerald',
      action: () => {
        console.log('Dashboard: Checking server status');
        showNotification.success('Server Status: All systems operational', 'System Health');
        logSystemAction('Checked server status via quick action');
      },
      requiresAccess: 'Guest' as const
    },
    {
      id: 'documentation',
      title: 'Documentation',
      description: 'Browse guides and tutorials',
      icon: FileText,
      color: 'indigo',
      action: () => {
        console.log('Dashboard: Navigating to documentation');
        setActiveSection('documentation');
        showNotification.info('Navigating to Documentation');
        logSystemAction('Accessed documentation via quick action');
      },
      requiresAccess: 'Guest' as const
    },
    {
      id: 'user-management',
      title: 'User Management',
      description: 'Manage user accounts and permissions',
      icon: Users,
      color: 'purple',
      action: () => {
        console.log('Dashboard: Navigating to user management');
        if (hasAccess('Admin')) {
          setActiveSection('user-management');
          showNotification.info('Navigating to User Management');
          logSystemAction('Accessed user management via quick action');
        } else {
          showNotification.warning('Admin access required for user management');
        }
      },
      requiresAccess: 'Admin' as const
    },
    {
      id: 'analytics',
      title: 'Analytics',
      description: 'View system metrics and reports',
      icon: BarChart3,
      color: 'amber',
      action: () => {
        console.log('Dashboard: Navigating to analytics');
        if (hasAccess('Admin')) {
          setActiveSection('analytics');
          showNotification.info('Navigating to Analytics dashboard');
          logSystemAction('Accessed analytics via quick action');
        } else {
          showNotification.warning('Admin access required for analytics');
        }
      },
      requiresAccess: 'Admin' as const
    },
    {
      id: 'file-manager',
      title: 'File Manager',
      description: 'Upload and manage server files',
      icon: FolderOpen,
      color: 'red',
      action: () => {
        console.log('Dashboard: Navigating to file manager');
        if (hasAccess('Admin')) {
          setActiveSection('file-manager');
          showNotification.info('Navigating to File Manager');
          logSystemAction('Accessed file manager via quick action');
        } else {
          showNotification.warning('Admin access required for file management');
        }
      },
      requiresAccess: 'Admin' as const
    }
  ];

  const handleQuickAction = async (action: any) => {
    console.log('Dashboard: Quick action clicked:', action.id);
    setActiveQuickAction(action.id);
    
    // Add visual feedback
    setTimeout(() => setActiveQuickAction(null), 200);
    
    // Execute the action
    try {
      await action.action();
    } catch (error) {
      console.error('Dashboard: Quick action error:', error);
      showNotification.error('Failed to execute action');
    }
  };

  const handleViewAllActivity = () => {
    console.log('Dashboard: View all activity clicked');
    if (hasAccess('Admin')) {
      setActiveSection('activity-logs');
      showNotification.info('Navigating to Activity Logs');
    } else {
      showNotification.warning('Admin access required for activity logs');
    }
  };

  const handleViewProfile = (userId: string) => {
    console.log('Dashboard: Viewing profile for user:', userId);
    // Pass the userId to App component via setActiveSection
    setActiveSection('profile');
    // Use a custom event to pass the userId to the App component
    const event = new CustomEvent('viewProfile', { detail: { userId } });
    document.dispatchEvent(event);
  };

  const getActivityIcon = (activity: any) => {
    if (activity.type === 'download') return <Download size={16} className="text-blue-500" />;
    if (activity.action.includes('login') || activity.action.includes('Sign')) return <LogIn size={16} className="text-emerald-500" />;
    if (activity.action.includes('logout') || activity.action.includes('out')) return <LogOut size={16} className="text-red-500" />;
    if (activity.action.includes('profile') || activity.action.includes('Updated')) return <User size={16} className="text-purple-500" />;
    if (activity.action.includes('upload') || activity.action.includes('Upload')) return <Upload size={16} className="text-indigo-500" />;
    if (activity.action.includes('patch') || activity.action.includes('note')) return <FileText size={16} className="text-amber-500" />;
    if (activity.action.includes('user') || activity.action.includes('User')) return <Users size={16} className="text-cyan-500" />;
    if (activity.action.includes('grade') || activity.action.includes('Grade')) return <Shield size={16} className="text-orange-500" />;
    if (activity.action.includes('edit') || activity.action.includes('Edit')) return <Edit size={16} className="text-pink-500" />;
    return <Activity size={16} className="text-gray-500" />;
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'Admin': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'V5': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'V4': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
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

  const getActionColorClasses = (color: string, isActive: boolean) => {
    const baseClasses = "flex flex-col items-center p-6 rounded-xl border-2 transition-all duration-200 cursor-pointer group";
    const activeClasses = isActive ? "scale-95 shadow-lg" : "";
    
    switch (color) {
      case 'blue':
        return `${baseClasses} ${activeClasses} border-blue-200 dark:border-blue-800 hover:border-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:shadow-md`;
      case 'emerald':
        return `${baseClasses} ${activeClasses} border-emerald-200 dark:border-emerald-800 hover:border-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:shadow-md`;
      case 'purple':
        return `${baseClasses} ${activeClasses} border-purple-200 dark:border-purple-800 hover:border-purple-400 hover:bg-purple-50 dark:hover:bg-purple-900/20 hover:shadow-md`;
      case 'amber':
        return `${baseClasses} ${activeClasses} border-amber-200 dark:border-amber-800 hover:border-amber-400 hover:bg-amber-50 dark:hover:bg-amber-900/20 hover:shadow-md`;
      case 'indigo':
        return `${baseClasses} ${activeClasses} border-indigo-200 dark:border-indigo-800 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 hover:shadow-md`;
      case 'red':
        return `${baseClasses} ${activeClasses} border-red-200 dark:border-red-800 hover:border-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 hover:shadow-md`;
      default:
        return `${baseClasses} ${activeClasses} border-gray-200 dark:border-gray-700 hover:border-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800 hover:shadow-md`;
    }
  };

  const getIconColorClass = (color: string) => {
    switch (color) {
      case 'blue': return 'text-blue-500 group-hover:text-blue-600';
      case 'emerald': return 'text-emerald-500 group-hover:text-emerald-600';
      case 'purple': return 'text-purple-500 group-hover:text-purple-600';
      case 'amber': return 'text-amber-500 group-hover:text-amber-600';
      case 'indigo': return 'text-indigo-500 group-hover:text-indigo-600';
      case 'red': return 'text-red-500 group-hover:text-red-600';
      default: return 'text-gray-500 group-hover:text-gray-600';
    }
  };

  const getHealthColor = (value: number, type: string) => {
    if (type === 'network') {
      if (value >= 80) return 'text-emerald-500';
      if (value >= 60) return 'text-amber-500';
      return 'text-red-500';
    }
    
    if (value <= 50) return 'text-emerald-500';
    if (value <= 75) return 'text-amber-500';
    return 'text-red-500';
  };

  const getHealthBarColor = (value: number, type: string) => {
    if (type === 'network') {
      if (value >= 80) return 'bg-emerald-500';
      if (value >= 60) return 'bg-amber-500';
      return 'bg-red-500';
    }
    
    if (value <= 50) return 'bg-emerald-500';
    if (value <= 75) return 'bg-amber-500';
    return 'bg-red-500';
  };

  if (!user) {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
            Welcome back, {user.name}!
          </h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Here's what's happening with your Prodomo server today.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-4">
          <button
            onClick={loadDashboardData}
            disabled={loading}
            className="flex items-center space-x-2 px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
          >
            <Activity size={16} className={loading ? 'animate-spin' : ''} />
            <span className="text-sm">Refresh</span>
          </button>
          <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
            <Clock size={16} />
            <span>Last updated: {new Date().toLocaleTimeString()}</span>
          </div>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {stats.map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6 hover:shadow-md transition-shadow duration-200">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {stat.title}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {stat.value}
                  </p>
                  <div className="flex items-center mt-2">
                    <TrendingUp size={14} className={`${stat.changeType === 'positive' ? 'text-emerald-500' : 'text-red-500'} mr-1`} />
                    <span className={`text-sm font-medium ${stat.changeType === 'positive' ? 'text-emerald-600' : 'text-red-600'}`}>
                      {stat.change}
                    </span>
                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                      {stat.title === 'Total Files' ? '' : 'vs last month'}
                    </span>
                  </div>
                </div>
                <div className={`p-3 rounded-lg ${stat.color} bg-opacity-10`}>
                  <IconComponent className={`w-6 h-6 ${stat.color.replace('bg-', 'text-')}`} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <div className="lg:col-span-2 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Latest user actions and system events</p>
          </div>
          <div className="p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {recentActivity.map((activity, index) => (
                  <div key={index} className="flex items-start space-x-3 p-3 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                    <button
                      onClick={() => handleViewProfile(activity.user_id)}
                      className="flex-shrink-0 hover:scale-105 transition-transform duration-200"
                    >
                      {activity.user_avatar ? (
                        <img
                          src={activity.user_avatar}
                          alt={activity.user_name}
                          className="w-8 h-8 rounded-full object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold text-xs">{activity.user_name.charAt(0)}</span>
                        </div>
                      )}
                    </button>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={() => handleViewProfile(activity.user_id)}
                            className="text-sm font-medium text-gray-900 dark:text-white hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                          >
                            {activity.user_name}
                          </button>
                          {activity.user_grade && (
                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${getGradeColor(activity.user_grade)}`}>
                              {activity.user_grade}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {getActivityIcon(activity)}
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            {formatTimeAgo(activity.created_at)}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{activity.action}</p>
                      {activity.details && (
                        <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">{activity.details}</p>
                      )}
                    </div>
                  </div>
                ))}

                {recentActivity.length === 0 && (
                  <div className="text-center py-8">
                    <Activity className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No recent activity</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      User activity will appear here as it happens.
                    </p>
                  </div>
                )}
              </div>
            )}
            <button 
              onClick={handleViewAllActivity}
              className="w-full mt-4 px-4 py-2 text-sm font-medium text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
            >
              View all activity
            </button>
          </div>
        </div>

        {/* System Health Monitor */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Server className="w-5 h-5 text-blue-500" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">System Health</h3>
              </div>
              <div className={`px-2 py-1 text-xs font-medium rounded-full ${
                systemHealth.status === 'healthy' ? 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400' :
                systemHealth.status === 'warning' ? 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400' :
                'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
              }`}>
                {systemHealth.status}
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="space-y-6">
              {/* CPU Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Cpu size={16} className={getHealthColor(systemHealth.cpu, 'cpu')} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">CPU Usage</span>
                  </div>
                  <span className={`text-sm font-medium ${getHealthColor(systemHealth.cpu, 'cpu')}`}>
                    {systemHealth.cpu}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${getHealthBarColor(systemHealth.cpu, 'cpu')}`}
                    style={{ width: `${systemHealth.cpu}%` }}
                  ></div>
                </div>
              </div>

              {/* Memory Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Database size={16} className={getHealthColor(systemHealth.memory, 'memory')} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Memory</span>
                  </div>
                  <span className={`text-sm font-medium ${getHealthColor(systemHealth.memory, 'memory')}`}>
                    {systemHealth.memory}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${getHealthBarColor(systemHealth.memory, 'memory')}`}
                    style={{ width: `${systemHealth.memory}%` }}
                  ></div>
                </div>
              </div>

              {/* Storage Usage */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <HardDrive size={16} className={getHealthColor(systemHealth.storage, 'storage')} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Storage</span>
                  </div>
                  <span className={`text-sm font-medium ${getHealthColor(systemHealth.storage, 'storage')}`}>
                    {systemHealth.storage}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${getHealthBarColor(systemHealth.storage, 'storage')}`}
                    style={{ width: `${systemHealth.storage}%` }}
                  ></div>
                </div>
              </div>

              {/* Network Quality */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                    <Wifi size={16} className={getHealthColor(systemHealth.network, 'network')} />
                    <span className="text-sm text-gray-700 dark:text-gray-300">Network</span>
                  </div>
                  <span className={`text-sm font-medium ${getHealthColor(systemHealth.network, 'network')}`}>
                    {systemHealth.network}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                  <div 
                    className={`h-2 rounded-full transition-all duration-500 ${getHealthBarColor(systemHealth.network, 'network')}`}
                    style={{ width: `${systemHealth.network}%` }}
                  ></div>
                </div>
              </div>

              {/* System Status Summary */}
              <div className="pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Overall Status</span>
                  <div className="flex items-center space-x-2">
                    {systemHealth.status === 'healthy' ? (
                      <CheckCircle size={16} className="text-emerald-500" />
                    ) : systemHealth.status === 'warning' ? (
                      <AlertTriangle size={16} className="text-amber-500" />
                    ) : (
                      <X size={16} className="text-red-500" />
                    )}
                    <span className={`text-sm font-medium capitalize ${
                      systemHealth.status === 'healthy' ? 'text-emerald-600 dark:text-emerald-400' :
                      systemHealth.status === 'warning' ? 'text-amber-600 dark:text-amber-400' :
                      'text-red-600 dark:text-red-400'
                    }`}>
                      {systemHealth.status}
                    </span>
                  </div>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-2">
                  {systemHealth.status === 'healthy' && 'All systems operating normally'}
                  {systemHealth.status === 'warning' && 'Some metrics need attention'}
                  {systemHealth.status === 'critical' && 'Immediate action required'}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Quick Actions</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">Common tasks and shortcuts</p>
        </div>
        <div className="p-6">
          <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.filter(action => hasAccess(action.requiresAccess)).map((action) => {
              const IconComponent = action.icon;
              const isActive = activeQuickAction === action.id;
              
              return (
                <button
                  key={action.id}
                  onClick={() => handleQuickAction(action)}
                  className={getActionColorClasses(action.color, isActive)}
                  title={action.description}
                >
                  <IconComponent className={`w-8 h-8 mb-3 ${getIconColorClass(action.color)}`} />
                  <span className="text-sm font-medium text-gray-900 dark:text-white text-center">
                    {action.title}
                  </span>
                  <span className="text-xs text-gray-500 dark:text-gray-400 text-center mt-1">
                    {action.description}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;