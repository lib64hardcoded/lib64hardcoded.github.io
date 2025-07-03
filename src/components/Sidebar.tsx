import React, { useState, useRef, useEffect } from 'react';
import { 
  Home, 
  Download, 
  FileText, 
  Settings, 
  Sun, 
  Moon, 
  Menu, 
  X,
  Shield,
  Server,
  FolderOpen,
  BarChart3,
  Users,
  Activity,
  LogOut,
  Clock,
  BookOpen,
  ChevronDown,
  User,
  Bug,
  Globe,
  HeadsetIcon
} from 'lucide-react';
import { useTheme } from '../contexts/ThemeContext';
import { useAuth } from '../contexts/AuthContext';
import NotificationBell from './NotificationBell';

interface SidebarProps {
  activeSection: string;
  setActiveSection: (section: string) => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeSection, setActiveSection }) => {
  const { isDark, toggleTheme } = useTheme();
  const { user, hasAccess, signOut, timeRemaining } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home, requiresAccess: 'Guest' as const },
    { id: 'downloads', label: 'Downloads', icon: Download, requiresAccess: 'Guest' as const },
    { id: 'documentation', label: 'Documentation', icon: BookOpen, requiresAccess: 'Guest' as const },
    { id: 'patch-notes', label: 'Patch Notes', icon: FileText, requiresAccess: 'Guest' as const },
    { id: 'bug-report', label: 'Bug Reports', icon: Bug, requiresAccess: 'V4' as const },
    { id: 'file-manager', label: 'File Manager', icon: FolderOpen, requiresAccess: 'Admin' as const },
    { id: 'bug-management', label: 'Bug Management', icon: Bug, requiresAccess: ['Admin', 'Support'] },
    { id: 'analytics', label: 'Analytics', icon: BarChart3, requiresAccess: 'Admin' as const },
    { id: 'user-management', label: 'User Management', icon: Users, requiresAccess: 'Admin' as const },
    { id: 'activity-logs', label: 'Activity Logs', icon: Activity, requiresAccess: 'Admin' as const },
    { id: 'ip-protection', label: 'IP Protection', icon: Globe, requiresAccess: 'Admin' as const },
    // Settings moved to user dropdown menu instead of main navigation
  ];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const getGradeColor = (grade: string) => {
    switch (grade) {
      case 'Admin':
        return 'text-red-500 bg-red-100 dark:bg-red-900/20';
      case 'Support':
        return 'text-amber-500 bg-amber-100 dark:bg-amber-900/20';
      case 'V5':
        return 'text-purple-500 bg-purple-100 dark:bg-purple-900/20';
      case 'V4':
        return 'text-blue-500 bg-blue-100 dark:bg-blue-900/20';
      default:
        return 'text-gray-500 bg-gray-100 dark:bg-gray-800';
    }
  };

  const formatTime = (ms: number) => {
    const minutes = Math.floor(ms / 60000);
    const seconds = Math.floor((ms % 60000) / 1000);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  const handleSignOut = async () => {
    console.log('Sidebar: Sign out clicked');
    setShowUserMenu(false);
    try {
      await signOut();
    } catch (error) {
      console.error('Sidebar: Error signing out:', error);
    }
  };

  const handleThemeToggle = () => {
    console.log('Sidebar: Theme toggle clicked');
    toggleTheme();
  };

  const handleNavigation = (sectionId: string) => {
    console.log('Sidebar: Navigation clicked:', sectionId);
    setActiveSection(sectionId);
    if (window.innerWidth < 1024) setIsCollapsed(true);
  };

  const handleUserClick = () => {
    console.log('Sidebar: User profile clicked');
    setActiveSection('profile');
    setShowUserMenu(false);
    if (window.innerWidth < 1024) setIsCollapsed(true);
  };

  const handleSettingsClick = () => {
    console.log('Sidebar: Settings clicked');
    setActiveSection('settings');
    setShowUserMenu(false);
    if (window.innerWidth < 1024) setIsCollapsed(true);
  };

  // Check if user has access to a menu item
  const checkAccess = (requiredAccess: string | string[]): boolean => {
    if (Array.isArray(requiredAccess)) {
      // If requiredAccess is an array, check if user has any of the listed roles
      return requiredAccess.some(role => hasAccess(role as any));
    }
    // Otherwise, check for the single required role
    return hasAccess(requiredAccess as any);
  };

  if (!user) return null;

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsCollapsed(!isCollapsed)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 rounded-lg bg-white dark:bg-gray-800 shadow-lg border border-gray-200 dark:border-gray-700"
      >
        {isCollapsed ? <Menu size={20} className="text-gray-600 dark:text-gray-300" /> : <X size={20} className="text-gray-600 dark:text-gray-300" />}
      </button>

      {/* Sidebar */}
      <div className={`fixed inset-y-0 left-0 z-40 w-64 bg-white dark:bg-gray-800 shadow-xl transform transition-transform duration-300 ease-in-out border-r border-gray-200 dark:border-gray-700 ${
        isCollapsed ? '-translate-x-full lg:translate-x-0' : 'translate-x-0'
      }`}>
        <div className="flex flex-col h-full">
          {/* Header */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <Server className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white">Prodomo</h1>
                <p className="text-sm text-gray-500 dark:text-gray-400">Server Dashboard</p>
              </div>
            </div>
          </div>

          {/* User Info - Now with Dropdown and Notification Bell */}
          <div className="p-4 border-b border-gray-200 dark:border-gray-700">
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center space-x-3 p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200 group"
              >
                <div className="relative">
                  <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold">{user.name.charAt(0)}</span>
                  </div>
                  {/* Online indicator */}
                  <div className="absolute bottom-0 right-0 w-3 h-3 bg-emerald-500 border-2 border-white dark:border-gray-800 rounded-full"></div>
                </div>
                <div className="flex-1 min-w-0 text-left">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors duration-200">
                    {user.name}
                    {user.is_guest && <span className="ml-1 text-xs text-blue-600 dark:text-blue-400">(Guest)</span>}
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Show both V4/V5 and Support badges if user is Support */}
                    {user.grade === 'Support' ? (
                      <>
                        <span className={`text-xs px-2 py-1 rounded-full flex items-center ${getGradeColor('V4')}`}>
                          <Shield size={10} className="mr-1" />
                          V4
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full flex items-center ${getGradeColor('Support')}`}>
                          <HeadsetIcon size={10} className="mr-1" />
                          Support
                        </span>
                      </>
                    ) : (
                      <span className={`text-xs px-2 py-1 rounded-full flex items-center ${getGradeColor(user.grade)}`}>
                        <Shield size={10} className="mr-1" />
                        {user.grade}
                      </span>
                    )}
                  </div>
                  {user.is_guest && timeRemaining && (
                    <div className="flex items-center space-x-1 mt-1">
                      <Clock size={12} className="text-amber-500" />
                      <span className="text-xs text-amber-600 dark:text-amber-400">
                        {formatTime(timeRemaining)}
                      </span>
                    </div>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  {/* Notification Bell - positioned better */}
                  <div onClick={(e) => e.stopPropagation()}>
                    <NotificationBell />
                  </div>
                  <ChevronDown 
                    size={16} 
                    className={`text-gray-400 group-hover:text-gray-600 dark:group-hover:text-gray-300 transition-all duration-200 ${
                      showUserMenu ? 'rotate-180' : ''
                    }`} 
                  />
                </div>
              </button>
              
              {/* User Dropdown Menu */}
              {showUserMenu && (
                <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg z-[70] overflow-hidden">
                  <button
                    onClick={handleUserClick}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    <User size={16} className="text-gray-400" />
                    <span className="text-sm font-medium text-gray-900 dark:text-white">View Profile</span>
                  </button>
                  
                  {/* Settings - Only show for non-guest users */}
                  {!user.is_guest && (
                    <button
                      onClick={handleSettingsClick}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                    >
                      <Settings size={16} className="text-gray-400" />
                      <span className="text-sm font-medium text-gray-900 dark:text-white">Settings</span>
                    </button>
                  )}
                  
                  <button
                    onClick={handleThemeToggle}
                    className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors duration-200"
                  >
                    {isDark ? <Sun size={16} className="text-amber-400" /> : <Moon size={16} className="text-gray-400" />}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {isDark ? 'Light Mode' : 'Dark Mode'}
                    </span>
                  </button>
                  <div className="border-t border-gray-200 dark:border-gray-700">
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center space-x-3 px-4 py-3 text-left hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors duration-200"
                    >
                      <LogOut size={16} className="text-red-500" />
                      <span className="text-sm font-medium text-red-600 dark:text-red-400">Sign Out</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
            {menuItems.map((item) => {
              if (!checkAccess(item.requiresAccess)) return null;
              
              const isActive = activeSection === item.id;
              const IconComponent = item.icon;
              
              return (
                <button
                  key={item.id}
                  onClick={() => handleNavigation(item.id)}
                  className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-all duration-200 ${
                    isActive
                      ? 'bg-blue-50 dark:bg-blue-900/20 text-blue-600 dark:text-blue-400 border-r-2 border-blue-600'
                      : 'text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <IconComponent size={20} />
                  <span className="font-medium">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Backdrop for mobile */}
      {!isCollapsed && (
        <div 
          className="lg:hidden fixed inset-0 z-30 bg-black bg-opacity-50"
          onClick={() => setIsCollapsed(true)}
        />
      )}
    </>
  );
};

export default Sidebar;