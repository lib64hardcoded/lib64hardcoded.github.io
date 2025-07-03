import React, { useState, useEffect } from 'react';
import {
  Bug,
  Search,
  Filter,
  CheckCircle,
  Clock,
  AlertTriangle,
  X,
  Eye,
  Edit,
  Trash2,
  MessageSquare,
  User,
  Calendar,
  Tag,
  RefreshCw,
  Send,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDatabase } from '../hooks/useDatabase';
import { useActivityLogger } from '../hooks/useActivityLogger';
import { useNotifications } from '../hooks/useNotifications';
import { showNotification } from '../lib/notifications';

interface BugReport {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  category: 'general' | 'ui' | 'performance' | 'security' | 'feature';
  status: 'open' | 'in-progress' | 'resolved' | 'closed';
  reporter_id: string;
  reporter_name: string;
  assignee_id?: string;
  assignee_name?: string;
  steps: string[];
  expected_behavior: string;
  actual_behavior: string;
  environment: {
    browser: string;
    os: string;
    version: string;
  };
  attachments: string[];
  comments: Array<{
    id: string;
    author: string;
    author_grade?: string;
    content: string;
    created_at: string;
  }>;
  created_at: string;
  updated_at: string;
}

const BugManagement: React.FC = () => {
  const { user, hasAccess } = useAuth();
  const { getBugReports, updateBugReport, deleteBugReport, loading } = useDatabase();
  const { logSystemAction } = useActivityLogger();
  const { addBugStatusNotification } = useNotifications();
  
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [severityFilter, setSeverityFilter] = useState<string>('all');
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    loadBugs();
  }, []);

  const loadBugs = async () => {
    const bugReports = await getBugReports();
    setBugs(bugReports);
  };

  const handleStatusUpdate = async (bugId: string, newStatus: string) => {
    const bug = bugs.find(b => b.id === bugId);
    if (!bug) return;

    const oldStatus = bug.status;
    const success = await updateBugReport(bugId, { status: newStatus });
    
    if (success) {
      await loadBugs();
      showNotification.success(`Bug "${bug.title}" marked as ${newStatus}`);
      await logSystemAction(`[ADMIN] Updated bug status: ${bug.title} -> ${newStatus}`, `Bug ID: ${bugId}`);
      
      // Send notification to the bug reporter if status changed to in-progress or resolved
      if ((newStatus === 'in-progress' || newStatus === 'resolved') && bug.reporter_id !== user?.id) {
        console.log('Sending notification to reporter:', bug.reporter_id, 'for bug:', bug.title);
        
        // Create a notification for the bug reporter
        // We need to store this in a way that the reporter can see it when they log in
        const notificationData = {
          bugId: bug.id,
          bugTitle: bug.title,
          oldStatus,
          newStatus,
          reporterId: bug.reporter_id,
          timestamp: new Date().toISOString()
        };
        
        // Store in localStorage with a key that includes the reporter's ID
        const existingNotifications = JSON.parse(localStorage.getItem(`prodomo_notifications_${bug.reporter_id}`) || '[]');
        
        let message = '';
        let type: 'info' | 'success' | 'warning' | 'error' = 'info';

        switch (newStatus) {
          case 'in-progress':
            message = `Your bug report "${bug.title}" is now being worked on by our team.`;
            type = 'info';
            break;
          case 'resolved':
            message = `Great news! Your bug report "${bug.title}" has been resolved.`;
            type = 'success';
            break;
          case 'closed':
            message = `Your bug report "${bug.title}" has been closed.`;
            type = 'info';
            break;
          default:
            message = `Your bug report "${bug.title}" status changed from ${oldStatus} to ${newStatus}.`;
            type = 'info';
        }

        const newNotification = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: 'Bug Report Update',
          message,
          type,
          read: false,
          created_at: new Date().toISOString(),
          related_id: bug.id,
          action_url: '/bug-report'
        };

        const updatedNotifications = [newNotification, ...existingNotifications].slice(0, 50);
        localStorage.setItem(`prodomo_notifications_${bug.reporter_id}`, JSON.stringify(updatedNotifications));
        
        console.log('Notification stored for user:', bug.reporter_id, newNotification);
      }
    }
  };

  const handleAddComment = async () => {
    if (!selectedBug || !user || !newComment.trim()) return;

    try {
      // Create a new comment
      const comment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        author: user.name,
        author_grade: user.grade,
        content: newComment.trim(),
        created_at: new Date().toISOString()
      };

      // Add comment to the bug report
      const updatedComments = [...(selectedBug.comments || []), comment];
      
      const success = await updateBugReport(selectedBug.id, {
        comments: updatedComments
      });

      if (success) {
        await loadBugs();
        setNewComment('');
        
        // Find the updated bug and select it
        const updatedBugs = await getBugReports();
        const updatedBug = updatedBugs.find(b => b.id === selectedBug.id);
        if (updatedBug) {
          setSelectedBug(updatedBug);
        }
        
        showNotification.success('Comment added successfully');
        await logSystemAction('Added comment to bug report', `Bug ID: ${selectedBug.id}`);
        
        // Create notification for the bug reporter if the comment is from an admin or support
        if ((hasAccess('Admin') || user.grade === 'Support') && selectedBug.reporter_id !== user.id) {
          const existingNotifications = JSON.parse(localStorage.getItem(`prodomo_notifications_${selectedBug.reporter_id}`) || '[]');
          
          const newNotification = {
            id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            title: 'New Comment on Your Bug Report',
            message: `${user.name} commented on your bug report "${selectedBug.title}"`,
            type: 'info',
            read: false,
            created_at: new Date().toISOString(),
            related_id: selectedBug.id,
            action_url: '/bug-report'
          };
          
          const updatedNotifications = [newNotification, ...existingNotifications].slice(0, 50);
          localStorage.setItem(`prodomo_notifications_${selectedBug.reporter_id}`, JSON.stringify(updatedNotifications));
        }
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      showNotification.error('Failed to add comment');
    }
  };

  const handleDelete = async (id: string) => {
    const note = bugs.find(n => n.id === id);
    if (!note) return;
    
    setConfirmDelete(id);
  };

  const confirmDeleteNote = async (id: string) => {
    const note = bugs.find(n => n.id === id);
    if (!note) return;
    
    const success = await deleteBugReport(id);
    if (success) {
      await logSystemAction(`[ADMIN] Deleted bug report: ${note.title}`, `Bug ID: ${id}`);
      await loadBugs();
      showNotification.warning(`Bug report for "${note.title}" deleted`);
    } else {
      showNotification.error('Failed to delete bug report');
    }
    setConfirmDelete(null);
  };

  const cancelDelete = () => {
    setConfirmDelete(null);
  };

  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'low': return 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';
      case 'medium': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400';
      case 'high': return 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-400';
      case 'critical': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'open': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'in-progress': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'resolved': return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'closed': return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'Admin': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'Support': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400';
      case 'V5': return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'V4': return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <Bug size={16} />;
      case 'in-progress': return <Clock size={16} />;
      case 'resolved': return <CheckCircle size={16} />;
      case 'closed': return <X size={16} />;
      default: return <Bug size={16} />;
    }
  };

  const filteredBugs = bugs.filter(bug => {
    const matchesSearch = bug.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bug.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bug.reporter_name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bug.status === statusFilter;
    const matchesSeverity = severityFilter === 'all' || bug.severity === severityFilter;
    return matchesSearch && matchesStatus && matchesSeverity;
  });

  const statusCounts = {
    open: bugs.filter(b => b.status === 'open').length,
    'in-progress': bugs.filter(b => b.status === 'in-progress').length,
    resolved: bugs.filter(b => b.status === 'resolved').length,
    closed: bugs.filter(b => b.status === 'closed').length
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!hasAccess('Admin') && user?.grade !== 'Support') {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Restricted</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You need Admin or Support privileges to manage bug reports.
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bug Management</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Review, manage, and resolve bug reports from users.
          </p>
        </div>
        <button
          onClick={loadBugs}
          disabled={loading}
          className="mt-4 sm:mt-0 flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200"
        >
          <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-6">
        {[
          { label: 'Open', value: statusCounts.open, color: 'bg-blue-500', icon: Bug },
          { label: 'In Progress', value: statusCounts['in-progress'], color: 'bg-purple-500', icon: Clock },
          { label: 'Resolved', value: statusCounts.resolved, color: 'bg-emerald-500', icon: CheckCircle },
          { label: 'Closed', value: statusCounts.closed, color: 'bg-gray-500', icon: X }
        ].map((stat, index) => {
          const IconComponent = stat.icon;
          return (
            <div key={index} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-2">
                    {stat.value}
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

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between space-y-4 lg:space-y-0 lg:space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search bug reports..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            />
          </div>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <Filter className="text-gray-400 w-5 h-5" />
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="open">Open</option>
                <option value="in-progress">In Progress</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="flex items-center space-x-2">
              <select
                value={severityFilter}
                onChange={(e) => setSeverityFilter(e.target.value)}
                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Severity</option>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Bug Reports List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Bug Report
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Severity
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Reporter
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Created
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Comments
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredBugs.map((bug) => (
                <tr key={bug.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                  <td className="px-6 py-4">
                    <div>
                      <div className="text-sm font-medium text-gray-900 dark:text-white">
                        {bug.title}
                      </div>
                      <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                        {bug.description.substring(0, 100)}...
                      </div>
                      <div className="flex items-center space-x-2 mt-2">
                        <Tag size={12} className="text-gray-400" />
                        <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                          {bug.category}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(bug.severity)}`}>
                      {bug.severity}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <span className={`flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(bug.status)}`}>
                        {getStatusIcon(bug.status)}
                        <span className="capitalize">{bug.status.replace('-', ' ')}</span>
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <User size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">{bug.reporter_name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <Calendar size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-500 dark:text-gray-400">
                        {new Date(bug.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <MessageSquare size={14} className="text-gray-400" />
                      <span className="text-sm text-gray-900 dark:text-white">{bug.comments?.length || 0}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => {
                          setSelectedBug(bug);
                          setShowDetails(true);
                        }}
                        className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                        title="View Details"
                      >
                        <Eye size={16} />
                      </button>
                      
                      {bug.status !== 'in-progress' && (
                        <button
                          onClick={() => handleStatusUpdate(bug.id, 'in-progress')}
                          className="p-2 text-gray-400 hover:text-purple-600 dark:hover:text-purple-400 transition-colors duration-200"
                          title="Mark as In Progress"
                        >
                          <Clock size={16} />
                        </button>
                      )}
                      
                      {bug.status !== 'resolved' && (
                        <button
                          onClick={() => handleStatusUpdate(bug.id, 'resolved')}
                          className="p-2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200"
                          title="Mark as Resolved"
                        >
                          <CheckCircle size={16} />
                        </button>
                      )}
                      
                      {hasAccess('Admin') && (
                        <button
                          onClick={() => handleDelete(bug.id)}
                          className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {filteredBugs.length === 0 && (
          <div className="text-center py-12">
            <Bug className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No bug reports found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your search criteria.
            </p>
          </div>
        )}
      </div>

      {/* Bug Details Modal */}
      {showDetails && selectedBug && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowDetails(false)}></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <Bug className="w-6 h-6 text-red-500" />
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                    {selectedBug.title}
                  </h3>
                  <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(selectedBug.severity)}`}>
                    {selectedBug.severity}
                  </span>
                  <span className={`flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedBug.status)}`}>
                    {getStatusIcon(selectedBug.status)}
                    <span className="capitalize">{selectedBug.status.replace('-', ' ')}</span>
                  </span>
                </div>
                <button
                  onClick={() => setShowDetails(false)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 space-y-6">
                  {/* Description */}
                  <div>
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Description</h4>
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {selectedBug.description}
                    </p>
                  </div>

                  {/* Steps to Reproduce */}
                  {selectedBug.steps.length > 0 && (
                    <div>
                      <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Steps to Reproduce</h4>
                      <ol className="list-decimal list-inside space-y-2">
                        {selectedBug.steps.map((step, index) => (
                          <li key={index} className="text-gray-700 dark:text-gray-300">{step}</li>
                        ))}
                      </ol>
                    </div>
                  )}

                  {/* Expected vs Actual Behavior */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {selectedBug.expected_behavior && (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Expected Behavior</h4>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {selectedBug.expected_behavior}
                        </p>
                      </div>
                    )}
                    {selectedBug.actual_behavior && (
                      <div>
                        <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Actual Behavior</h4>
                        <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                          {selectedBug.actual_behavior}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Comments Section */}
                  <div className="pt-6 border-t border-gray-200 dark:border-gray-700">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <MessageSquare className="mr-2" size={18} />
                      Comments ({selectedBug.comments?.length || 0})
                    </h4>
                    
                    <div className="space-y-4 max-h-80 overflow-y-auto mb-4">
                      {selectedBug.comments && selectedBug.comments.length > 0 ? (
                        selectedBug.comments.map((comment, index) => (
                          <div key={index} className="p-4 bg-gray-50 dark:bg-gray-900 rounded-lg">
                            <div className="flex items-center justify-between mb-2">
                              <div className="flex items-center space-x-2">
                                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                                  <span className="text-white font-semibold text-xs">{comment.author.charAt(0)}</span>
                                </div>
                                <div className="flex items-center space-x-2">
                                  <span className="font-medium text-gray-900 dark:text-white">{comment.author}</span>
                                  {comment.author_grade && (
                                    <span className={`px-2 py-0.5 text-xs font-medium rounded-full flex items-center ${getGradeColor(comment.author_grade)}`}>
                                      <Shield size={10} className="mr-1" />
                                      {comment.author_grade}
                                    </span>
                                  )}
                                </div>
                              </div>
                              <span className="text-xs text-gray-500 dark:text-gray-400">
                                {formatDate(comment.created_at)}
                              </span>
                            </div>
                            <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                              {comment.content}
                            </p>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-6">
                          <MessageSquare className="mx-auto h-10 w-10 text-gray-400" />
                          <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                            No comments yet. Add a comment to communicate with the reporter.
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Add Comment */}
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                        Add a Comment
                      </label>
                      <div className="flex items-start space-x-3">
                        <textarea
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          rows={3}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="Add your comment here..."
                        />
                        <button
                          onClick={handleAddComment}
                          disabled={!newComment.trim() || loading}
                          className="flex-shrink-0 flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
                        >
                          <Send size={16} />
                          <span>Send</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  {/* Bug Info */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Bug Information</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Category:</span>
                        <span className="text-gray-900 dark:text-white capitalize">{selectedBug.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Reporter:</span>
                        <span className="text-gray-900 dark:text-white">{selectedBug.reporter_name}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Created:</span>
                        <span className="text-gray-900 dark:text-white">
                          {new Date(selectedBug.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Updated:</span>
                        <span className="text-gray-900 dark:text-white">
                          {new Date(selectedBug.updated_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Environment */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Environment</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">OS:</span>
                        <span className="text-gray-900 dark:text-white">{selectedBug.environment.os || 'Not specified'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Version:</span>
                        <span className="text-gray-900 dark:text-white">{selectedBug.environment.version || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-3">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white">Actions</h4>
                    <div className="space-y-2">
                      {selectedBug.status !== 'in-progress' && (
                        <button
                          onClick={() => {
                            handleStatusUpdate(selectedBug.id, 'in-progress');
                            setShowDetails(false);
                          }}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors duration-200"
                        >
                          <Clock size={16} />
                          <span>Mark In Progress</span>
                        </button>
                      )}
                      {selectedBug.status !== 'resolved' && (
                        <button
                          onClick={() => {
                            handleStatusUpdate(selectedBug.id, 'resolved');
                            setShowDetails(false);
                          }}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors duration-200"
                        >
                          <CheckCircle size={16} />
                          <span>Mark Resolved</span>
                        </button>
                      )}
                      {selectedBug.status !== 'closed' && (
                        <button
                          onClick={() => {
                            handleStatusUpdate(selectedBug.id, 'closed');
                            setShowDetails(false);
                          }}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white rounded-lg transition-colors duration-200"
                        >
                          <X size={16} />
                          <span>Close Bug</span>
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={cancelDelete}></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="sm:flex sm:items-start">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-red-100 dark:bg-red-900/20 sm:mx-0 sm:h-10 sm:w-10">
                  <Trash2 className="h-6 w-6 text-red-600 dark:text-red-400" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                  <h3 className="text-lg leading-6 font-medium text-gray-900 dark:text-white">
                    Delete Bug Report
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Are you sure you want to delete this bug report? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => confirmDeleteNote(confirmDelete)}
                  className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-red-600 text-base font-medium text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 sm:ml-3 sm:w-auto sm:text-sm"
                >
                  Delete
                </button>
                <button
                  type="button"
                  onClick={cancelDelete}
                  className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 dark:border-gray-600 shadow-sm px-4 py-2 bg-white dark:bg-gray-700 text-base font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:w-auto sm:text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BugManagement;