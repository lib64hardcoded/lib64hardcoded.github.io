import React, { useState, useEffect } from 'react';
import { User, Mail, Calendar, Shield, Edit, Save, X, Activity, Download, Clock, StickyNote, Eye, EyeOff, AlertTriangle, Trash2, Video as Hide, RotateCcw, Users, Search, Filter, ArrowLeft, HeadsetIcon } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useDatabase } from '../hooks/useDatabase';
import { showNotification } from '../lib/notifications';
import { User as UserType } from '../lib/supabase';

interface ProfileProps {
  userId?: string; // Optional prop to view other users' profiles
  onBack?: () => void; // Optional callback to go back
}

const Profile: React.FC<ProfileProps> = ({ userId, onBack }) => {
  const { user: currentUser, hasAccess } = useAuth();
  const { getUsers, updateUser, updateUserNotes, getActivityLogs, getDownloadLogs, updateUserGrade, loading } = useDatabase();
  const [user, setUser] = useState<UserType | null>(null);
  const [allUsers, setAllUsers] = useState<UserType[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [isEditing, setIsEditing] = useState(false);
  const [isEditingNotes, setIsEditingNotes] = useState(false);
  const [showNotes, setShowNotes] = useState(true);
  const [tempNotes, setTempNotes] = useState('');
  const [showUserList, setShowUserList] = useState(false);
  const [hiddenActivities, setHiddenActivities] = useState<Set<string>>(new Set());
  const [deletedActivities, setDeletedActivities] = useState<Set<string>>(new Set());
  const [formData, setFormData] = useState({
    name: '',
    email: ''
  });
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [userActivities, setUserActivities] = useState<any[]>([]);
  const [isEditingGrade, setIsEditingGrade] = useState(false);
  const [newGrade, setNewGrade] = useState<string>('');

  // Check if current user is a guest - completely block access to profiles
  if (currentUser?.is_guest) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center max-w-md mx-auto">
          <div className="p-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl shadow-lg">
            <AlertTriangle className="mx-auto h-16 w-16 text-amber-500 mb-6" />
            <h3 className="text-xl font-bold text-amber-900 dark:text-amber-100 mb-3">
              Access Restricted
            </h3>
            <p className="text-amber-800 dark:text-amber-200 mb-6 leading-relaxed">
              You are a guest user, you cannot view profiles.
            </p>
            <div className="bg-amber-100 dark:bg-amber-900/30 rounded-lg p-4 mb-6">
              <p className="text-sm text-amber-700 dark:text-amber-300">
                <strong>Guest limitations:</strong><br />
                • Cannot view your own profile<br />
                • Cannot view other users' profiles<br />
                • Profile access requires V4+ membership
              </p>
            </div>
            {onBack && (
              <button
                onClick={onBack}
                className="flex items-center space-x-2 mx-auto px-6 py-3 bg-amber-600 hover:bg-amber-700 text-white rounded-lg font-medium transition-colors duration-200 shadow-md hover:shadow-lg"
              >
                <ArrowLeft size={18} />
                <span>Go Back to Dashboard</span>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // Load hidden/deleted activities from localStorage on component mount
  useEffect(() => {
    if (selectedUserId) {
      const hiddenKey = `prodomo_hidden_activities_${selectedUserId}`;
      const deletedKey = `prodomo_deleted_activities_${selectedUserId}`;
      
      try {
        const hiddenData = localStorage.getItem(hiddenKey);
        const deletedData = localStorage.getItem(deletedKey);
        
        if (hiddenData) {
          const hiddenArray = JSON.parse(hiddenData);
          setHiddenActivities(new Set(hiddenArray));
        } else {
          setHiddenActivities(new Set());
        }
        
        if (deletedData) {
          const deletedArray = JSON.parse(deletedData);
          setDeletedActivities(new Set(deletedArray));
        } else {
          setDeletedActivities(new Set());
        }
      } catch (error) {
        console.error('Failed to load activity states:', error);
        setHiddenActivities(new Set());
        setDeletedActivities(new Set());
      }
    }
  }, [selectedUserId]);

  // Save hidden/deleted activities to localStorage whenever they change
  const saveActivityStates = (hidden: Set<string>, deleted: Set<string>) => {
    if (selectedUserId) {
      const hiddenKey = `prodomo_hidden_activities_${selectedUserId}`;
      const deletedKey = `prodomo_deleted_activities_${selectedUserId}`;
      
      try {
        localStorage.setItem(hiddenKey, JSON.stringify(Array.from(hidden)));
        localStorage.setItem(deletedKey, JSON.stringify(Array.from(deleted)));
      } catch (error) {
        console.error('Failed to save activity states:', error);
      }
    }
  };

  // Initialize selectedUserId from props or current user
  useEffect(() => {
    if (userId) {
      setSelectedUserId(userId);
    } else if (currentUser?.id) {
      setSelectedUserId(currentUser.id);
    }
  }, [userId, currentUser?.id]);

  // Load user data when selectedUserId changes
  useEffect(() => {
    if (selectedUserId) {
      loadUserData(selectedUserId);
    }
  }, [selectedUserId]);

  // Load all users for admin view
  useEffect(() => {
    if (hasAccess('Admin')) {
      loadAllUsers();
    }
  }, [hasAccess]);

  // Load user activities
  useEffect(() => {
    if (selectedUserId) {
      loadUserActivities(selectedUserId);
    }
  }, [selectedUserId]);

  const loadUserActivities = async (userId: string) => {
    try {
      setLoadingProfile(true);
      
      // Get both activity logs and download logs
      const [activities, downloads] = await Promise.all([
        getActivityLogs(50),
        getDownloadLogs(50)
      ]);
      
      // Filter for this user's activities
      const userActivityLogs = activities.filter(log => log.user_id === userId).map(log => ({
        ...log,
        type: 'activity'
      }));
      
      // Filter for this user's downloads
      const userDownloadLogs = downloads.filter(log => log.user_id === userId).map(log => ({
        ...log,
        type: 'download',
        action: `Downloaded ${log.file_name} v${log.file_version}`,
        details: `File: ${log.file_name}`
      }));
      
      // Combine and sort by date (newest first)
      const combinedActivities = [...userActivityLogs, ...userDownloadLogs]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 20); // Limit to 20 most recent activities
      
      setUserActivities(combinedActivities);
    } catch (error) {
      console.error('Failed to load user activities:', error);
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadAllUsers = async () => {
    try {
      setLoadingProfile(true);
      const users = await getUsers();
      // Filter out guest users
      const filteredUsers = users.filter(user => !user.is_guest);
      setAllUsers(filteredUsers);
    } catch (error) {
      console.error('Failed to load users:', error);
      setError('Failed to load users. Please try again.');
    } finally {
      setLoadingProfile(false);
    }
  };

  const loadUserData = async (userId: string) => {
    try {
      setLoadingProfile(true);
      setError(null);
      
      const users = await getUsers();
      const userData = users.find(u => u.id === userId);
      
      if (userData) {
        setUser(userData);
        setFormData({
          name: userData.name,
          email: userData.email
        });
        
        if (userData.admin_notes) {
          setTempNotes(userData.admin_notes);
        }
        
        // Set initial grade for editing
        setNewGrade(userData.grade);
      } else {
        setError('User not found');
        console.error('User not found with ID:', userId);
      }
    } catch (error) {
      console.error('Failed to load user data:', error);
      setError('Failed to load user data. Please try again.');
    } finally {
      setLoadingProfile(false);
    }
  };

  const handleSave = async () => {
    if (!user?.id) return;

    try {
      const success = await updateUser(user.id, formData);
      
      if (success) {
        setUser({ ...user, ...formData });
        setIsEditing(false);
        showNotification.success('Profile updated successfully');
      } else {
        showNotification.error('Failed to update profile');
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
      showNotification.error('Failed to update profile');
    }
  };

  const handleCancel = () => {
    setFormData({ 
      name: user?.name || '', 
      email: user?.email || ''
    });
    setIsEditing(false);
  };

  const handleSaveNotes = async () => {
    if (!user?.id) return;

    try {
      const success = await updateUserNotes(user.id, tempNotes);
      if (success) {
        setUser({ ...user, admin_notes: tempNotes });
        setIsEditingNotes(false);
        showNotification.success('Admin notes updated successfully');
      } else {
        showNotification.error('Failed to update admin notes');
      }
    } catch (error) {
      console.error('Failed to update admin notes:', error);
      showNotification.error('Failed to update admin notes');
    }
  };

  const handleCancelNotes = () => {
    setTempNotes(user?.admin_notes || '');
    setIsEditingNotes(false);
  };

  const handleEditNotes = () => {
    setTempNotes(user?.admin_notes || '');
    setIsEditingNotes(true);
  };

  const handleHideActivity = (activityId: string) => {
    const newHidden = new Set(hiddenActivities);
    newHidden.add(activityId);
    setHiddenActivities(newHidden);
    saveActivityStates(newHidden, deletedActivities);
    showNotification.info('Activity hidden from user view');
  };

  const handleDeleteActivity = (activityId: string) => {
    const newDeleted = new Set(deletedActivities);
    newDeleted.add(activityId);
    setDeletedActivities(newDeleted);
    saveActivityStates(hiddenActivities, newDeleted);
    showNotification.warning('Activity deleted');
  };

  const handleRestoreActivity = (activityId: string) => {
    const newHidden = new Set(hiddenActivities);
    const newDeleted = new Set(deletedActivities);
    newHidden.delete(activityId);
    newDeleted.delete(activityId);
    setHiddenActivities(newHidden);
    setDeletedActivities(newDeleted);
    saveActivityStates(newHidden, newDeleted);
    showNotification.success('Activity restored');
  };

  const handleEditGrade = () => {
    if (!user) return;
    setNewGrade(user.grade);
    setIsEditingGrade(true);
  };

  const handleSaveGrade = async () => {
    if (!user?.id || newGrade === user.grade) return;
    
    try {
      const success = await updateUserGrade(user.id, newGrade);
      if (success) {
        setUser({ ...user, grade: newGrade as any });
        setIsEditingGrade(false);
        showNotification.success(`User grade updated to ${newGrade}`);
      } else {
        showNotification.error('Failed to update user grade');
      }
    } catch (error) {
      console.error('Failed to update user grade:', error);
      showNotification.error('Failed to update user grade');
    }
  };

  const handleCancelGradeEdit = () => {
    setIsEditingGrade(false);
  };

  const getActivityIcon = (activity: any) => {
    if (activity.type === 'download') return <Download size={16} className="text-blue-500" />;
    if (activity.action.includes('login') || activity.action.includes('Sign')) return <User size={16} className="text-emerald-500" />;
    if (activity.action.includes('profile') || activity.action.includes('Updated')) return <Edit size={16} className="text-purple-500" />;
    return <Activity size={16} className="text-gray-500" />;
  };

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'Admin':
        return 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400 border-red-200 dark:border-red-800';
      case 'Support':
        return 'bg-amber-100 text-amber-800 dark:bg-amber-900/20 dark:text-amber-400 border-amber-200 dark:border-amber-800';
      case 'V5':
        return 'bg-purple-100 text-purple-800 dark:bg-purple-900/20 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      case 'V4':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-400 border-gray-200 dark:border-gray-700';
    }
  };

  const getGradeDescription = (grade: string) => {
    switch (grade) {
      case 'Admin':
        return 'Full system access with management privileges';
      case 'Support':
        return 'Bug management access with V4 download permissions';
      case 'V5':
        return 'Advanced access with beta features';
      case 'V4':
        return 'Standard access with stable releases';
      default:
        return 'Basic access to public releases';
    }
  };

  const getGradeIcon = (grade: string) => {
    switch (grade) {
      case 'Admin':
        return <Shield size={16} className="text-red-500" />;
      case 'Support':
        return <HeadsetIcon size={16} className="text-amber-500" />;
      case 'V5':
        return <Shield size={16} className="text-purple-500" />;
      case 'V4':
        return <Shield size={16} className="text-blue-500" />;
      default:
        return <Shield size={16} className="text-gray-500" />;
    }
  };

  const filteredUsers = allUsers.filter(u => {
    const matchesSearch = u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         u.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = gradeFilter === 'all' || u.grade === gradeFilter;
    return matchesSearch && matchesGrade;
  });

  const stats = [
    { label: 'Total Downloads', value: user?.total_downloads?.toString() || '0', icon: Download },
    { label: 'Account Age', value: user?.join_date ? `${Math.floor((new Date().getTime() - new Date(user.join_date).getTime()) / (1000 * 60 * 60 * 24))} days` : '0 days', icon: Calendar },
    { label: 'Last Active', value: user?.last_active ? new Date(user.last_active).toLocaleDateString() : 'Unknown', icon: Activity },
    { label: 'Grade Level', value: user?.grade || 'Guest', icon: user?.grade === 'Support' ? HeadsetIcon : Shield }
  ];

  const isViewingOwnProfile = user?.id === currentUser?.id;
  const canEditProfile = isViewingOwnProfile || hasAccess('Admin');
  const isCurrentUserAdmin = hasAccess('Admin');

  const formatTimeAgo = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
    if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
    if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
    return `${Math.floor(diffInSeconds / 86400)}d ago`;
  };

  if (loadingProfile) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Error Loading Profile</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {error}
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-4 flex items-center space-x-2 mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
            >
              <ArrowLeft size={18} />
              <span>Go Back</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-amber-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">User Not Found</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            The requested user profile could not be found.
          </p>
          {onBack && (
            <button
              onClick={onBack}
              className="mt-4 flex items-center space-x-2 mx-auto px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
            >
              <ArrowLeft size={18} />
              <span>Go Back</span>
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header with Back Button */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center space-x-4">
          {onBack && (
            <button
              onClick={onBack}
              className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors duration-200"
            >
              <ArrowLeft size={20} />
            </button>
          )}
          <div>
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">
              {isViewingOwnProfile ? 'My Profile' : `${user.name}'s Profile`}
            </h1>
            <p className="mt-1 text-gray-500 dark:text-gray-400">
              {isViewingOwnProfile 
                ? 'Manage your account settings and preferences.'
                : 'View and manage user account information.'
              }
            </p>
          </div>
        </div>
        {hasAccess('Admin') && (
          <button
            onClick={() => setShowUserList(!showUserList)}
            className="mt-4 sm:mt-0 flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
          >
            <Users size={18} />
            <span>{showUserList ? 'Hide User List' : 'View All Users'}</span>
          </button>
        )}
      </div>

      {/* User List for Admins */}
      {hasAccess('Admin') && showUserList && (
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Select User to View</h3>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-4 sm:space-y-0 sm:space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center space-x-2">
                <Filter className="text-gray-400 w-5 h-5" />
                <select
                  value={gradeFilter}
                  onChange={(e) => setGradeFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="all">All Grades</option>
                  <option value="Guest">Guest</option>
                  <option value="V4">V4</option>
                  <option value="V5">V5</option>
                  <option value="Support">Support</option>
                  <option value="Admin">Admin</option>
                </select>
              </div>
            </div>
          </div>
          <div className="p-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredUsers.map((u) => (
                <button
                  key={u.id}
                  onClick={() => {
                    setSelectedUserId(u.id);
                    setShowUserList(false);
                  }}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 text-left ${
                    u.id === selectedUserId
                      ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-blue-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                      <span className="text-white font-semibold text-sm">{u.name.charAt(0)}</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                        {u.name}
                        {u.id === currentUser?.id && (
                          <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(You)</span>
                        )}
                      </p>
                      <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{u.email}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {u.grade === 'Support' ? (
                          <>
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getGradeColor('V4')}`}>
                              V4
                            </span>
                            <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getGradeColor('Support')}`}>
                              Support
                            </span>
                          </>
                        ) : (
                          <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getGradeColor(u.grade)}`}>
                            {u.grade}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Admin Notes Section - Only visible to admins */}
      {hasAccess('Admin') && (
        <div className="bg-gradient-to-r from-amber-50 to-yellow-50 dark:from-amber-900/10 dark:to-yellow-900/10 border border-amber-200 dark:border-amber-800 rounded-xl shadow-sm">
          <div className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center space-x-2">
                <StickyNote className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                <h3 className="text-lg font-semibold text-amber-900 dark:text-amber-100">
                  Admin Notes
                </h3>
                <span className="px-2 py-1 text-xs font-medium bg-amber-100 dark:bg-amber-900/30 text-amber-800 dark:text-amber-200 rounded-full">
                  Admin Only
                </span>
              </div>
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setShowNotes(!showNotes)}
                  className="p-1 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors duration-200"
                  title={showNotes ? 'Hide notes' : 'Show notes'}
                >
                  {showNotes ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
                {!isEditingNotes && (
                  <button
                    onClick={handleEditNotes}
                    className="p-1 text-amber-600 dark:text-amber-400 hover:text-amber-800 dark:hover:text-amber-200 transition-colors duration-200"
                    title="Edit notes"
                  >
                    <Edit size={16} />
                  </button>
                )}
              </div>
            </div>

            {showNotes && (
              <div className="space-y-3">
                {isEditingNotes ? (
                  <div className="space-y-3">
                    <textarea
                      value={tempNotes}
                      onChange={(e) => setTempNotes(e.target.value)}
                      rows={4}
                      className="w-full px-3 py-2 border border-amber-300 dark:border-amber-700 rounded-lg bg-white dark:bg-amber-900/20 text-amber-900 dark:text-amber-100 placeholder-amber-500 dark:placeholder-amber-400 focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
                      placeholder="Add admin notes about this user... (behavior, preferences, special requirements, etc.)"
                    />
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={handleCancelNotes}
                        className="px-3 py-1 text-sm text-amber-700 dark:text-amber-300 hover:text-amber-900 dark:hover:text-amber-100 transition-colors duration-200"
                      >
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveNotes}
                        disabled={loading}
                        className="flex items-center space-x-1 px-3 py-1 bg-amber-600 hover:bg-amber-700 disabled:bg-amber-400 text-white rounded-lg text-sm font-medium transition-colors duration-200"
                      >
                        <Save size={14} />
                        <span>{loading ? 'Saving...' : 'Save'}</span>
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="bg-amber-100/50 dark:bg-amber-900/20 rounded-lg p-3 border border-amber-200 dark:border-amber-700">
                    {user.admin_notes ? (
                      <p className="text-amber-900 dark:text-amber-100 text-sm leading-relaxed whitespace-pre-wrap">
                        {user.admin_notes}
                      </p>
                    ) : (
                      <div className="flex items-center space-x-2 text-amber-600 dark:text-amber-400">
                        <AlertTriangle size={16} />
                        <p className="text-sm italic">
                          No admin notes for this user. Click the edit button to add notes.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Profile Card */}
        <div className="lg:col-span-1">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
            {/* Avatar Section */}
            <div className="text-center mb-6">
              <div className="w-24 h-24 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center mx-auto">
                <span className="text-2xl font-bold text-white">{user.name.charAt(0)}</span>
              </div>
              
              <h3 className="mt-4 text-xl font-semibold text-gray-900 dark:text-white">
                {user.name}
              </h3>
              <p className="text-gray-500 dark:text-gray-400">{user.email}</p>
            </div>

            {/* Grade Badge */}
            <div className="mb-6">
              <div className="flex flex-wrap gap-2 justify-center">
                {user.grade === 'Support' ? (
                  <>
                    <div className={`inline-flex items-center px-3 py-2 rounded-lg border ${getGradeColor('V4')}`}>
                      <Shield size={16} className="mr-2" />
                      <span className="font-medium">V4 Access</span>
                    </div>
                    <div className={`inline-flex items-center px-3 py-2 rounded-lg border ${getGradeColor('Support')}`}>
                      <HeadsetIcon size={16} className="mr-2" />
                      <span className="font-medium">Support Access</span>
                    </div>
                  </>
                ) : (
                  <div className={`inline-flex items-center px-3 py-2 rounded-lg border ${getGradeColor(user.grade)}`}>
                    {user.grade === 'Admin' ? (
                      <Shield size={16} className="mr-2" />
                    ) : user.grade === 'Support' ? (
                      <HeadsetIcon size={16} className="mr-2" />
                    ) : (
                      <Shield size={16} className="mr-2" />
                    )}
                    <span className="font-medium">{user.grade} Access</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-2 text-center">
                {getGradeDescription(user.grade)}
              </p>
            </div>

            {/* Stats */}
            <div className="space-y-4">
              {stats.map((stat, index) => {
                const IconComponent = stat.icon;
                return (
                  <div key={index} className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <IconComponent size={18} className="text-gray-400" />
                      <span className="text-sm text-gray-600 dark:text-gray-400">{stat.label}</span>
                    </div>
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {stat.value}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Edit Grade Button - Only for admins viewing other users */}
            {hasAccess('Admin') && !isViewingOwnProfile && (
              <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={handleEditGrade}
                  className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
                >
                  <Edit size={16} />
                  <span>Change Access Level</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="lg:col-span-2 space-y-6">
          {/* Account Information */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Account Information</h3>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    {canEditProfile ? 'Update personal information and contact details.' : 'View account information.'}
                  </p>
                </div>
                {canEditProfile && !isEditing ? (
                  <button
                    onClick={() => setIsEditing(true)}
                    className="flex items-center space-x-2 px-3 py-2 text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors duration-200"
                  >
                    <Edit size={16} />
                    <span>Edit</span>
                  </button>
                ) : canEditProfile && isEditing ? (
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={handleCancel}
                      className="flex items-center space-x-2 px-3 py-2 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700 rounded-lg transition-colors duration-200"
                    >
                      <X size={16} />
                      <span>Cancel</span>
                    </button>
                    <button
                      onClick={handleSave}
                      disabled={loading}
                      className="flex items-center space-x-2 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors duration-200"
                    >
                      <Save size={16} />
                      <span>{loading ? 'Saving...' : 'Save'}</span>
                    </button>
                  </div>
                ) : null}
              </div>
            </div>

            <div className="p-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  {isEditing && canEditProfile ? (
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <User size={16} className="text-gray-400" />
                      <span className="text-gray-900 dark:text-white">{user.name}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  {isEditing && canEditProfile ? (
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  ) : (
                    <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                      <Mail size={16} className="text-gray-400" />
                      <span className="text-gray-900 dark:text-white">{user.email}</span>
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Member Since
                  </label>
                  <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <Calendar size={16} className="text-gray-400" />
                    <span className="text-gray-900 dark:text-white">
                      {new Date(user.join_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Last Active
                  </label>
                  <div className="flex items-center space-x-2 px-3 py-2 bg-gray-50 dark:bg-gray-900 rounded-lg">
                    <Clock size={16} className="text-gray-400" />
                    <span className="text-gray-900 dark:text-white">
                      {new Date(user.last_active).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700">
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Recent Activity</h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                {isViewingOwnProfile ? 'Your recent actions and downloads.' : `${user.name}'s recent activity.`}
              </p>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                {userActivities.length > 0 ? (
                  userActivities.map((activity) => {
                    const isHidden = hiddenActivities.has(activity.id);
                    const isDeleted = deletedActivities.has(activity.id);
                    
                    // Only show hidden/deleted activities to admins
                    if ((isDeleted || isHidden) && !isCurrentUserAdmin) {
                      return null;
                    }

                    return (
                      <div 
                        key={activity.id} 
                        className={`flex items-start space-x-3 p-3 rounded-lg transition-all duration-200 ${
                          isDeleted 
                            ? 'bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800' 
                            : isHidden 
                              ? 'bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800'
                              : 'hover:bg-gray-50 dark:hover:bg-gray-700'
                        }`}
                      >
                        <div className="flex-shrink-0 mt-1">
                          {getActivityIcon(activity)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className={`text-sm ${
                            isDeleted 
                              ? 'text-red-700 dark:text-red-300 line-through' 
                              : isHidden
                                ? 'text-amber-700 dark:text-amber-300'
                                : 'text-gray-900 dark:text-white'
                          }`}>
                            {activity.action}
                            {isDeleted && isCurrentUserAdmin && <span className="ml-2 text-xs">(Deleted by admin)</span>}
                            {isHidden && isCurrentUserAdmin && <span className="ml-2 text-xs">(Hidden from user)</span>}
                          </p>
                          {activity.details && (
                            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{activity.details}</p>
                          )}
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{formatTimeAgo(activity.created_at)}</p>
                        </div>
                        {/* Only show admin controls to admins and only when viewing other users' profiles */}
                        {isCurrentUserAdmin && !isViewingOwnProfile && (
                          <div className="flex items-center space-x-1">
                            {!isDeleted && !isHidden && (
                              <>
                                <button
                                  onClick={() => handleHideActivity(activity.id)}
                                  className="p-1 text-amber-500 hover:text-amber-700 dark:hover:text-amber-400 transition-colors duration-200"
                                  title="Hide from user"
                                >
                                  <Hide size={14} />
                                </button>
                                <button
                                  onClick={() => handleDeleteActivity(activity.id)}
                                  className="p-1 text-red-500 hover:text-red-700 dark:hover:text-red-400 transition-colors duration-200"
                                  title="Delete activity"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                            {(isDeleted || isHidden) && (
                              <button
                                onClick={() => handleRestoreActivity(activity.id)}
                                className="p-1 text-emerald-500 hover:text-emerald-700 dark:hover:text-emerald-400 transition-colors duration-200"
                                title="Restore activity"
                              >
                                <RotateCcw size={14} />
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="text-center py-8">
                    <Activity className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No recent activity</h3>
                    <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                      Activity will appear here as it happens.
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Edit Grade Modal */}
      {isEditingGrade && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={handleCancelGradeEdit}></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Change Access Level
                </h3>
                <button
                  onClick={handleCancelGradeEdit}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">{user.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">{user.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Access Level
                  </label>
                  <div className="flex flex-wrap gap-2 mb-4">
                    {user.grade === 'Support' ? (
                      <>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getGradeColor('V4')}`}>
                          V4
                        </span>
                        <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getGradeColor('Support')}`}>
                          Support
                        </span>
                      </>
                    ) : (
                      <span className={`inline-block px-2 py-1 text-xs font-medium rounded-full ${getGradeColor(user.grade)}`}>
                        {user.grade}
                      </span>
                    )}
                  </div>

                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    New Access Level
                  </label>
                  <select
                    value={newGrade}
                    onChange={(e) => setNewGrade(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="V4">V4 - Standard access</option>
                    <option value="V5">V5 - Advanced features</option>
                    <option value="Support">Support - Bug management access</option>
                    <option value="Admin">Admin - Full system access</option>
                  </select>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <Shield className="text-blue-600 dark:text-blue-400 w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <h4 className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        Access Level Information
                      </h4>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        {newGrade === 'Admin' && 'Admin users have full access to all system features and management capabilities.'}
                        {newGrade === 'Support' && 'Support users have V4 download access plus the ability to manage and respond to bug reports.'}
                        {newGrade === 'V5' && 'V5 users have access to advanced features and beta versions.'}
                        {newGrade === 'V4' && 'V4 users have standard access to stable releases.'}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={handleCancelGradeEdit}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveGrade}
                  disabled={loading || newGrade === user.grade}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
                >
                  <Save size={18} />
                  <span>{loading ? 'Saving...' : 'Save Changes'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Profile;