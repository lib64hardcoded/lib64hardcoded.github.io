import React, { useState, useEffect } from 'react';
import {
  Activity,
  Search,
  Filter,
  Calendar,
  User,
  Download,
  Shield,
  FileText,
  RefreshCw,
  Eye,
  AlertCircle
} from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { useUser } from '../contexts/UserContext';
import { ActivityLog, DownloadLog } from '../lib/supabase';

const ActivityLogs: React.FC = () => {
  const { hasAccess } = useUser();
  const { getActivityLogs, getDownloadLogs, loading } = useDatabase();
  
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [downloadLogs, setDownloadLogs] = useState<DownloadLog[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [logType, setLogType] = useState<'all' | 'activity' | 'downloads'>('all');
  const [dateFilter, setDateFilter] = useState('7d');

  useEffect(() => {
    loadLogs();
  }, [dateFilter]);

  const loadLogs = async () => {
    const limit = dateFilter === '7d' ? 100 : dateFilter === '30d' ? 500 : 1000;
    
    const [activities, downloads] = await Promise.all([
      getActivityLogs(limit),
      getDownloadLogs(limit)
    ]);

    setActivityLogs(activities);
    setDownloadLogs(downloads);
  };

  const getActivityIcon = (action: string) => {
    if (action.includes('download')) return <Download size={16} className="text-blue-500" />;
    if (action.includes('login') || action.includes('auth')) return <Shield size={16} className="text-emerald-500" />;
    if (action.includes('profile') || action.includes('user')) return <User size={16} className="text-purple-500" />;
    if (action.includes('patch') || action.includes('note')) return <FileText size={16} className="text-amber-500" />;
    return <Activity size={16} className="text-gray-500" />;
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

  const filteredLogs = () => {
    let logs: any[] = [];

    if (logType === 'all' || logType === 'activity') {
      logs = [...logs, ...activityLogs.map(log => ({ ...log, type: 'activity' }))];
    }
    
    if (logType === 'all' || logType === 'downloads') {
      logs = [...logs, ...downloadLogs.map(log => ({ 
        ...log, 
        type: 'download',
        action: `Downloaded ${log.file_name} v${log.file_version}`,
        details: `File: ${log.file_name}`
      }))];
    }

    // Sort by date
    logs.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    // Filter by search term
    if (searchTerm) {
      logs = logs.filter(log => 
        log.user_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (log.details && log.details.toLowerCase().includes(searchTerm.toLowerCase()))
      );
    }

    return logs;
  };

  if (!hasAccess('Admin')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Restricted</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You need Admin privileges to access activity logs.
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Activity Logs</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Monitor user activities, downloads, and system events.
          </p>
        </div>
        <button
          onClick={loadLogs}
          disabled={loading}
          className="mt-4 sm:mt-0 flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search logs..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="text-gray-400 w-5 h-5" />
              <select
                value={logType}
                onChange={(e) => setLogType(e.target.value as any)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Logs</option>
                <option value="activity">Activity Only</option>
                <option value="downloads">Downloads Only</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <Calendar className="text-gray-400 w-5 h-5" />
              <select
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="7d">Last 7 days</option>
                <option value="30d">Last 30 days</option>
                <option value="90d">Last 90 days</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Activities</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{activityLogs.length}</p>
            </div>
            <Activity className="w-8 h-8 text-blue-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Total Downloads</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">{downloadLogs.length}</p>
            </div>
            <Download className="w-8 h-8 text-emerald-500" />
          </div>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Unique Users</p>
              <p className="text-2xl font-bold text-gray-900 dark:text-white">
                {new Set([...activityLogs.map(l => l.user_id), ...downloadLogs.map(l => l.user_id)]).size}
              </p>
            </div>
            <User className="w-8 h-8 text-purple-500" />
          </div>
        </div>
      </div>

      {/* Logs List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Showing {filteredLogs().length} log entries
          </p>
        </div>
        <div className="max-h-96 overflow-y-auto">
          <div className="p-6 space-y-4">
            {filteredLogs().map((log, index) => (
              <div key={`${log.type}-${log.id}-${index}`} className="flex items-start space-x-4 p-4 bg-gray-50 dark:bg-gray-900 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors duration-200">
                <div className="flex-shrink-0 mt-1">
                  {getActivityIcon(log.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                      {log.user_name}
                    </p>
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                        log.type === 'download' 
                          ? 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400'
                      }`}>
                        {log.type}
                      </span>
                      <span className="text-xs text-gray-500 dark:text-gray-400">
                        {formatTimeAgo(log.created_at)}
                      </span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
                    {log.action}
                  </p>
                  {log.details && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                      {log.details}
                    </p>
                  )}
                  <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500 dark:text-gray-500">
                    <span>IP: {log.ip_address || 'Unknown'}</span>
                    <span>{new Date(log.created_at).toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}

            {filteredLogs().length === 0 && (
              <div className="text-center py-8">
                <Eye className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No logs found</h3>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Try adjusting your search criteria or date range.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActivityLogs;