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
  MessageSquare,
  Send,
  Calendar,
  RefreshCw,
  ArrowLeft
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDatabase } from '../hooks/useDatabase';
import { useActivityLogger } from '../hooks/useActivityLogger';
import { showNotification } from '../lib/notifications';
import { BugReport } from '../lib/supabase';

const MyBugReports: React.FC = () => {
  const { user, hasAccess } = useAuth();
  const { getBugReports, updateBugReport, loading } = useDatabase();
  const { logSystemAction } = useActivityLogger();
  
  const [bugs, setBugs] = useState<BugReport[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [selectedBug, setSelectedBug] = useState<BugReport | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [newComment, setNewComment] = useState('');

  useEffect(() => {
    loadBugs();
  }, []);

  const loadBugs = async () => {
    if (!user) return;
    
    const bugReports = await getBugReports();
    // Filter to only show bugs submitted by the current user
    const userBugs = bugReports.filter(bug => bug.reporter_id === user.id);
    setBugs(userBugs);
  };

  const handleAddComment = async () => {
    if (!selectedBug || !user || !newComment.trim()) return;

    try {
      // Create a new comment
      const comment = {
        id: `comment_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
        author: user.name,
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
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      showNotification.error('Failed to add comment');
    }
  };

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
                         bug.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bug.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString();
  };

  if (!hasAccess('V4')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Restricted</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You need V4+ access to view bug reports.
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Bug Reports</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            View and manage the bug reports you've submitted.
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex items-center space-x-3">
          <button
            onClick={() => window.location.href = '/bug-report'}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
          >
            <Bug size={18} />
            <span>Submit New Bug</span>
          </button>
          <button
            onClick={loadBugs}
            disabled={loading}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 hover:bg-gray-300 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-200 rounded-lg font-medium transition-colors duration-200"
          >
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
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
        </div>
      </div>

      {/* Bug Reports List */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Your Submitted Bug Reports</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Track the status of bugs you've reported and communicate with our team.
          </p>
        </div>
        
        {filteredBugs.length === 0 ? (
          <div className="text-center py-12">
            <Bug className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No bug reports found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              {searchTerm || statusFilter !== 'all' 
                ? 'Try adjusting your search criteria.' 
                : "You haven't submitted any bug reports yet."}
            </p>
            <button
              onClick={() => window.location.href = '/bug-report'}
              className="mt-4 flex items-center space-x-2 mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
            >
              <Bug size={18} />
              <span>Submit a Bug Report</span>
            </button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredBugs.map((bug) => (
              <div 
                key={bug.id} 
                className="p-6 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 cursor-pointer"
                onClick={() => {
                  setSelectedBug(bug);
                  setShowDetails(true);
                }}
              >
                <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {bug.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(bug.severity)}`}>
                        {bug.severity}
                      </span>
                      <span className={`flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(bug.status)}`}>
                        {getStatusIcon(bug.status)}
                        <span className="capitalize">{bug.status.replace('-', ' ')}</span>
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-2 line-clamp-2">
                      {bug.description}
                    </p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <div className="flex items-center space-x-1">
                        <Calendar size={14} />
                        <span>{new Date(bug.created_at).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <MessageSquare size={14} />
                        <span>{bug.comments?.length || 0} comments</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-4 lg:mt-0 lg:ml-4">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedBug(bug);
                        setShowDetails(true);
                      }}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-100 hover:bg-blue-200 dark:bg-blue-900/20 dark:hover:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-lg text-sm transition-colors duration-200"
                    >
                      <Eye size={16} />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              </div>
            ))}
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
                  <button
                    onClick={() => setShowDetails(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                  >
                    <ArrowLeft size={20} />
                  </button>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900 dark:text-white">
                      {selectedBug.title}
                    </h3>
                    <div className="flex items-center space-x-2 mt-1">
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(selectedBug.severity)}`}>
                        {selectedBug.severity}
                      </span>
                      <span className={`flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedBug.status)}`}>
                        {getStatusIcon(selectedBug.status)}
                        <span className="capitalize">{selectedBug.status.replace('-', ' ')}</span>
                      </span>
                    </div>
                  </div>
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
                  {selectedBug.steps && selectedBug.steps.length > 0 && (
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
                                <span className="font-medium text-gray-900 dark:text-white">{comment.author}</span>
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
                            No comments yet. Be the first to comment!
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

                <div className="space-y-6">
                  {/* Bug Info */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Bug Information</h4>
                    <div className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Category:</span>
                        <span className="text-gray-900 dark:text-white capitalize">{selectedBug.category}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Reported by:</span>
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
                      {selectedBug.assignee_name && (
                        <div className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">Assigned to:</span>
                          <span className="text-gray-900 dark:text-white">{selectedBug.assignee_name}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Environment */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">Environment</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">OS:</span>
                        <span className="text-gray-900 dark:text-white">{selectedBug.environment?.os || 'Not specified'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500 dark:text-gray-400">Version:</span>
                        <span className="text-gray-900 dark:text-white">{selectedBug.environment?.version || 'Not specified'}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Information */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
                    <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-3 flex items-center">
                      <Clock className="mr-2" size={18} />
                      Status Information
                    </h4>
                    <p className="text-blue-800 dark:text-blue-200 text-sm">
                      {selectedBug.status === 'open' && 'Your bug report has been received and is awaiting review by our team.'}
                      {selectedBug.status === 'in-progress' && 'Our team is currently working on resolving this issue.'}
                      {selectedBug.status === 'resolved' && 'This issue has been resolved. Please verify the fix and let us know if you still experience problems.'}
                      {selectedBug.status === 'closed' && 'This issue has been closed. If you still experience problems, please submit a new bug report.'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyBugReports;