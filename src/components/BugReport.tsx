import React, { useState, useEffect } from 'react';
import {
  Bug,
  Send,
  AlertCircle,
  CheckCircle,
  Upload,
  X,
  FileText,
  Server,
  Eye,
  Clock,
  MessageSquare,
  Plus,
  RefreshCw,
  Filter,
  Search,
  Shield
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDatabase } from '../hooks/useDatabase';
import { useActivityLogger } from '../hooks/useActivityLogger';
import { showNotification } from '../lib/notifications';
import { BugReport as BugReportType } from '../lib/supabase';

const BugReport: React.FC = () => {
  const { user, hasAccess } = useAuth();
  const { createBugReport, getBugReports, updateBugReport, loading } = useDatabase();
  const { logSystemAction, logBugReportSubmit } = useActivityLogger();
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium' as 'low' | 'medium' | 'high' | 'critical',
    category: 'general' as 'general' | 'ui' | 'performance' | 'security' | 'feature',
    steps: [''],
    expected_behavior: '',
    actual_behavior: '',
    environment: {
      os: 'FreeBSD',
      version: 'V4'
    }
  });
  
  const [attachments, setAttachments] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [myBugReports, setMyBugReports] = useState<BugReportType[]>([]);
  const [selectedBug, setSelectedBug] = useState<BugReportType | null>(null);
  const [showBugDetails, setShowBugDetails] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const severityOptions = [
    { value: 'low', label: 'Low', color: 'text-green-600 bg-green-100 dark:bg-green-900/20 dark:text-green-400', description: 'Minor issue, workaround available' },
    { value: 'medium', label: 'Medium', color: 'text-yellow-600 bg-yellow-100 dark:bg-yellow-900/20 dark:text-yellow-400', description: 'Moderate impact on functionality' },
    { value: 'high', label: 'High', color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/20 dark:text-orange-400', description: 'Significant impact, needs attention' },
    { value: 'critical', label: 'Critical', color: 'text-red-600 bg-red-100 dark:bg-red-900/20 dark:text-red-400', description: 'System breaking, immediate fix required' }
  ];

  const categoryOptions = [
    { value: 'general', label: 'General', icon: Bug },
    { value: 'ui', label: 'User Interface', icon: Server },
    { value: 'performance', label: 'Performance', icon: Server },
    { value: 'security', label: 'Security', icon: AlertCircle },
    { value: 'feature', label: 'Feature Request', icon: CheckCircle }
  ];

  useEffect(() => {
    loadMyBugReports();
  }, [user]);

  const loadMyBugReports = async () => {
    if (!user) return;
    
    try {
      const allBugs = await getBugReports();
      // Filter to only show bugs reported by the current user
      const myBugs = allBugs.filter(bug => bug.reporter_id === user.id);
      setMyBugReports(myBugs);
    } catch (error) {
      console.error('Failed to load bug reports:', error);
      showNotification.error('Failed to load your bug reports');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) return;

    try {
      setIsSubmitting(true);
      
      const bugData = {
        ...formData,
        reporter_id: user.id,
        reporter_name: user.name,
        steps: formData.steps.filter(step => step.trim() !== ''),
        attachments: attachments.map(file => file.name), // In real app, upload files first
        status: 'open' as const,
        environment: {
          browser: '', // Empty browser field since it's removed from UI
          os: formData.environment.os,
          version: formData.environment.version
        },
        comments: []
      };

      const success = await createBugReport(bugData);
      
      if (success) {
        showNotification.success('Bug report submitted successfully');
        await logBugReportSubmit(formData.title);
        await logSystemAction(`Submitted bug report: ${formData.title}`);
        
        // Reset form
        setFormData({
          title: '',
          description: '',
          severity: 'medium',
          category: 'general',
          steps: [''],
          expected_behavior: '',
          actual_behavior: '',
          environment: { os: 'FreeBSD', version: 'V4' }
        });
        setAttachments([]);
        setShowForm(false);
        
        // Reload bug reports
        await loadMyBugReports();
      }
    } catch (error) {
      console.error('Failed to submit bug report:', error);
      showNotification.error('Failed to submit bug report');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddComment = async () => {
    if (!selectedBug || !user || !newComment.trim()) return;
    
    try {
      // Create a new comment
      const comment = {
        id: `comment_${Date.now()}`,
        author: user.name,
        author_grade: user.grade,
        content: newComment,
        created_at: new Date().toISOString()
      };
      
      // Add comment to the bug report
      const updatedComments = [...(selectedBug.comments || []), comment];
      
      const success = await updateBugReport(selectedBug.id, {
        comments: updatedComments
      });
      
      if (success) {
        showNotification.success('Comment added successfully');
        setNewComment('');
        
        // Reload bug reports to get the updated data
        await loadMyBugReports();
        
        // Update the selected bug with the new comment
        const updatedBugs = await getBugReports();
        const updatedBug = updatedBugs.find(bug => bug.id === selectedBug.id);
        if (updatedBug) {
          setSelectedBug(updatedBug);
        }
      }
    } catch (error) {
      console.error('Failed to add comment:', error);
      showNotification.error('Failed to add comment');
    }
  };

  const addStep = () => {
    setFormData({
      ...formData,
      steps: [...formData.steps, '']
    });
  };

  const updateStep = (index: number, value: string) => {
    const newSteps = [...formData.steps];
    newSteps[index] = value;
    setFormData({ ...formData, steps: newSteps });
  };

  const removeStep = (index: number) => {
    const newSteps = formData.steps.filter((_, i) => i !== index);
    setFormData({ ...formData, steps: newSteps });
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    setAttachments([...attachments, ...files]);
  };

  const removeAttachment = (index: number) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleViewBugDetails = (bug: BugReportType) => {
    setSelectedBug(bug);
    setShowBugDetails(true);
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

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'Admin': return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'Support': return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400';
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

  const filteredBugReports = myBugReports.filter(bug => {
    const matchesSearch = bug.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         bug.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || bug.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (!hasAccess('V4')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Restricted</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You need V4+ access to report bugs.
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Bug Reports</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            View your submitted bug reports and submit new ones.
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <button
            onClick={() => {
              setShowForm(!showForm);
              if (showBugDetails) setShowBugDetails(false);
            }}
            className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
          >
            {showForm ? (
              <>
                <X size={18} />
                <span>Cancel</span>
              </>
            ) : (
              <>
                <Plus size={18} />
                <span>Submit New Bug</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Search and Filter */}
      {!showForm && !showBugDetails && (
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
              <button
                onClick={loadMyBugReports}
                disabled={loading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200"
              >
                <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                <span>Refresh</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bug Report Form */}
      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Bug Report Details</h3>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Please provide as much detail as possible to help us reproduce and fix the issue.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Title */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Bug Title *
              </label>
              <input
                type="text"
                value={formData.title}
                onChange={(e) => setFormData({...formData, title: e.target.value})}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Brief description of the bug"
                required
              />
            </div>

            {/* Severity and Category */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Severity *
                </label>
                <div className="space-y-2">
                  {severityOptions.map((option) => (
                    <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                      <input
                        type="radio"
                        name="severity"
                        value={option.value}
                        checked={formData.severity === option.value}
                        onChange={(e) => setFormData({...formData, severity: e.target.value as any})}
                        className="text-blue-600 focus:ring-blue-500"
                      />
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${option.color}`}>
                        {option.label}
                      </span>
                      <span className="text-sm text-gray-600 dark:text-gray-400">{option.description}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Category *
                </label>
                <div className="space-y-2">
                  {categoryOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <label key={option.value} className="flex items-center space-x-3 cursor-pointer">
                        <input
                          type="radio"
                          name="category"
                          value={option.value}
                          checked={formData.category === option.value}
                          onChange={(e) => setFormData({...formData, category: e.target.value as any})}
                          className="text-blue-600 focus:ring-blue-500"
                        />
                        <IconComponent size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-white">{option.label}</span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Description *
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({...formData, description: e.target.value})}
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Detailed description of the bug..."
                required
              />
            </div>

            {/* Steps to Reproduce */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Steps to Reproduce
              </label>
              <div className="space-y-2">
                {formData.steps.map((step, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400 w-8">{index + 1}.</span>
                    <input
                      type="text"
                      value={step}
                      onChange={(e) => updateStep(index, e.target.value)}
                      className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Describe this step..."
                    />
                    {formData.steps.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeStep(index)}
                        className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                      >
                        <X size={16} />
                      </button>
                    )}
                  </div>
                ))}
                <button
                  type="button"
                  onClick={addStep}
                  className="flex items-center space-x-2 px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
                >
                  <span>Add Step</span>
                </button>
              </div>
            </div>

            {/* Expected vs Actual Behavior */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Expected Behavior
                </label>
                <textarea
                  value={formData.expected_behavior}
                  onChange={(e) => setFormData({...formData, expected_behavior: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What should happen?"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Actual Behavior
                </label>
                <textarea
                  value={formData.actual_behavior}
                  onChange={(e) => setFormData({...formData, actual_behavior: e.target.value})}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="What actually happens?"
                />
              </div>
            </div>

            {/* Environment Information */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Environment Information
              </label>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Operating System
                  </label>
                  <select
                    value={formData.environment.os}
                    onChange={(e) => setFormData({
                      ...formData,
                      environment: { ...formData.environment, os: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="FreeBSD">FreeBSD</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Version
                  </label>
                  <select
                    value={formData.environment.version}
                    onChange={(e) => setFormData({
                      ...formData,
                      environment: { ...formData.environment, version: e.target.value }
                    })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="V4">V4</option>
                    <option value="V5">V5</option>
                  </select>
                </div>
              </div>
            </div>

            {/* File Attachments */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Attachments (Screenshots, logs, etc.)
              </label>
              <div className="border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-lg p-6">
                <div className="text-center">
                  <Upload className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <label className="cursor-pointer">
                      <span className="mt-2 block text-sm font-medium text-gray-900 dark:text-white">
                        Upload files
                      </span>
                      <input
                        type="file"
                        multiple
                        accept="image/*,.txt,.log,.pdf"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      PNG, JPG, TXT, LOG, PDF up to 10MB each
                    </p>
                  </div>
                </div>
              </div>

              {/* Attachment List */}
              {attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {attachments.map((file, index) => (
                    <div key={index} className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <FileText size={16} className="text-gray-400" />
                        <span className="text-sm text-gray-900 dark:text-white">{file.name}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          ({(file.size / 1024).toFixed(1)} KB)
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeAttachment(index)}
                        className="text-red-500 hover:text-red-700 dark:hover:text-red-400"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Submit Button */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  setFormData({
                    title: '',
                    description: '',
                    severity: 'medium',
                    category: 'general',
                    steps: [''],
                    expected_behavior: '',
                    actual_behavior: '',
                    environment: { os: 'FreeBSD', version: 'V4' }
                  });
                  setAttachments([]);
                }}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
              >
                Clear Form
              </button>
              <button
                type="submit"
                disabled={isSubmitting || !formData.title || !formData.description}
                className="flex items-center space-x-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200"
              >
                <Send size={18} />
                <span>{isSubmitting ? 'Submitting...' : 'Submit Bug Report'}</span>
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bug Details View */}
      {showBugDetails && selectedBug && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <button
                  onClick={() => setShowBugDetails(false)}
                  className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
                >
                  <X size={20} />
                </button>
                <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                  Bug Report Details
                </h3>
              </div>
              <div className="flex items-center space-x-2">
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(selectedBug.severity)}`}>
                  {selectedBug.severity}
                </span>
                <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedBug.status)}`}>
                  {selectedBug.status}
                </span>
              </div>
            </div>
          </div>

          <div className="p-6">
            <div className="space-y-6">
              <div>
                <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">
                  {selectedBug.title}
                </h4>
                <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                  {selectedBug.description}
                </p>
              </div>

              {selectedBug.steps && selectedBug.steps.length > 0 && (
                <div>
                  <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
                    Steps to Reproduce
                  </h4>
                  <ol className="list-decimal list-inside space-y-1">
                    {selectedBug.steps.map((step, index) => (
                      <li key={index} className="text-gray-600 dark:text-gray-400">{step}</li>
                    ))}
                  </ol>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {selectedBug.expected_behavior && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
                      Expected Behavior
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {selectedBug.expected_behavior}
                    </p>
                  </div>
                )}
                {selectedBug.actual_behavior && (
                  <div>
                    <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
                      Actual Behavior
                    </h4>
                    <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                      {selectedBug.actual_behavior}
                    </p>
                  </div>
                )}
              </div>

              <div className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-2">
                  Environment
                </h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">OS:</p>
                    <p className="text-gray-900 dark:text-white">{selectedBug.environment?.os || 'Not specified'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Version:</p>
                    <p className="text-gray-900 dark:text-white">{selectedBug.environment?.version || 'Not specified'}</p>
                  </div>
                </div>
              </div>

              {/* Comments Section */}
              <div className="border-t border-gray-200 dark:border-gray-700 pt-6">
                <h4 className="text-md font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                  <MessageSquare size={18} className="mr-2" />
                  Comments
                </h4>
                
                <div className="space-y-4 mb-6">
                  {selectedBug.comments && selectedBug.comments.length > 0 ? (
                    selectedBug.comments.map((comment, index) => (
                      <div key={index} className="bg-gray-50 dark:bg-gray-900 rounded-lg p-4">
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
                            {formatTimeAgo(comment.created_at)}
                          </span>
                        </div>
                        <p className="text-gray-600 dark:text-gray-400 whitespace-pre-wrap">
                          {comment.content}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-4">
                      <MessageSquare className="mx-auto h-8 w-8 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                        No comments yet
                      </p>
                    </div>
                  )}
                </div>

                {/* Add Comment Form */}
                <div className="space-y-3">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    Add a Comment
                  </label>
                  <textarea
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Type your comment here..."
                  />
                  <div className="flex justify-end">
                    <button
                      onClick={handleAddComment}
                      disabled={!newComment.trim() || loading}
                      className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg font-medium transition-colors duration-200"
                    >
                      <Send size={16} />
                      <span>{loading ? 'Sending...' : 'Send Comment'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* My Bug Reports List */}
      {!showForm && !showBugDetails && (
        <div className="space-y-4">
          {filteredBugReports.length > 0 ? (
            filteredBugReports.map((bug) => (
              <div 
                key={bug.id} 
                className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200 cursor-pointer"
                onClick={() => handleViewBugDetails(bug)}
              >
                <div className="p-6">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {bug.title}
                      </h3>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getSeverityColor(bug.severity)}`}>
                        {bug.severity}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(bug.status)}`}>
                        {bug.status.replace('-', ' ')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <Clock size={14} />
                      <span>{formatTimeAgo(bug.created_at)}</span>
                    </div>
                  </div>
                  
                  <p className="text-gray-600 dark:text-gray-400 line-clamp-2 mb-3">
                    {bug.description}
                  </p>
                  
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2 text-sm text-gray-500 dark:text-gray-400">
                      <MessageSquare size={14} />
                      <span>{bug.comments ? bug.comments.length : 0} comments</span>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleViewBugDetails(bug);
                      }}
                      className="flex items-center space-x-1 text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 text-sm"
                    >
                      <Eye size={14} />
                      <span>View Details</span>
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
              <Bug className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">No bug reports found</h3>
              <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {searchTerm || statusFilter !== 'all' 
                  ? 'Try adjusting your search criteria.'
                  : 'You haven\'t submitted any bug reports yet.'}
              </p>
              <button
                onClick={() => setShowForm(true)}
                className="mt-4 flex items-center space-x-2 mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                <Plus size={18} />
                <span>Submit New Bug</span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Tips */}
      {showForm && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-xl p-6">
          <div className="flex items-start space-x-3">
            <CheckCircle className="text-blue-600 dark:text-blue-400 w-6 h-6 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-2">
                Tips for Better Bug Reports
              </h4>
              <ul className="space-y-1 text-sm text-blue-800 dark:text-blue-200">
                <li>• Be specific and descriptive in your title</li>
                <li>• Include step-by-step instructions to reproduce the issue</li>
                <li>• Attach screenshots or screen recordings when possible</li>
                <li>• Mention what you expected to happen vs. what actually happened</li>
                <li>• Specify which Prodomo version you're using (V4 or V5)</li>
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BugReport;