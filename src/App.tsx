import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Downloads from './components/Downloads';
import Documentation from './components/Documentation';
import PatchNotes from './components/PatchNotes';
import Profile from './components/Profile';
import Settings from './components/Settings';
import FileManager from './components/FileManager';
import Analytics from './components/Analytics';
import UserManagement from './components/UserManagement';
import ActivityLogs from './components/ActivityLogs';
import BugReport from './components/BugReport';
import BugManagement from './components/BugManagement';
import IPProtectionDashboard from './components/IPProtectionDashboard';
import AuthModal from './components/AuthModal';
import GuestTimer from './components/GuestTimer';
import { ThemeProvider } from './contexts/ThemeContext';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { LogIn } from 'lucide-react';
import { isProtectionEnabled } from './lib/ipProtection';
import { useDatabase } from './hooks/useDatabase';

const AppContent: React.FC = () => {
  const { isAuthenticated, user } = useAuth();
  const { initializeCleanData } = useDatabase();
  const [activeSection, setActiveSection] = useState('dashboard');
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [profileUserId, setProfileUserId] = useState<string | undefined>(undefined);
  const [initialized, setInitialized] = useState(false);

  // Initialize clean data if needed
  useEffect(() => {
    if (!initialized) {
      // Check if we need to initialize data
      const hasData = localStorage.getItem('prodomo_users');
      if (!hasData) {
        console.log('Initializing clean data...');
        initializeCleanData();
      }
      setInitialized(true);
    }
  }, [initialized, initializeCleanData]);

  // Listen for custom viewProfile events
  useEffect(() => {
    const handleViewProfile = (event: CustomEvent) => {
      if (event.detail && event.detail.userId) {
        setProfileUserId(event.detail.userId);
      }
    };

    document.addEventListener('viewProfile', handleViewProfile as EventListener);
    
    return () => {
      document.removeEventListener('viewProfile', handleViewProfile as EventListener);
    };
  }, []);

  const handleViewProfile = (userId?: string) => {
    setProfileUserId(userId);
    setActiveSection('profile');
  };

  const handleBackFromProfile = () => {
    setProfileUserId(undefined);
    setActiveSection('dashboard');
  };

  const renderSection = () => {
    switch (activeSection) {
      case 'dashboard':
        return <Dashboard activeSection={activeSection} setActiveSection={setActiveSection} />;
      case 'downloads':
        return <Downloads />;
      case 'documentation':
        return <Documentation />;
      case 'file-manager':
        return <FileManager />;
      case 'patch-notes':
        return <PatchNotes />;
      case 'analytics':
        return <Analytics />;
      case 'user-management':
        return <UserManagement onViewProfile={handleViewProfile} />;
      case 'activity-logs':
        return <ActivityLogs />;
      case 'bug-report':
        return <BugReport />;
      case 'bug-management':
        return <BugManagement />;
      case 'ip-protection':
        return <IPProtectionDashboard />;
      case 'profile':
        return (
          <Profile 
            userId={profileUserId} 
            onBack={profileUserId ? handleBackFromProfile : undefined}
          />
        );
      case 'settings':
        return <Settings />;
      default:
        return <Dashboard activeSection={activeSection} setActiveSection={setActiveSection} />;
    }
  };

  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="flex items-center justify-center min-h-screen">
          <div className="max-w-md w-full mx-4">
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-8 text-center">
              <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full w-16 h-16 mx-auto mb-6 flex items-center justify-center">
                <LogIn className="w-8 h-8 text-white" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">
                Welcome to Prodomo
              </h1>
              <p className="text-gray-600 dark:text-gray-400 mb-8">
                Access server downloads, patch notes, and more. Sign in to continue or try our 5-minute guest access.
              </p>
              
              <button
                onClick={() => setShowAuthModal(true)}
                className="w-full flex items-center justify-center space-x-2 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors duration-200"
              >
                <LogIn size={20} />
                <span>Get Started</span>
              </button>
              
              <div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-lg">
                <p className="text-xs text-amber-800 dark:text-amber-200 font-medium">
                  🛡️ IP Protection {isProtectionEnabled() ? 'Active' : 'Inactive'}
                </p>
                <p className="text-xs text-amber-700 dark:text-amber-300 mt-1">
                  Guest accounts expire after 5 minutes. {isProtectionEnabled() ? 'Your IP will be blocked for 3 days after session expiry to prevent abuse.' : 'IP protection is currently disabled.'}
                </p>
              </div>
            </div>
          </div>
        </div>
        
        <AuthModal 
          isOpen={showAuthModal} 
          onClose={() => setShowAuthModal(false)} 
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="flex">
        <Sidebar activeSection={activeSection} setActiveSection={setActiveSection} />
        <main className="flex-1 lg:ml-64">
          <div className="p-4 sm:p-6 lg:p-8">
            {renderSection()}
          </div>
        </main>
      </div>
      <GuestTimer />
    </div>
  );
};

function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppContent />
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;