import React, { useState, useEffect } from 'react';
import { 
  Download, 
  FileText, 
  Calendar, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Search,
  Filter,
  ExternalLink,
  Lock,
  X,
  Eye,
  Star,
  Clock,
  Shield,
  Edit,
  Save,
  Plus,
  Trash2,
  Bell,
  HeadsetIcon
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDatabase, FileRequirement } from '../hooks/useDatabase';
import { useActivityLogger } from '../hooks/useActivityLogger';
import { showNotification } from '../lib/notifications';
import { ServerFile } from '../lib/supabase';

const Downloads: React.FC = () => {
  const { hasAccess, user } = useAuth();
  const { getServerFiles, logDownload, getFileRequirements, updateFileRequirements } = useDatabase();
  const { logFileDownload } = useActivityLogger();
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [files, setFiles] = useState<ServerFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFile, setSelectedFile] = useState<ServerFile | null>(null);
  const [showDetails, setShowDetails] = useState(false);
  const [requirements, setRequirements] = useState<FileRequirement[]>([]);
  const [editingRequirements, setEditingRequirements] = useState(false);
  const [tempRequirements, setTempRequirements] = useState<FileRequirement[]>([]);

  useEffect(() => {
    loadFiles();
    loadRequirements();
  }, []);

  const loadFiles = async () => {
    setLoading(true);
    const data = await getServerFiles();
    setFiles(data);
    setLoading(false);
  };

  const loadRequirements = () => {
    const reqs = getFileRequirements();
    setRequirements(reqs);
  };

  const handleDownload = async (file: ServerFile) => {
    if (!user) return;

    try {
      // Log the download
      await logDownload({
        user_id: user.id,
        user_name: user.name,
        file_id: file.id,
        file_name: file.name,
        file_version: file.version,
        ip_address: 'Unknown', // Would be populated by server
        user_agent: navigator.userAgent
      });

      // Log activity
      await logFileDownload(file.name, file.version);

      // Show notification
      showNotification.download(`${file.name} v${file.version}`);

      // Create a notification for all users about the download
      createDownloadNotification(file);

      // Open the download link
      window.open(file.file_url, '_blank');
    } catch (error) {
      console.error('Download error:', error);
      showNotification.error('Failed to initiate download');
    }
  };

  const createDownloadNotification = (file: ServerFile) => {
    try {
      // Only create notifications for admins
      const usersKey = 'prodomo_users';
      const usersJson = localStorage.getItem(usersKey);
      if (!usersJson) return;
      
      const users = JSON.parse(usersJson);
      const adminUsers = users.filter((u: any) => u.grade === 'Admin');
      
      // Create notification for each admin
      adminUsers.forEach((admin: any) => {
        if (admin.id === user?.id) return; // Skip creating notification for the current user
        
        const notificationKey = `prodomo_notifications_${admin.id}`;
        const existingNotifications = JSON.parse(localStorage.getItem(notificationKey) || '[]');
        
        const newNotification = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: 'New Download',
          message: `${user?.name} downloaded ${file.name} v${file.version}`,
          type: 'info',
          read: false,
          created_at: new Date().toISOString(),
          related_id: file.id,
          action_url: '/downloads'
        };
        
        const updatedNotifications = [newNotification, ...existingNotifications].slice(0, 50);
        localStorage.setItem(notificationKey, JSON.stringify(updatedNotifications));
      });
      
      console.log('Download notification created for admins');
    } catch (error) {
      console.error('Failed to create download notification:', error);
    }
  };

  const handleViewDetails = (file: ServerFile) => {
    console.log('Downloads: Viewing details for file:', file.name);
    setSelectedFile(file);
    setShowDetails(true);
  };

  const handleEditRequirements = () => {
    setTempRequirements([...requirements]);
    setEditingRequirements(true);
  };

  const handleSaveRequirements = () => {
    const success = updateFileRequirements(tempRequirements);
    if (success) {
      setRequirements(tempRequirements);
      setEditingRequirements(false);
      showNotification.success('System requirements updated successfully');
    } else {
      showNotification.error('Failed to update requirements');
    }
  };

  const handleCancelRequirements = () => {
    setTempRequirements([]);
    setEditingRequirements(false);
  };

  const addRequirement = () => {
    const newReq: FileRequirement = {
      id: Date.now().toString(),
      label: 'New Requirement',
      value: 'Enter value'
    };
    setTempRequirements([...tempRequirements, newReq]);
  };

  const updateRequirement = (id: string, field: 'label' | 'value', value: string) => {
    setTempRequirements(prev => 
      prev.map(req => req.id === id ? { ...req, [field]: value } : req)
    );
  };

  const removeRequirement = (id: string) => {
    setTempRequirements(prev => prev.filter(req => req.id !== id));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/20 dark:text-emerald-400';
      case 'beta':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      case 'deprecated':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'Admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400';
      case 'Support':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400';
      case 'V5':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400';
      case 'V4':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400';
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (type: string) => {
    switch (type) {
      case 'server':
        return '🖥️';
      case 'plugin':
        return '🔌';
      case 'archive':
        return '📦';
      case 'documentation':
        return '📚';
      default:
        return '📄';
    }
  };

  // Check if user has access to a file based on grade
  const userHasAccessToFile = (file: ServerFile): boolean => {
    if (!user) return false;
    
    // Admin can access everything
    if (user.grade === 'Admin') return true;
    
    // Support role can access files based on their V4/V5 access level
    if (user.grade === 'Support') {
      // Support users can only access V4 files by default
      return file.min_grade === 'Guest' || file.min_grade === 'V4';
    }
    
    // For regular users, check grade hierarchy
    const gradeHierarchy = ['Guest', 'V4', 'V5', 'Support', 'Admin'];
    const userGradeIndex = gradeHierarchy.indexOf(user.grade);
    const fileGradeIndex = gradeHierarchy.indexOf(file.min_grade);
    
    return userGradeIndex >= fileGradeIndex;
  };

  const filteredFiles = files.filter(file => {
    const matchesSearch = file.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         file.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === 'all' || file.status === statusFilter;
    const hasRequiredAccess = userHasAccessToFile(file);
    
    return matchesSearch && matchesStatus && hasRequiredAccess;
  });

  if (loading) {
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Server Downloads</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Download the latest Prodomo server versions and updates.
          </p>
        </div>
        {hasAccess('Admin') && (
          <button
            onClick={handleEditRequirements}
            className="mt-4 sm:mt-0 flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
          >
            <Edit size={18} />
            <span>Edit Requirements</span>
          </button>
        )}
      </div>

      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              type="text"
              placeholder="Search versions..."
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
              <option value="active">Active</option>
              <option value="beta">Beta</option>
              <option value="deprecated">Deprecated</option>
            </select>
          </div>
        </div>
      </div>

      {/* User Access Level Info */}
      {user && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <div className="flex items-start space-x-3">
            <Shield className="text-blue-600 dark:text-blue-400 w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                Your Access Level
              </h4>
              <div className="flex items-center space-x-2 mt-1">
                {user.grade === 'Support' ? (
                  <>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getGradeColor('V4')}`}>
                      V4
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getGradeColor('Support')}`}>
                      <HeadsetIcon size={12} className="inline mr-1" />
                      Support
                    </span>
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      You have V4 download access and Support privileges for bug management
                    </span>
                  </>
                ) : (
                  <>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getGradeColor(user.grade)}`}>
                      {user.grade}
                    </span>
                    <span className="text-sm text-blue-700 dark:text-blue-300">
                      You can download files marked for {user.grade} access or lower
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Downloads List */}
      <div className="space-y-4">
        {filteredFiles.map((file) => (
          <div key={file.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="p-6">
              <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
                <div className="flex-1">
                  <div className="flex items-center space-x-3 mb-2">
                    <span className="text-2xl">{getFileTypeIcon(file.file_type)}</span>
                    <h3 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {file.name}
                    </h3>
                    <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full">
                      v{file.version}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(file.status)}`}>
                      {file.status}
                    </span>
                    <span className={`px-2 py-1 text-xs font-medium rounded-full ${getGradeColor(file.min_grade)}`}>
                      {file.min_grade}+ Required
                    </span>
                  </div>
                  <p className="text-gray-600 dark:text-gray-400 mb-4">{file.description}</p>
                  
                  <div className="flex items-center space-x-6 text-sm text-gray-500 dark:text-gray-400 mb-4">
                    <div className="flex items-center space-x-1">
                      <Calendar size={16} />
                      <span>{new Date(file.created_at).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <Download size={16} />
                      <span>{file.download_count.toLocaleString()} downloads</span>
                    </div>
                    <div className="flex items-center space-x-1">
                      <FileText size={16} />
                      <span>{formatFileSize(file.file_size)}</span>
                    </div>
                  </div>

                  {/* Quick changelog preview */}
                  {file.changelog && file.changelog.length > 0 && (
                    <div className="mb-4">
                      <h4 className="text-sm font-medium text-gray-900 dark:text-white mb-2 flex items-center">
                        <Star size={14} className="mr-1 text-amber-500" />
                        What's New:
                      </h4>
                      <ul className="space-y-1">
                        {file.changelog.slice(0, 2).map((change, index) => (
                          <li key={index} className="flex items-start space-x-2 text-sm text-gray-600 dark:text-gray-400">
                            <CheckCircle size={14} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span>{change}</span>
                          </li>
                        ))}
                        {file.changelog.length > 2 && (
                          <li className="text-sm text-blue-600 dark:text-blue-400 ml-6">
                            +{file.changelog.length - 2} more changes
                          </li>
                        )}
                      </ul>
                    </div>
                  )}
                </div>

                <div className="flex flex-col sm:flex-row lg:flex-col space-y-2 sm:space-y-0 sm:space-x-2 lg:space-x-0 lg:space-y-2 lg:ml-6">
                  {userHasAccessToFile(file) ? (
                    <button
                      onClick={() => handleDownload(file)}
                      className="flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
                    >
                      <Download size={18} />
                      <span>Download</span>
                    </button>
                  ) : (
                    <div className="flex items-center justify-center space-x-2 px-6 py-3 bg-gray-300 dark:bg-gray-600 text-gray-500 dark:text-gray-400 rounded-lg">
                      <Lock size={18} />
                      <span>Requires {file.min_grade}</span>
                    </div>
                  )}
                  
                  <button 
                    onClick={() => handleViewDetails(file)}
                    className="flex items-center justify-center space-x-2 px-6 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    <Eye size={18} />
                    <span>View Details</span>
                  </button>
                </div>
              </div>

              {file.status === 'deprecated' && (
                <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="text-amber-600 dark:text-amber-400 w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Deprecated Version
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        This version is no longer actively maintained. Consider upgrading to a newer stable release.
                      </p>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        ))}

        {filteredFiles.length === 0 && (
          <div className="text-center py-12">
            <FileText className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No versions found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your search criteria or access level.
            </p>
          </div>
        )}
      </div>

      {/* Requirements Editor Modal */}
      {editingRequirements && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleCancelRequirements}></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Edit System Requirements
                </h3>
                <button
                  onClick={handleCancelRequirements}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4 max-h-96 overflow-y-auto">
                {tempRequirements.map((req, index) => (
                  <div key={req.id} className="flex items-center space-x-3 p-3 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      <input
                        type="text"
                        value={req.label}
                        onChange={(e) => updateRequirement(req.id, 'label', e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Requirement name"
                      />
                      <input
                        type="text"
                        value={req.value}
                        onChange={(e) => updateRequirement(req.id, 'value', e.target.value)}
                        className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Requirement value"
                      />
                    </div>
                    <button
                      onClick={() => removeRequirement(req.id)}
                      className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors duration-200"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <div className="mt-4">
                <button
                  onClick={addRequirement}
                  className="flex items-center space-x-2 px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
                >
                  <Plus size={16} />
                  <span>Add Requirement</span>
                </button>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCancelRequirements}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveRequirements}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors duration-200"
                >
                  <Save size={18} />
                  <span>Save Requirements</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* File Details Modal */}
      {showDetails && selectedFile && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setShowDetails(false)}></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center space-x-3">
                  <span className="text-3xl">{getFileTypeIcon(selectedFile.file_type)}</span>
                  <div>
                    <h3 className="text-2xl font-bold text-gray-900 dark:text-white">
                      {selectedFile.name} v{selectedFile.version}
                    </h3>
                    <p className="text-gray-500 dark:text-gray-400">{selectedFile.description}</p>
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
                {/* File Information */}
                <div className="lg:col-span-2 space-y-6">
                  {/* What's New Section */}
                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 dark:from-blue-900/20 dark:to-purple-900/20 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Star className="mr-2 text-amber-500" size={20} />
                      What's New in v{selectedFile.version}
                    </h4>
                    {selectedFile.changelog && selectedFile.changelog.length > 0 ? (
                      <ul className="space-y-3">
                        {selectedFile.changelog.map((change, index) => (
                          <li key={index} className="flex items-start space-x-3">
                            <CheckCircle size={16} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                            <span className="text-gray-700 dark:text-gray-300">{change}</span>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-gray-500 dark:text-gray-400">No changelog available for this version.</p>
                    )}
                  </div>

                  {/* File Details */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">File Information</h4>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">File Type</p>
                        <p className="text-gray-900 dark:text-white capitalize">{selectedFile.file_type}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">File Size</p>
                        <p className="text-gray-900 dark:text-white">{formatFileSize(selectedFile.file_size)}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Status</p>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(selectedFile.status)}`}>
                          {selectedFile.status}
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Access Level</p>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getGradeColor(selectedFile.min_grade)}`}>
                          {selectedFile.min_grade}+
                        </span>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Downloads</p>
                        <p className="text-gray-900 dark:text-white">{selectedFile.download_count.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500 dark:text-gray-400">Release Date</p>
                        <p className="text-gray-900 dark:text-white">{new Date(selectedFile.created_at).toLocaleDateString()}</p>
                      </div>
                    </div>
                  </div>

                  {/* Notification Settings */}
                  <div className="bg-blue-50 dark:bg-blue-900/20 rounded-xl p-6 border border-blue-200 dark:border-blue-800">
                    <h4 className="text-lg font-semibold text-blue-900 dark:text-blue-100 mb-4 flex items-center">
                      <Bell className="mr-2 text-blue-500" size={20} />
                      Download Notifications
                    </h4>
                    <p className="text-blue-800 dark:text-blue-200 mb-4">
                      Admins will be notified when users download this file. This helps track usage and identify popular files.
                    </p>
                    <div className="flex items-center space-x-2">
                      <CheckCircle size={16} className="text-blue-600 dark:text-blue-400" />
                      <span className="text-blue-800 dark:text-blue-200">
                        Notifications are automatically sent to admins
                      </span>
                    </div>
                  </div>
                </div>

                {/* Download Actions */}
                <div className="space-y-4">
                  <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Download Options</h4>
                    
                    {userHasAccessToFile(selectedFile) ? (
                      <div className="space-y-3">
                        <button
                          onClick={() => {
                            handleDownload(selectedFile);
                            setShowDetails(false);
                          }}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
                        >
                          <Download size={18} />
                          <span>Download Now</span>
                        </button>
                        
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(selectedFile.file_url);
                            showNotification.success('Download link copied to clipboard');
                          }}
                          className="w-full flex items-center justify-center space-x-2 px-4 py-3 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                        >
                          <ExternalLink size={18} />
                          <span>Copy Link</span>
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-4">
                        <Lock className="mx-auto w-12 h-12 text-gray-400 mb-3" />
                        <p className="text-gray-500 dark:text-gray-400 text-sm">
                          {selectedFile.min_grade} access required
                        </p>
                      </div>
                    )}
                  </div>

                  {/* System Requirements */}
                  <div className="bg-gray-50 dark:bg-gray-900 rounded-xl p-6">
                    <h4 className="text-lg font-semibold text-gray-900 dark:text-white mb-4 flex items-center">
                      <Shield size={18} className="mr-2" />
                      System Requirements
                    </h4>
                    <div className="space-y-2 text-sm">
                      {requirements.map((req) => (
                        <div key={req.id} className="flex justify-between">
                          <span className="text-gray-500 dark:text-gray-400">{req.label}:</span>
                          <span className="text-gray-900 dark:text-white">{req.value}</span>
                        </div>
                      ))}
                    </div>
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

export default Downloads;