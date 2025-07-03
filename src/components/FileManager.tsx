import React, { useState, useEffect } from 'react';
import { useDropzone } from 'react-dropzone';
import {
  Upload,
  File,
  Folder,
  Download,
  Edit,
  Trash2,
  Plus,
  Save,
  X,
  AlertCircle,
  CheckCircle,
  Archive,
  FileText,
  Server,
  Package,
  Link,
  Globe,
  HardDrive,
  Bell
} from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../contexts/AuthContext';
import { useActivityLogger } from '../hooks/useActivityLogger';
import { showNotification } from '../lib/notifications';
import { ServerFile } from '../lib/supabase';

const FileManager: React.FC = () => {
  const { user, hasAccess } = useAuth();
  const {
    getServerFiles,
    createServerFile,
    updateServerFile,
    deleteServerFile,
    uploadFile,
    loading,
    error,
    setError
  } = useDatabase();
  const { logFileUpload, logFileDelete } = useActivityLogger();

  const [files, setFiles] = useState<ServerFile[]>([]);
  const [isEditing, setIsEditing] = useState(false);
  const [editingFile, setEditingFile] = useState<ServerFile | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    version: '',
    description: '',
    file_type: 'server' as 'server' | 'plugin' | 'archive' | 'documentation',
    min_grade: 'Guest' as 'Guest' | 'V4' | 'V5' | 'Admin',
    status: 'active' as 'active' | 'deprecated' | 'beta',
    changelog: [''],
    file_url: '',
    upload_method: 'direct' as 'direct' | 'google_drive' | 'mega' | 'external',
    notify_users: true
  });
  const [uploadedFile, setUploadedFile] = useState<File | null>(null);

  useEffect(() => {
    loadFiles();
  }, []);

  const loadFiles = async () => {
    const data = await getServerFiles();
    setFiles(data);
  };

  const onDrop = (acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      setUploadedFile(acceptedFiles[0]);
      setFormData(prev => ({ ...prev, upload_method: 'direct' }));
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/zip': ['.zip'],
      'application/x-rar-compressed': ['.rar'],
      'application/x-7z-compressed': ['.7z'],
      'application/octet-stream': ['.jar', '.exe'],
      'text/plain': ['.txt'],
      'application/pdf': ['.pdf']
    },
    maxFiles: 1
  });

  const handleEdit = (file: ServerFile) => {
    setEditingFile(file);
    setFormData({
      name: file.name,
      version: file.version,
      description: file.description,
      file_type: file.file_type,
      min_grade: file.min_grade,
      status: file.status,
      changelog: file.changelog || [''],
      file_url: file.file_url,
      upload_method: 'external',
      notify_users: true
    });
    setIsEditing(true);
  };

  const createFileNotification = (fileData: any, isNew: boolean) => {
    try {
      // Only create notifications if the notify_users flag is set
      if (!formData.notify_users) return;
      
      // Get all users from localStorage
      const usersKey = 'prodomo_users';
      const usersJson = localStorage.getItem(usersKey);
      if (!usersJson) return;
      
      const users = JSON.parse(usersJson);
      
      // Create notification for each user with appropriate access level
      users.forEach((user: any) => {
        // Skip if user doesn't have access to this file
        const userGrade = user.grade;
        const fileGrade = fileData.min_grade;
        
        const gradeHierarchy = ['Guest', 'V4', 'V5', 'Admin'];
        const userGradeIndex = gradeHierarchy.indexOf(userGrade);
        const fileGradeIndex = gradeHierarchy.indexOf(fileGrade);
        
        if (userGradeIndex < fileGradeIndex) return;
        
        const notificationKey = `prodomo_notifications_${user.id}`;
        const existingNotifications = JSON.parse(localStorage.getItem(notificationKey) || '[]');
        
        const newNotification = {
          id: `notif_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          title: isNew ? 'New File Available' : 'File Updated',
          message: isNew 
            ? `${fileData.name} v${fileData.version} is now available for download`
            : `${fileData.name} has been updated to v${fileData.version}`,
          type: 'info',
          read: false,
          created_at: new Date().toISOString(),
          related_id: fileData.id,
          action_url: '/downloads'
        };
        
        const updatedNotifications = [newNotification, ...existingNotifications].slice(0, 50);
        localStorage.setItem(notificationKey, JSON.stringify(updatedNotifications));
      });
      
      console.log(`File ${isNew ? 'upload' : 'update'} notification created for users`);
    } catch (error) {
      console.error('Failed to create file notification:', error);
    }
  };

  const handleSave = async () => {
    try {
      let fileUrl = editingFile?.file_url || formData.file_url;
      let fileSize = editingFile?.file_size || 0;

      // Handle different upload methods
      if (formData.upload_method === 'direct' && uploadedFile) {
        const fileName = `${Date.now()}-${uploadedFile.name}`;
        const uploadedUrl = await uploadFile(uploadedFile, 'server-files', fileName);
        if (uploadedUrl) {
          fileUrl = uploadedUrl;
          fileSize = uploadedFile.size;
          showNotification.upload(uploadedFile.name);
        } else {
          throw new Error('Failed to upload file');
        }
      } else if (formData.upload_method !== 'direct' && formData.file_url) {
        fileUrl = formData.file_url;
        // Estimate file size for external links (in production, you might fetch this)
        fileSize = editingFile?.file_size || 50 * 1024 * 1024; // Default 50MB
      }

      if (!fileUrl) {
        throw new Error('Please provide a file or download URL');
      }

      const fileData = {
        ...formData,
        file_url: fileUrl,
        file_size: fileSize,
        changelog: formData.changelog.filter(item => item.trim() !== ''),
        created_by: user?.id || '',
        download_count: editingFile?.download_count || 0
      };

      let success = false;
      if (editingFile) {
        success = await updateServerFile(editingFile.id, fileData);
        if (success) {
          showNotification.success(`${formData.name} has been updated`);
          await logFileUpload(formData.name, 'update');
          
          // Create notifications for users about the update
          createFileNotification({...fileData, id: editingFile.id}, false);
        }
      } else {
        success = await createServerFile(fileData);
        if (success) {
          showNotification.success(`${formData.name} has been uploaded`);
          await logFileUpload(formData.name, formData.file_type);
          
          // Get the newly created file to get its ID
          const updatedFiles = await getServerFiles();
          const newFile = updatedFiles.find(f => 
            f.name === formData.name && 
            f.version === formData.version
          );
          
          if (newFile) {
            // Create notifications for users about the new file
            createFileNotification({...fileData, id: newFile.id}, true);
          }
        }
      }

      if (success) {
        await loadFiles();
        handleCancel();
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      showNotification.error(errorMessage);
    }
  };

  const handleCancel = () => {
    setIsEditing(false);
    setEditingFile(null);
    setUploadedFile(null);
    setFormData({
      name: '',
      version: '',
      description: '',
      file_type: 'server',
      min_grade: 'Guest',
      status: 'active',
      changelog: [''],
      file_url: '',
      upload_method: 'direct',
      notify_users: true
    });
  };

  const handleDelete = async (file: ServerFile) => {
    setConfirmDelete(file.id);
  };

  const confirmDeleteFile = async (id: string) => {
    const file = files.find(f => f.id === id);
    if (!file) return;
    
    const success = await deleteServerFile(id);
    if (success) {
      await loadFiles();
      showNotification.fileDeleted(file.name);
      await logFileDelete(file.name);
    } else {
      showNotification.error('Failed to delete file');
    }
    setConfirmDelete(null);
  };

  const cancelDelete = () => {
    setConfirmDelete(null);
  };

  const addChangelogItem = () => {
    setFormData({
      ...formData,
      changelog: [...formData.changelog, '']
    });
  };

  const updateChangelogItem = (index: number, value: string) => {
    const newChangelog = [...formData.changelog];
    newChangelog[index] = value;
    setFormData({ ...formData, changelog: newChangelog });
  };

  const removeChangelogItem = (index: number) => {
    const newChangelog = formData.changelog.filter((_, i) => i !== index);
    setFormData({ ...formData, changelog: newChangelog });
  };

  const getFileIcon = (type: string) => {
    switch (type) {
      case 'server':
        return <Server className="w-5 h-5 text-blue-500" />;
      case 'plugin':
        return <Package className="w-5 h-5 text-purple-500" />;
      case 'archive':
        return <Archive className="w-5 h-5 text-amber-500" />;
      case 'documentation':
        return <FileText className="w-5 h-5 text-emerald-500" />;
      default:
        return <File className="w-5 h-5 text-gray-500" />;
    }
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getUploadMethodIcon = (method: string) => {
    switch (method) {
      case 'google_drive':
        return <Globe className="w-5 h-5 text-blue-500" />;
      case 'mega':
        return <Globe className="w-5 h-5 text-red-500" />;
      case 'external':
        return <Link className="w-5 h-5 text-purple-500" />;
      default:
        return <HardDrive className="w-5 h-5 text-gray-500" />;
    }
  };

  if (!hasAccess('Admin')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Restricted</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You need Admin privileges to access file management.
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">File Manager</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Upload and manage server files, updates, and archives.
          </p>
        </div>
        <button
          onClick={() => setIsEditing(true)}
          className="mt-4 sm:mt-0 flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
        >
          <Plus size={18} />
          <span>Add File</span>
        </button>
      </div>

      {/* Error Display */}
      {error && (
        <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
          <div className="flex items-start space-x-2">
            <AlertCircle className="text-red-600 dark:text-red-400 w-5 h-5 mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-red-800 dark:text-red-200">Error</p>
              <p className="text-sm text-red-700 dark:text-red-300 mt-1">{error}</p>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-red-400 hover:text-red-600 dark:hover:text-red-300"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* File Upload Modal */}
      {isEditing && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleCancel}></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  {editingFile ? 'Edit File' : 'Upload New File'}
                </h3>
                <button
                  onClick={handleCancel}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-6">
                {/* Upload Method Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                    Upload Method
                  </label>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {[
                      { id: 'direct', label: 'Direct Upload', icon: HardDrive, desc: 'Upload file directly' },
                      { id: 'google_drive', label: 'Google Drive', icon: Globe, desc: 'Share link from Google Drive' },
                      { id: 'mega', label: 'MEGA', icon: Globe, desc: 'Share link from MEGA' },
                      { id: 'external', label: 'External Link', icon: Link, desc: 'Any external download link' }
                    ].map((method) => {
                      const IconComponent = method.icon;
                      const isSelected = formData.upload_method === method.id;
                      return (
                        <button
                          key={method.id}
                          type="button"
                          onClick={() => setFormData({ ...formData, upload_method: method.id as any })}
                          className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                            isSelected
                              ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                              : 'border-gray-300 dark:border-gray-600 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                          }`}
                        >
                          <IconComponent className={`w-6 h-6 mx-auto mb-2 ${isSelected ? 'text-blue-500' : 'text-gray-400'}`} />
                          <p className={`text-sm font-medium ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-gray-700 dark:text-gray-300'}`}>
                            {method.label}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {method.desc}
                          </p>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* File Upload Area or URL Input */}
                {formData.upload_method === 'direct' ? (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Upload File
                    </label>
                    <div
                      {...getRootProps()}
                      className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors duration-200 ${
                        isDragActive
                          ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                          : 'border-gray-300 dark:border-gray-600 hover:border-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                      }`}
                    >
                      <input {...getInputProps()} />
                      <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
                      {uploadedFile ? (
                        <div>
                          <p className="text-sm font-medium text-gray-900 dark:text-white">
                            {uploadedFile.name}
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-400">
                            {formatFileSize(uploadedFile.size)}
                          </p>
                        </div>
                      ) : (
                        <div>
                          <p className="text-sm text-gray-600 dark:text-gray-400">
                            Drag and drop a file here, or click to select
                          </p>
                          <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                            Supports: ZIP, RAR, 7Z, JAR, EXE, TXT, PDF
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      {formData.upload_method === 'google_drive' && 'Google Drive Share Link'}
                      {formData.upload_method === 'mega' && 'MEGA Share Link'}
                      {formData.upload_method === 'external' && 'External Download URL'}
                    </label>
                    <div className="relative">
                      <input
                        type="url"
                        value={formData.file_url}
                        onChange={(e) => setFormData({...formData, file_url: e.target.value})}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder={
                          formData.upload_method === 'google_drive' ? 'https://drive.google.com/file/d/...' :
                          formData.upload_method === 'mega' ? 'https://mega.nz/file/...' :
                          'https://example.com/download/file.zip'
                        }
                      />
                      <div className="absolute left-3 top-1/2 transform -translate-y-1/2">
                        {getUploadMethodIcon(formData.upload_method)}
                      </div>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formData.upload_method === 'google_drive' && 'Make sure the file is publicly accessible or shared with "Anyone with the link"'}
                      {formData.upload_method === 'mega' && 'Use the public share link from MEGA'}
                      {formData.upload_method === 'external' && 'Any direct download link that users can access'}
                    </p>
                  </div>
                )}

                {/* Form Fields */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Name
                    </label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., Prodomo Server"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Version
                    </label>
                    <input
                      type="text"
                      value={formData.version}
                      onChange={(e) => setFormData({...formData, version: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="e.g., 2.1.4"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      File Type
                    </label>
                    <select
                      value={formData.file_type}
                      onChange={(e) => setFormData({...formData, file_type: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="server">Server</option>
                      <option value="plugin">Plugin</option>
                      <option value="archive">Archive</option>
                      <option value="documentation">Documentation</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Minimum Grade
                    </label>
                    <select
                      value={formData.min_grade}
                      onChange={(e) => setFormData({...formData, min_grade: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="Guest">Guest</option>
                      <option value="V4">V4</option>
                      <option value="V5">V5</option>
                      <option value="Admin">Admin</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Status
                    </label>
                    <select
                      value={formData.status}
                      onChange={(e) => setFormData({...formData, status: e.target.value as any})}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="active">Active</option>
                      <option value="beta">Beta</option>
                      <option value="deprecated">Deprecated</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Notification Settings
                    </label>
                    <div className="flex items-center space-x-2 mt-2">
                      <input
                        type="checkbox"
                        id="notify_users"
                        checked={formData.notify_users}
                        onChange={(e) => setFormData({...formData, notify_users: e.target.checked})}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <label htmlFor="notify_users" className="text-sm text-gray-700 dark:text-gray-300">
                        Notify users about this {editingFile ? 'update' : 'new file'}
                      </label>
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 flex items-center">
                      <Bell size={12} className="mr-1 text-blue-500" />
                      Users with appropriate access level will be notified
                    </p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Describe this file..."
                  />
                </div>

                {/* Changelog */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Changelog
                  </label>
                  <div className="space-y-2">
                    {formData.changelog.map((item, index) => (
                      <div key={index} className="flex items-center space-x-2">
                        <input
                          type="text"
                          value={item}
                          onChange={(e) => updateChangelogItem(index, e.target.value)}
                          className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          placeholder="What's new in this version..."
                        />
                        <button
                          type="button"
                          onClick={() => removeChangelogItem(index)}
                          className="p-2 text-red-500 hover:text-red-700 dark:hover:text-red-400"
                        >
                          <X size={16} />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={addChangelogItem}
                      className="flex items-center space-x-2 px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
                    >
                      <Plus size={16} />
                      <span>Add changelog item</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCancel}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSave}
                  disabled={loading || (!editingFile && formData.upload_method === 'direct' && !uploadedFile && !formData.file_url)}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
                >
                  <Save size={18} />
                  <span>{loading ? 'Saving...' : 'Save'}</span>
                </button>
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
                    Delete File
                  </h3>
                  <div className="mt-2">
                    <p className="text-sm text-gray-500 dark:text-gray-400">
                      Are you sure you want to delete this file? This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>
              <div className="mt-5 sm:mt-4 sm:flex sm:flex-row-reverse">
                <button
                  type="button"
                  onClick={() => confirmDeleteFile(confirmDelete)}
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

      {/* Files List */}
      <div className="space-y-4">
        {files.map((file) => (
          <div key={file.id} className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 hover:shadow-md transition-shadow duration-200">
            <div className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="p-3 bg-gray-100 dark:bg-gray-700 rounded-lg">
                    {getFileIcon(file.file_type)}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                        {file.name}
                      </h3>
                      <span className="px-2 py-1 text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300 rounded-full">
                        v{file.version}
                      </span>
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getStatusColor(file.status)}`}>
                        {file.status}
                      </span>
                    </div>
                    <p className="text-gray-600 dark:text-gray-400 mb-3">{file.description}</p>
                    <div className="flex items-center space-x-4 text-sm text-gray-500 dark:text-gray-400">
                      <span>{formatFileSize(file.file_size)}</span>
                      <span>{file.download_count} downloads</span>
                      <span>Min: {file.min_grade}</span>
                      <span>{new Date(file.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => handleEdit(file)}
                    className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                  >
                    <Edit size={18} />
                  </button>
                  <button
                    onClick={() => handleDelete(file)}
                    className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
                  >
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}

        {files.length === 0 && !loading && (
          <div className="text-center py-12">
            <Folder className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No files uploaded</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by uploading your first server file.
            </p>
            <button
              onClick={() => setIsEditing(true)}
              className="mt-4 flex items-center space-x-2 mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
            >
              <Plus size={18} />
              <span>Upload File</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default FileManager;