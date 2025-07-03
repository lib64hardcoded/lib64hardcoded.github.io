import React, { useState, useEffect } from 'react';
import {
  Users,
  Shield,
  Edit,
  Search,
  Filter,
  UserPlus,
  Mail,
  Calendar,
  Activity,
  AlertCircle,
  CheckCircle,
  X,
  Clock,
  Ban,
  UserCheck,
  Plus,
  Eye,
  EyeOff,
  Key,
  Copy,
  Trash2,
  HeadsetIcon
} from 'lucide-react';
import { useDatabase } from '../hooks/useDatabase';
import { useAuth } from '../contexts/AuthContext';
import { useActivityLogger } from '../hooks/useActivityLogger';
import { showNotification } from '../lib/notifications';
import { User as UserType } from '../lib/supabase';

interface UserManagementProps {
  onViewProfile?: (userId: string) => void;
}

const UserManagement: React.FC<UserManagementProps> = ({ onViewProfile }) => {
  const { user: currentUser, hasAccess } = useAuth();
  const { getUsers, updateUserGrade, blockUser, unblockUser, createUser, deleteUser, getUserPassword, loading, error, setError } = useDatabase();
  const { logUserCreation, logUserGradeUpdate, logUserBlock, logUserUnblock, logUserDelete } = useActivityLogger();
  
  const [users, setUsers] = useState<UserType[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [gradeFilter, setGradeFilter] = useState<string>('all');
  const [editingUser, setEditingUser] = useState<UserType | null>(null);
  const [blockingUser, setBlockingUser] = useState<UserType | null>(null);
  const [deletingUser, setDeletingUser] = useState<UserType | null>(null);
  const [creatingUser, setCreatingUser] = useState(false);
  const [newGrade, setNewGrade] = useState<string>('');
  const [blockDuration, setBlockDuration] = useState<string>('30m');
  const [visiblePasswords, setVisiblePasswords] = useState<Set<string>>(new Set());
  const [newUserData, setNewUserData] = useState({
    name: '',
    email: '',
    password: '',
    grade: 'V4' as 'V4' | 'V5' | 'Support'
  });

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = async () => {
    console.log('UserManagement: Loading users...');
    const data = await getUsers();
    // Filter out guest users
    const filteredUsers = data.filter(user => !user.is_guest);
    setUsers(filteredUsers);
    console.log('UserManagement: Loaded', filteredUsers.length, 'users');
  };

  const handleGradeUpdate = async (userId: string, grade: string) => {
    console.log('UserManagement: Updating user grade:', userId, 'to', grade);
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const oldGrade = user.grade;
    const success = await updateUserGrade(userId, grade);
    if (success) {
      await loadUsers();
      setEditingUser(null);
      setNewGrade('');
      
      // Show notification and log activity
      showNotification.gradeUpdated(user.name, grade);
      await logUserGradeUpdate(user.name, oldGrade, grade);
      console.log('UserManagement: Grade updated successfully');
    }
  };

  const handleBlockUser = async (userId: string, duration: string) => {
    console.log('UserManagement: Blocking user:', userId, 'for', duration);
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const success = await blockUser(userId, duration);
    if (success) {
      await loadUsers();
      setBlockingUser(null);
      
      // Show notification and log activity
      showNotification.userBlocked(user.name);
      await logUserBlock(user.name, duration);
      console.log('UserManagement: User blocked successfully');
    }
  };

  const handleUnblockUser = async (userId: string) => {
    console.log('UserManagement: Unblocking user:', userId);
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const success = await unblockUser(userId);
    if (success) {
      await loadUsers();
      
      // Show notification and log activity
      showNotification.userUnblocked(user.name);
      await logUserUnblock(user.name);
      console.log('UserManagement: User unblocked successfully');
    }
  };

  const handleDeleteUser = async (userId: string) => {
    console.log('UserManagement: Deleting user:', userId);
    const user = users.find(u => u.id === userId);
    if (!user) return;

    const success = await deleteUser(userId);
    if (success) {
      await loadUsers();
      setDeletingUser(null);
      
      // Show notification and log activity
      showNotification.warning(`User ${user.name} has been deleted`);
      await logUserDelete(user.name);
      console.log('UserManagement: User deleted successfully');
    }
  };

  const handleCreateUser = async () => {
    console.log('UserManagement: Creating new user:', newUserData.email);
    try {
      // Generate a random password if not provided
      const password = newUserData.password || Math.random().toString(36).slice(-8) + Math.random().toString(36).slice(-8).toUpperCase() + '123!';
      
      const success = await createUser({
        ...newUserData,
        password
      });
      
      if (success) {
        await loadUsers();
        
        // Show success notification
        showNotification.success(`User ${newUserData.name} created successfully`);
        
        // Log activity
        await logUserCreation(newUserData.name, newUserData.grade);
        
        setCreatingUser(false);
        setNewUserData({ name: '', email: '', password: '', grade: 'V4' });
        console.log('UserManagement: User created successfully');
      }
    } catch (error) {
      console.error('UserManagement: Error creating user:', error);
    }
  };

  const handleViewProfile = (userId: string) => {
    if (onViewProfile) {
      onViewProfile(userId);
    }
  };

  const togglePasswordVisibility = (userId: string) => {
    const newVisible = new Set(visiblePasswords);
    if (newVisible.has(userId)) {
      newVisible.delete(userId);
    } else {
      newVisible.add(userId);
    }
    setVisiblePasswords(newVisible);
  };

  const copyPasswordToClipboard = async (userId: string) => {
    const password = getUserPassword(userId);
    if (password) {
      try {
        await navigator.clipboard.writeText(password);
        showNotification.success('Password copied to clipboard');
      } catch (err) {
        console.error('Failed to copy password:', err);
        showNotification.error('Failed to copy password');
      }
    }
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGrade = gradeFilter === 'all' || user.grade === gradeFilter;
    // Exclude guest users
    return matchesSearch && matchesGrade && !user.is_guest;
  });

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

  const getGradeDescription = (grade: string) => {
    switch (grade) {
      case 'Admin':
        return 'Full system access';
      case 'Support':
        return 'Bug management access';
      case 'V5':
        return 'Advanced features';
      case 'V4':
        return 'Standard access';
      default:
        return 'Basic access';
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

  const getDurationLabel = (duration: string) => {
    switch (duration) {
      case '30m': return '30 minutes';
      case '1d': return '1 day';
      case '7d': return '7 days';
      case '30d': return '30 days';
      default: return duration;
    }
  };

  const isUserBlocked = (user: UserType) => {
    if (!user.is_blocked || !user.blocked_until) return false;
    return new Date(user.blocked_until) > new Date();
  };

  if (!hasAccess('Admin')) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-amber-500" />
          <h3 className="mt-2 text-lg font-medium text-gray-900 dark:text-white">Access Restricted</h3>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            You need Admin privileges to access user management.
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
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">User Management</h1>
          <p className="mt-1 text-gray-500 dark:text-gray-400">
            Manage user accounts, permissions, and access levels.
          </p>
        </div>
        <button
          onClick={() => setCreatingUser(true)}
          className="mt-4 sm:mt-0 flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
        >
          <Plus size={18} />
          <span>Create User</span>
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

      {/* Search and Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 p-6">
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
              <option value="V4">V4</option>
              <option value="V5">V5</option>
              <option value="Support">Support</option>
              <option value="Admin">Admin</option>
            </select>
          </div>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Password
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Downloads
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Last Active
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {filteredUsers.map((user) => {
                const userPassword = getUserPassword(user.id);
                const isPasswordVisible = visiblePasswords.has(user.id);
                
                return (
                  <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                          <span className="text-white font-semibold">{user.name.charAt(0)}</span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            <button
                              onClick={() => handleViewProfile(user.id)}
                              className="hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                            >
                              {user.name}
                              {user.id === currentUser?.id && (
                                <span className="ml-2 text-xs text-blue-600 dark:text-blue-400">(You)</span>
                              )}
                            </button>
                          </div>
                          <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center">
                            <Mail size={12} className="mr-1" />
                            {user.email}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <div className="flex items-center space-x-1 bg-gray-100 dark:bg-gray-700 rounded-lg px-3 py-2">
                          <Key size={14} className="text-gray-400" />
                          <span className="text-sm font-mono text-gray-900 dark:text-white">
                            {userPassword ? (
                              isPasswordVisible ? userPassword : '••••••••'
                            ) : (
                              'No password'
                            )}
                          </span>
                        </div>
                        {userPassword && (
                          <div className="flex items-center space-x-1">
                            <button
                              onClick={() => togglePasswordVisibility(user.id)}
                              className="p-1 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                              title={isPasswordVisible ? 'Hide password' : 'Show password'}
                            >
                              {isPasswordVisible ? <EyeOff size={14} /> : <Eye size={14} />}
                            </button>
                            <button
                              onClick={() => copyPasswordToClipboard(user.id)}
                              className="p-1 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200"
                              title="Copy password"
                            >
                              <Copy size={14} />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <span className={`flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full ${getGradeColor(user.grade)}`}>
                          {getGradeIcon(user.grade)}
                          <span>{user.grade}</span>
                        </span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                          {getGradeDescription(user.grade)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {isUserBlocked(user) ? (
                        <div className="flex items-center space-x-1">
                          <Ban size={14} className="text-red-500" />
                          <span className="text-sm text-red-600 dark:text-red-400">Blocked</span>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-1">
                          <CheckCircle size={14} className="text-emerald-500" />
                          <span className="text-sm text-emerald-600 dark:text-emerald-400">Active</span>
                        </div>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-900 dark:text-white">
                        <Activity size={14} className="mr-1 text-gray-400" />
                        {user.total_downloads || 0}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                        <Calendar size={14} className="mr-1" />
                        {new Date(user.last_active).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleViewProfile(user.id)}
                          className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                          title="View Profile"
                        >
                          <Eye size={16} />
                        </button>
                        
                        {user.id !== currentUser?.id && (
                          <>
                            <button
                              onClick={() => {
                                setEditingUser(user);
                                setNewGrade(user.grade);
                              }}
                              className="p-2 text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200"
                              title="Edit Grade"
                            >
                              <Edit size={16} />
                            </button>
                            
                            {isUserBlocked(user) ? (
                              <button
                                onClick={() => handleUnblockUser(user.id)}
                                className="p-2 text-gray-400 hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors duration-200"
                                title="Unblock User"
                              >
                                <UserCheck size={16} />
                              </button>
                            ) : (
                              <button
                                onClick={() => setBlockingUser(user)}
                                className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
                                title="Block User"
                              >
                                <Ban size={16} />
                              </button>
                            )}
                            
                            <button
                              onClick={() => setDeletingUser(user)}
                              className="p-2 text-gray-400 hover:text-red-600 dark:hover:text-red-400 transition-colors duration-200"
                              title="Delete User"
                            >
                              <Trash2 size={16} />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filteredUsers.length === 0 && (
          <div className="text-center py-12">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">No users found</h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Try adjusting your search criteria.
            </p>
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {creatingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setCreatingUser(false)}></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Create New User
                </h3>
                <button
                  onClick={() => setCreatingUser(false)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Full Name
                  </label>
                  <input
                    type="text"
                    value={newUserData.name}
                    onChange={(e) => setNewUserData({...newUserData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter full name"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Email Address
                  </label>
                  <input
                    type="email"
                    value={newUserData.email}
                    onChange={(e) => setNewUserData({...newUserData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Enter email address"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Password (optional)
                  </label>
                  <input
                    type="password"
                    value={newUserData.password}
                    onChange={(e) => setNewUserData({...newUserData, password: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="Leave empty to auto-generate"
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    If left empty, a secure password will be generated automatically
                  </p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Access Grade
                  </label>
                  <select
                    value={newUserData.grade}
                    onChange={(e) => setNewUserData({...newUserData, grade: e.target.value as 'V4' | 'V5' | 'Support'})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="V4">V4 - Standard access</option>
                    <option value="V5">V5 - Advanced features</option>
                    <option value="Support">Support - Bug management access</option>
                  </select>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <CheckCircle className="text-blue-600 dark:text-blue-400 w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
                        User Account Created
                      </p>
                      <p className="text-sm text-blue-700 dark:text-blue-300 mt-1">
                        The user account will be created with the specified credentials. The user can log in immediately with their email and password.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setCreatingUser(false)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreateUser}
                  disabled={loading || !newUserData.name || !newUserData.email}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
                >
                  <UserPlus size={18} />
                  <span>{loading ? 'Creating...' : 'Create User'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit Grade Modal */}
      {editingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setEditingUser(null)}></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Edit User Grade
                </h3>
                <button
                  onClick={() => setEditingUser(null)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">{editingUser.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">{editingUser.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{editingUser.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Current Grade: <span className={`px-2 py-1 text-xs font-medium rounded-full ${getGradeColor(editingUser.grade)}`}>
                      {editingUser.grade}
                    </span>
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

                <div className="bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="text-amber-600 dark:text-amber-400 w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-amber-800 dark:text-amber-200">
                        Grade Change Warning
                      </p>
                      <p className="text-sm text-amber-700 dark:text-amber-300 mt-1">
                        Changing a user's grade will immediately affect their access permissions and available features.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleGradeUpdate(editingUser.id, newGrade)}
                  disabled={loading || newGrade === editingUser.grade}
                  className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
                >
                  <CheckCircle size={18} />
                  <span>{loading ? 'Updating...' : 'Update Grade'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Block User Modal */}
      {blockingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setBlockingUser(null)}></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Block User
                </h3>
                <button
                  onClick={() => setBlockingUser(null)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">{blockingUser.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">{blockingUser.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{blockingUser.email}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Block Duration
                  </label>
                  <select
                    value={blockDuration}
                    onChange={(e) => setBlockDuration(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
                    <option value="30m">30 minutes</option>
                    <option value="1d">1 day</option>
                    <option value="7d">7 days</option>
                    <option value="30d">30 days</option>
                  </select>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
                  <div className="flex items-start space-x-2">
                    <Ban className="text-red-600 dark:text-red-400 w-5 h-5 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        Block User Warning
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        This user will be blocked for {getDurationLabel(blockDuration)} and won't be able to access the system until the block expires.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setBlockingUser(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleBlockUser(blockingUser.id, blockDuration)}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
                >
                  <Ban size={18} />
                  <span>{loading ? 'Blocking...' : 'Block User'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete User Modal */}
      {deletingUser && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 transition-opacity bg-gray-500 bg-opacity-75" onClick={() => setDeletingUser(null)}></div>
            
            <div className="inline-block align-bottom bg-white dark:bg-gray-800 rounded-lg px-4 pt-5 pb-4 text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full sm:p-6">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-medium text-gray-900 dark:text-white">
                  Delete User
                </h3>
                <button
                  onClick={() => setDeletingUser(null)}
                  className="text-gray-400 hover:text-gray-500 dark:hover:text-gray-300"
                >
                  <X size={24} />
                </button>
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-4">
                  <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">{deletingUser.name.charAt(0)}</span>
                  </div>
                  <div>
                    <h4 className="text-lg font-medium text-gray-900 dark:text-white">{deletingUser.name}</h4>
                    <p className="text-sm text-gray-500 dark:text-gray-400">{deletingUser.email}</p>
                  </div>
                </div>

                <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4">
                  <div className="flex items-start space-x-3">
                    <AlertCircle className="text-red-600 dark:text-red-400 w-6 h-6 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-800 dark:text-red-200">
                        Warning: This action cannot be undone
                      </p>
                      <p className="text-sm text-red-700 dark:text-red-300 mt-1">
                        Deleting this user will permanently remove their account and all associated data including:
                      </p>
                      <ul className="mt-2 text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                        <li>User profile information</li>
                        <li>Download history</li>
                        <li>Activity logs</li>
                        <li>Bug reports</li>
                        <li>Authored content</li>
                      </ul>
                    </div>
                  </div>
                </div>

                <div className="pt-3">
                  <p className="text-sm text-gray-700 dark:text-gray-300">
                    Please type <span className="font-medium">{deletingUser.name}</span> to confirm deletion:
                  </p>
                  <input
                    type="text"
                    className="mt-2 w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 focus:border-transparent"
                    placeholder={`Type "${deletingUser.name}" to confirm`}
                    id="delete-confirmation"
                  />
                </div>
              </div>

              <div className="flex justify-end space-x-3 mt-6">
                <button
                  onClick={() => setDeletingUser(null)}
                  className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    const confirmInput = document.getElementById('delete-confirmation') as HTMLInputElement;
                    if (confirmInput && confirmInput.value === deletingUser.name) {
                      handleDeleteUser(deletingUser.id);
                    } else {
                      showNotification.error('Name confirmation does not match');
                    }
                  }}
                  disabled={loading}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-400 text-white rounded-lg transition-colors duration-200"
                >
                  <Trash2 size={18} />
                  <span>{loading ? 'Deleting...' : 'Delete User'}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
        {[
          { label: 'Total Users', value: users.length, color: 'bg-blue-500' },
          { label: 'Admin Users', value: users.filter(u => u.grade === 'Admin').length, color: 'bg-red-500' },
          { label: 'Support Users', value: users.filter(u => u.grade === 'Support').length, color: 'bg-amber-500' },
          { label: 'V5 Users', value: users.filter(u => u.grade === 'V5').length, color: 'bg-purple-500' },
          { label: 'Blocked Users', value: users.filter(u => isUserBlocked(u)).length, color: 'bg-gray-500' }
        ].map((stat, index) => (
          <div key={index} className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{stat.value}</p>
              </div>
              <div className={`p-2 rounded-lg ${stat.color} bg-opacity-10`}>
                <Users className={`w-5 h-5 ${stat.color.replace('bg-', 'text-')}`} />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UserManagement;