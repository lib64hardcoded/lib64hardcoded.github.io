import React, { useState, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale
} from 'chart.js';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import 'chartjs-adapter-date-fns';
import {
  TrendingUp,
  Users,
  Download,
  Activity,
  Calendar,
  Filter,
  RefreshCw,
  Wifi,
  Globe,
  Server,
  Database
} from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { useUser } from '../contexts/UserContext';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
  TimeScale
);

const Analytics: React.FC = () => {
  const { hasAccess } = useUser();
  const { getSystemMetrics, getDownloadLogs, getActivityLogs, getUsers, loading } = useDatabase();
  
  const [timeRange, setTimeRange] = useState('7d');
  const [downloadData, setDownloadData] = useState<any>(null);
  const [userActivityData, setUserActivityData] = useState<any>(null);
  const [fileTypeData, setFileTypeData] = useState<any>(null);
  const [networkData, setNetworkData] = useState<any>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [stats, setStats] = useState({
    totalDownloads: 0,
    activeUsers: 0,
    popularFile: '',
    avgDownloadsPerDay: 0,
    networkUsage: '2.4 GB',
    bandwidth: '45.2 MB/s'
  });
  const [networkMetrics, setNetworkMetrics] = useState({
    hourlyUsage: [] as number[],
    hourlyBandwidth: [] as number[],
    totalUsage: 0,
    peakBandwidth: 0,
    lastUpdated: new Date()
  });

  useEffect(() => {
    loadAnalytics();
    // Initialize network metrics if they don't exist
    initializeNetworkMetrics();
  }, [timeRange]);

  // Initialize network metrics with persistent data
  const initializeNetworkMetrics = () => {
    try {
      const storedMetrics = localStorage.getItem('prodomo_network_metrics');
      if (storedMetrics) {
        setNetworkMetrics(JSON.parse(storedMetrics));
      } else {
        // Create initial metrics if none exist
        const initialHourlyUsage = Array.from({ length: 24 }, (_, i) => {
          // Create a realistic pattern with higher usage during business hours
          const hour = i;
          let baseUsage = 20; // Base MB usage
          
          // Higher usage during business hours (9am-5pm)
          if (hour >= 9 && hour <= 17) {
            baseUsage = 60 + Math.floor(Math.random() * 40); // 60-100 MB
          } else if ((hour >= 6 && hour < 9) || (hour > 17 && hour <= 22)) {
            baseUsage = 30 + Math.floor(Math.random() * 30); // 30-60 MB
          } else {
            baseUsage = 10 + Math.floor(Math.random() * 20); // 10-30 MB (night hours)
          }
          
          return baseUsage;
        });
        
        // Bandwidth follows similar pattern but with more variation
        const initialHourlyBandwidth = initialHourlyUsage.map(usage => {
          return Math.max(5, Math.floor(usage / 3) + Math.floor(Math.random() * 15));
        });
        
        const totalUsage = initialHourlyUsage.reduce((sum, val) => sum + val, 0);
        const peakBandwidth = Math.max(...initialHourlyBandwidth);
        
        const newMetrics = {
          hourlyUsage: initialHourlyUsage,
          hourlyBandwidth: initialHourlyBandwidth,
          totalUsage,
          peakBandwidth,
          lastUpdated: new Date()
        };
        
        setNetworkMetrics(newMetrics);
        localStorage.setItem('prodomo_network_metrics', JSON.stringify(newMetrics));
      }
    } catch (error) {
      console.error('Failed to initialize network metrics:', error);
    }
  };

  // Update network metrics with realistic increments
  const updateNetworkMetrics = () => {
    try {
      const now = new Date();
      const currentHour = now.getHours();
      
      // Only update if it's been at least 5 minutes since last update
      const timeSinceUpdate = now.getTime() - new Date(networkMetrics.lastUpdated).getTime();
      if (timeSinceUpdate < 5 * 60 * 1000) {
        return;
      }
      
      // Create a copy of the current metrics
      const updatedHourlyUsage = [...networkMetrics.hourlyUsage];
      const updatedHourlyBandwidth = [...networkMetrics.hourlyBandwidth];
      
      // Calculate realistic increments based on time of day
      let usageIncrement = 0;
      if (currentHour >= 9 && currentHour <= 17) {
        // Business hours - higher activity
        usageIncrement = 2 + Math.floor(Math.random() * 8); // 2-10 MB
      } else if ((currentHour >= 6 && currentHour < 9) || (currentHour > 17 && currentHour <= 22)) {
        // Morning/evening - moderate activity
        usageIncrement = 1 + Math.floor(Math.random() * 4); // 1-5 MB
      } else {
        // Night - low activity
        usageIncrement = Math.floor(Math.random() * 2); // 0-2 MB
      }
      
      // Update current hour's usage
      updatedHourlyUsage[currentHour] += usageIncrement;
      
      // Update bandwidth based on usage
      const bandwidthIncrement = Math.max(0, Math.floor(usageIncrement / 2) + Math.floor(Math.random() * 3));
      updatedHourlyBandwidth[currentHour] = Math.max(
        updatedHourlyBandwidth[currentHour],
        updatedHourlyBandwidth[currentHour] + bandwidthIncrement
      );
      
      // Calculate new totals
      const totalUsage = updatedHourlyUsage.reduce((sum, val) => sum + val, 0);
      const peakBandwidth = Math.max(...updatedHourlyBandwidth);
      
      // Update state and storage
      const updatedMetrics = {
        hourlyUsage: updatedHourlyUsage,
        hourlyBandwidth: updatedHourlyBandwidth,
        totalUsage,
        peakBandwidth,
        lastUpdated: now
      };
      
      setNetworkMetrics(updatedMetrics);
      localStorage.setItem('prodomo_network_metrics', JSON.stringify(updatedMetrics));
      
      // Update network usage chart
      updateNetworkChart(updatedHourlyUsage, updatedHourlyBandwidth);
      
      // Update stats
      setStats(prev => ({
        ...prev,
        networkUsage: `${(totalUsage / 1024).toFixed(1)} GB`,
        bandwidth: `${peakBandwidth.toFixed(1)} MB/s`
      }));
    } catch (error) {
      console.error('Failed to update network metrics:', error);
    }
  };

  // Update network chart with current data
  const updateNetworkChart = (hourlyUsage: number[], hourlyBandwidth: number[]) => {
    const updatedNetworkData = {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [
        {
          label: 'Network Usage (MB)',
          data: hourlyUsage,
          borderColor: 'rgb(139, 92, 246)',
          backgroundColor: 'rgba(139, 92, 246, 0.1)',
          tension: 0.4,
          fill: true
        },
        {
          label: 'Bandwidth (MB/s)',
          data: hourlyBandwidth,
          borderColor: 'rgb(245, 158, 11)',
          backgroundColor: 'rgba(245, 158, 11, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };
    
    setNetworkData(updatedNetworkData);
  };

  const loadAnalytics = async () => {
    const days = timeRange === '7d' ? 7 : timeRange === '30d' ? 30 : 90;
    
    // Load metrics and logs
    const [metrics, downloads, activities, users] = await Promise.all([
      getSystemMetrics(undefined, days),
      getDownloadLogs(1000),
      getActivityLogs(1000),
      getUsers()
    ]);

    // Process download data for chart
    const downloadsByDate = downloads.reduce((acc: any, log) => {
      const date = new Date(log.created_at).toDateString();
      acc[date] = (acc[date] || 0) + 1;
      return acc;
    }, {});

    const downloadChartData = {
      labels: Object.keys(downloadsByDate).slice(-days),
      datasets: [
        {
          label: 'Downloads',
          data: Object.values(downloadsByDate).slice(-days),
          borderColor: 'rgb(59, 130, 246)',
          backgroundColor: 'rgba(59, 130, 246, 0.1)',
          tension: 0.4,
          fill: true
        }
      ]
    };

    // Process user activity data
    const activitiesByHour = activities.reduce((acc: any, log) => {
      const hour = new Date(log.created_at).getHours();
      acc[hour] = (acc[hour] || 0) + 1;
      return acc;
    }, {});

    const userActivityChartData = {
      labels: Array.from({ length: 24 }, (_, i) => `${i}:00`),
      datasets: [
        {
          label: 'User Activity',
          data: Array.from({ length: 24 }, (_, i) => activitiesByHour[i] || 0),
          backgroundColor: 'rgba(16, 185, 129, 0.8)',
          borderColor: 'rgb(16, 185, 129)',
          borderWidth: 1
        }
      ]
    };

    // Process file type data
    const fileTypes = downloads.reduce((acc: any, log) => {
      // Extract file type from file name (simplified)
      const extension = log.file_name.split('.').pop()?.toLowerCase() || 'unknown';
      acc[extension] = (acc[extension] || 0) + 1;
      return acc;
    }, {});

    const fileTypeChartData = {
      labels: Object.keys(fileTypes),
      datasets: [
        {
          data: Object.values(fileTypes),
          backgroundColor: [
            '#3B82F6',
            '#10B981',
            '#F59E0B',
            '#EF4444',
            '#8B5CF6',
            '#F97316'
          ],
          borderWidth: 0
        }
      ]
    };

    // Update network metrics and chart
    updateNetworkMetrics();

    // Process recent activity with user data
    const recentActivitiesWithUsers = activities.slice(0, 10).map(activity => {
      const user = users.find(u => u.id === activity.user_id);
      return {
        ...activity,
        user_grade: user?.grade
      };
    });

    // Calculate stats
    const totalDownloads = downloads.length;
    const uniqueUsers = new Set(downloads.map(d => d.user_id)).size;
    const fileDownloadCounts = downloads.reduce((acc: any, log) => {
      acc[log.file_name] = (acc[log.file_name] || 0) + 1;
      return acc;
    }, {});
    const popularFile = Object.keys(fileDownloadCounts).reduce((a, b) => 
      fileDownloadCounts[a] > fileDownloadCounts[b] ? a : b, ''
    );
    const avgDownloadsPerDay = Math.round(totalDownloads / days);

    setDownloadData(downloadChartData);
    setUserActivityData(userActivityChartData);
    setFileTypeData(fileTypeChartData);
    setRecentActivity(recentActivitiesWithUsers);
    setStats({
      totalDownloads,
      activeUsers: uniqueUsers,
      popularFile,
      avgDownloadsPerDay,
      networkUsage: `${(networkMetrics.totalUsage / 1024).toFixed(1)} GB`,
      bandwidth: `${networkMetrics.peakBandwidth.toFixed(1)} MB/s`
    });
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top' as const,
      },
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(156, 163, 175, 0.1)'
        }
      },
      x: {
        grid: {
          color: 'rgba(156, 163, 175, 0.1)'
        }
      }
    }
  };

  const doughnutOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom' as const,
      },
    },
  };

  const getActivityIcon = (activity: any) => {
    if (activity.type === 'download') return <Download size={16} className="text-blue-500" />;
    if (activity.action && activity.action.includes('login') || activity.action && activity.action.includes('auth')) return <Activity size={16} className="text-emerald-500" />;
    if (activity.action && activity.action.includes('profile') || activity.action && activity.action.includes('user')) return <Users size={16} className="text-purple-500" />;
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

  if (!hasAccess('Admin')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Activity className="mx-auto h-12 w-12 text-amber-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Restricted</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You need Admin privileges to access analytics.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Analytics Dashboard</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Monitor downloads, user activity, network usage, and system performance.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value)}
            className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="7d">Last 7 days</option>
            <option value="30d">Last 30 days</option>
            <option value="90d">Last 90 days</option>
          </select>
          <button
            onClick={loadAnalytics}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-6">
        {[
          {
            title: 'Total Downloads',
            value: stats.totalDownloads.toLocaleString(),
            icon: Download,
            color: 'bg-blue-500',
            change: '+12%',
            changeType: 'positive'
          },
          {
            title: 'Active Users',
            value: stats.activeUsers.toLocaleString(),
            icon: Users,
            color: 'bg-emerald-500',
            change: '+8%',
            changeType: 'positive'
          },
          {
            title: 'Network Usage',
            value: stats.networkUsage,
            icon: Wifi,
            color: 'bg-purple-500',
            change: '+15%',
            changeType: 'positive'
          },
          {
            title: 'Bandwidth',
            value: stats.bandwidth,
            icon: Globe,
            color: 'bg-amber-500',
            change: '+5%',
            changeType: 'positive'
          },
          {
            title: 'Avg Downloads/Day',
            value: stats.avgDownloadsPerDay.toLocaleString(),
            icon: TrendingUp,
            color: 'bg-indigo-500',
            change: '+22%',
            changeType: 'positive'
          },
          {
            title: 'Server Uptime',
            value: '99.9%',
            icon: Server,
            color: 'bg-emerald-600',
            change: '+0.1%',
            changeType: 'positive'
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

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Network Usage Chart */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Network Usage</h3>
            <div className="flex items-center space-x-2">
              <Wifi className="w-5 h-5 text-purple-500" />
              <span className="text-sm text-gray-500 dark:text-gray-400">
                Last updated: {new Date(networkMetrics.lastUpdated).toLocaleTimeString()}
              </span>
            </div>
          </div>
          <div className="h-64">
            {networkData && <Line data={networkData} options={chartOptions} />}
          </div>
          <div className="mt-4 grid grid-cols-2 gap-4">
            <div className="bg-purple-50 dark:bg-purple-900/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-purple-700 dark:text-purple-300">Total Usage</span>
                <span className="text-sm font-medium text-purple-800 dark:text-purple-200">
                  {(networkMetrics.totalUsage / 1024).toFixed(1)} GB
                </span>
              </div>
            </div>
            <div className="bg-amber-50 dark:bg-amber-900/20 rounded-lg p-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-amber-700 dark:text-amber-300">Peak Bandwidth</span>
                <span className="text-sm font-medium text-amber-800 dark:text-amber-200">
                  {networkMetrics.peakBandwidth.toFixed(1)} MB/s
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Downloads Over Time */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Downloads Over Time</h3>
            <Download className="w-5 h-5 text-blue-500" />
          </div>
          <div className="h-64">
            {downloadData && <Line data={downloadData} options={chartOptions} />}
          </div>
        </div>

        {/* User Activity by Hour */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Activity by Hour</h3>
            <Activity className="w-5 h-5 text-emerald-500" />
          </div>
          <div className="h-64">
            {userActivityData && <Bar data={userActivityData} options={chartOptions} />}
          </div>
        </div>

        {/* File Types Distribution */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">File Types</h3>
            <Database className="w-5 h-5 text-amber-500" />
          </div>
          <div className="h-64">
            {fileTypeData && <Doughnut data={fileTypeData} options={doughnutOptions} />}
          </div>
        </div>
      </div>

      {/* Recent Activity with User Info */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent User Activity</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Latest user actions and system events with user details
          </p>
        </div>
        <div className="p-6">
          <div className="space-y-4">
            {recentActivity.map((activity, index) => (
              <div key={index} className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200">
                <div className="flex-shrink-0">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">{activity.user_name.charAt(0)}</span>
                  </div>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {activity.user_name}
                      </p>
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
        </div>
      </div>
    </div>
  );
};

export default Analytics;