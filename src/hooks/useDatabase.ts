import { useState, useEffect } from 'react';
import { supabase, isUsingSupabase, initializeDatabase } from '../lib/supabase';
import type { 
  User, 
  ServerFile, 
  PatchNote, 
  DownloadLog, 
  ActivityLog, 
  SystemMetric, 
  Documentation,
  BugReport 
} from '../lib/supabase';

export interface FileRequirement {
  id: string;
  label: string;
  value: string;
}

export const useDatabase = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dbInitialized, setDbInitialized] = useState(false);

  // Initialize database connection on mount
  useEffect(() => {
    const init = async () => {
      try {
        const success = await initializeDatabase();
        setDbInitialized(success);
        if (!success) {
          console.error('Failed to initialize database');
          setError('Failed to connect to database');
        }
      } catch (err) {
        console.error('Database initialization error:', err);
        setError('Database initialization error');
      }
    };
    
    init();
  }, []);

  // Initialize clean data for localStorage
  const initializeCleanData = () => {
    try {
      // Create default users
      const defaultUsers = [
        {
          id: '11111111-1111-1111-1111-111111111111',
          name: 'Admin User',
          email: 'admin@prodomo.local',
          grade: 'Admin',
          join_date: new Date().toISOString(),
          last_active: new Date().toISOString(),
          total_downloads: 0,
          is_guest: false,
          is_blocked: false,
          admin_notes: 'System administrator account'
        },
        {
          id: '22222222-2222-2222-2222-222222222222',
          name: 'V4 User',
          email: 'v4@prodomo.local',
          grade: 'V4',
          join_date: new Date().toISOString(),
          last_active: new Date().toISOString(),
          total_downloads: 5,
          is_guest: false,
          is_blocked: false,
          admin_notes: 'Standard V4 user account'
        },
        {
          id: '33333333-3333-3333-3333-333333333333',
          name: 'V5 User',
          email: 'v5@prodomo.local',
          grade: 'V5',
          join_date: new Date().toISOString(),
          last_active: new Date().toISOString(),
          total_downloads: 12,
          is_guest: false,
          is_blocked: false,
          admin_notes: 'Advanced V5 user account'
        },
        {
          id: '44444444-4444-4444-4444-444444444444',
          name: 'Support User',
          email: 'support@prodomo.local',
          grade: 'Support',
          join_date: new Date().toISOString(),
          last_active: new Date().toISOString(),
          total_downloads: 3,
          is_guest: false,
          is_blocked: false,
          admin_notes: 'Support team member with bug management access'
        }
      ];
      
      localStorage.setItem('prodomo_users', JSON.stringify(defaultUsers));
      
      // Create default server files
      const defaultFiles = [
        {
          id: crypto.randomUUID(),
          name: 'Prodomo Server',
          version: '2.1.4',
          description: 'Latest stable release of Prodomo Server with enhanced security features and performance improvements.',
          file_url: 'https://example.com/download/prodomo-server-2.1.4.zip',
          file_size: 52428800,
          file_type: 'server',
          min_grade: 'V4',
          status: 'active',
          download_count: 1247,
          changelog: [
            'Enhanced security protocols',
            'Improved performance by 25%',
            'Fixed memory leak issues',
            'Added new configuration options',
            'Updated dependencies'
          ],
          created_by: '11111111-1111-1111-1111-111111111111',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: crypto.randomUUID(),
          name: 'Prodomo Server Beta',
          version: '2.2.0-beta',
          description: 'Beta version with experimental features. Use at your own risk in production environments.',
          file_url: 'https://example.com/download/prodomo-server-2.2.0-beta.zip',
          file_size: 55574528,
          file_type: 'server',
          min_grade: 'V5',
          status: 'beta',
          download_count: 89,
          changelog: [
            'New experimental API endpoints',
            'Advanced caching mechanisms',
            'Improved logging system',
            'Beta WebSocket support'
          ],
          created_by: '11111111-1111-1111-1111-111111111111',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: crypto.randomUUID(),
          name: 'Security Plugin',
          version: '1.0.2',
          description: 'Essential security plugin for enhanced server protection and monitoring.',
          file_url: 'https://example.com/download/security-plugin-1.0.2.zip',
          file_size: 5242880,
          file_type: 'plugin',
          min_grade: 'V4',
          status: 'active',
          download_count: 456,
          changelog: [
            'Fixed vulnerability in authentication',
            'Added brute force protection',
            'Improved logging capabilities'
          ],
          created_by: '11111111-1111-1111-1111-111111111111',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      localStorage.setItem('prodomo_server_files', JSON.stringify(defaultFiles));
      
      // Create default patch notes
      const defaultPatchNotes = [
        {
          id: crypto.randomUUID(),
          version: '2.1.4',
          title: 'Security and Performance Update',
          content: `## What's New in v2.1.4\n\n### Security Enhancements\n- Implemented advanced encryption for data transmission\n- Added multi-factor authentication support\n- Enhanced input validation and sanitization\n- Updated security protocols to prevent common vulnerabilities\n\n### Performance Improvements\n- Optimized database queries for 25% faster response times\n- Reduced memory usage by 15%\n- Improved caching mechanisms\n- Enhanced connection pooling\n\n### Bug Fixes\n- Fixed critical memory leak in long-running processes\n- Resolved issue with concurrent user sessions\n- Fixed configuration file parsing errors\n- Corrected timezone handling in logs\n\n### New Features\n- Added real-time monitoring dashboard\n- Implemented automatic backup system\n- New configuration management interface\n- Enhanced logging with structured output\n\n### Breaking Changes\n- Updated API endpoints (see migration guide)\n- Changed default configuration format\n- Minimum system requirements updated\n\nFor detailed migration instructions, please refer to our documentation.`,
          status: 'published',
          author_id: '11111111-1111-1111-1111-111111111111',
          author_name: 'Admin User',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      
      localStorage.setItem('prodomo_patch_notes', JSON.stringify(defaultPatchNotes));
      
      console.log('Initialized clean data in localStorage');
    } catch (error) {
      console.error('Failed to initialize clean data:', error);
    }
  };

  // User management
  const getUsers = async (): Promise<User[]> => {
    try {
      setLoading(true);
      
      // Try to get users from Supabase
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Failed to fetch users from Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_users');
        if (stored) {
          return JSON.parse(stored);
        }
        
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching users:', error);
      
      // Fallback to localStorage
      const stored = localStorage.getItem('prodomo_users');
      if (stored) {
        return JSON.parse(stored);
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  };

  const updateUser = async (userId: string, updates: Partial<User>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Try to update in Supabase
      const { error } = await supabase
        .from('users')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', userId);

      if (error) {
        console.error('Error updating user in Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_users');
        if (stored) {
          const users = JSON.parse(stored);
          const userIndex = users.findIndex((u: User) => u.id === userId);
          
          if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...updates, updated_at: new Date().toISOString() };
            localStorage.setItem('prodomo_users', JSON.stringify(users));
            
            // Update current user if it's the same user
            const currentUser = localStorage.getItem('prodomo_current_user');
            if (currentUser) {
              const parsedUser = JSON.parse(currentUser);
              if (parsedUser.id === userId) {
                localStorage.setItem('prodomo_current_user', JSON.stringify({ ...parsedUser, ...updates }));
              }
            }
            
            return true;
          }
        }
        
        setError('Failed to update user');
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error updating user:', err);
      setError('Failed to update user');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateUserGrade = async (userId: string, grade: string): Promise<boolean> => {
    return updateUser(userId, { grade: grade as User['grade'] });
  };

  const updateUserNotes = async (userId: string, notes: string): Promise<boolean> => {
    return updateUser(userId, { admin_notes: notes });
  };

  const blockUser = async (userId: string, duration: string): Promise<boolean> => {
    const durationMs = {
      '30m': 30 * 60 * 1000,
      '1d': 24 * 60 * 60 * 1000,
      '7d': 7 * 24 * 60 * 60 * 1000,
      '30d': 30 * 24 * 60 * 60 * 1000
    }[duration] || 30 * 60 * 1000;

    const blockedUntil = new Date(Date.now() + durationMs).toISOString();
    return updateUser(userId, { is_blocked: true, blocked_until: blockedUntil });
  };

  const unblockUser = async (userId: string): Promise<boolean> => {
    return updateUser(userId, { is_blocked: false, blocked_until: undefined });
  };

  const createUser = async (userData: {
    name: string;
    email: string;
    password: string;
    grade: 'V4' | 'V5' | 'Support';
  }): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Generate a UUID for the new user
      const userId = crypto.randomUUID();
      
      // Create user in our custom table
      const newUser = {
        id: userId,
        name: userData.name,
        email: userData.email,
        grade: userData.grade,
        join_date: new Date().toISOString(),
        last_active: new Date().toISOString(),
        total_downloads: 0,
        is_guest: false,
        is_blocked: false
      };
      
      // Try to insert into Supabase
      const { error } = await supabase
        .from('users')
        .insert([newUser]);

      if (error) {
        console.error('Error creating user in Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_users');
        const users = stored ? JSON.parse(stored) : [];
        users.push(newUser);
        localStorage.setItem('prodomo_users', JSON.stringify(users));
        
        // Also store the password for demo purposes
        const passwords = JSON.parse(localStorage.getItem('prodomo_passwords') || '{}');
        passwords[userId] = userData.password;
        localStorage.setItem('prodomo_passwords', JSON.stringify(passwords));
        
        return true;
      }
      
      return true;
    } catch (err) {
      console.error('Error creating user:', err);
      setError('Failed to create user');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (userId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // Delete from users table first
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);

      if (error) {
        console.error('Error deleting user from Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_users');
        if (stored) {
          const users = JSON.parse(stored);
          const filteredUsers = users.filter((u: User) => u.id !== userId);
          localStorage.setItem('prodomo_users', JSON.stringify(filteredUsers));
          
          // Also remove password if exists
          const passwords = JSON.parse(localStorage.getItem('prodomo_passwords') || '{}');
          if (passwords[userId]) {
            delete passwords[userId];
            localStorage.setItem('prodomo_passwords', JSON.stringify(passwords));
          }
          
          return true;
        }
        
        setError('Failed to delete user');
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting user:', err);
      setError('Failed to delete user');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const getUserPassword = (userId: string): string | null => {
    // In a real app with Supabase, we can't retrieve passwords as they're hashed
    // For demo purposes, we'll use hardcoded passwords
    const hardcodedUsers = {
      '11111111-1111-1111-1111-111111111111': 'admin123',
      '22222222-2222-2222-2222-222222222222': 'v4pass',
      '33333333-3333-3333-3333-333333333333': 'v5pass',
      '44444444-4444-4444-4444-444444444444': 'support123'
    };
    
    // First check hardcoded passwords
    if (hardcodedUsers[userId as keyof typeof hardcodedUsers]) {
      return hardcodedUsers[userId as keyof typeof hardcodedUsers];
    }
    
    // Then check localStorage for custom users
    try {
      const passwords = JSON.parse(localStorage.getItem('prodomo_passwords') || '{}');
      return passwords[userId] || null;
    } catch (error) {
      console.error('Error getting user password:', error);
      return null;
    }
  };

  // Server files management
  const getServerFiles = async (): Promise<ServerFile[]> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('server_files')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Failed to fetch files from Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_server_files');
        if (stored) {
          return JSON.parse(stored);
        }
        
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching server files:', error);
      
      // Fallback to localStorage
      const stored = localStorage.getItem('prodomo_server_files');
      if (stored) {
        return JSON.parse(stored);
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createServerFile = async (fileData: Omit<ServerFile, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('server_files')
        .insert([fileData]);

      if (error) {
        console.error('Error creating file in Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_server_files');
        const files = stored ? JSON.parse(stored) : [];
        const newFile = {
          ...fileData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        files.push(newFile);
        localStorage.setItem('prodomo_server_files', JSON.stringify(files));
        
        return true;
      }
      
      return true;
    } catch (err) {
      console.error('Error creating file:', err);
      setError('Failed to create file');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateServerFile = async (fileId: string, updates: Partial<ServerFile>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('server_files')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', fileId);

      if (error) {
        console.error('Error updating file in Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_server_files');
        if (stored) {
          const files = JSON.parse(stored);
          const fileIndex = files.findIndex((f: ServerFile) => f.id === fileId);
          
          if (fileIndex !== -1) {
            files[fileIndex] = { ...files[fileIndex], ...updates, updated_at: new Date().toISOString() };
            localStorage.setItem('prodomo_server_files', JSON.stringify(files));
            return true;
          }
        }
        
        setError('Failed to update file');
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error updating file:', err);
      setError('Failed to update file');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteServerFile = async (fileId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('server_files')
        .delete()
        .eq('id', fileId);

      if (error) {
        console.error('Error deleting file from Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_server_files');
        if (stored) {
          const files = JSON.parse(stored);
          const filteredFiles = files.filter((f: ServerFile) => f.id !== fileId);
          localStorage.setItem('prodomo_server_files', JSON.stringify(filteredFiles));
          return true;
        }
        
        setError('Failed to delete file');
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting file:', err);
      setError('Failed to delete file');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // File upload using Supabase Storage
  const uploadFile = async (file: File, bucket: string, fileName: string): Promise<string | null> => {
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.storage
        .from(bucket)
        .upload(fileName, file);

      if (error) {
        console.error('Error uploading file to Supabase:', error);
        
        // For demo purposes, return a fake URL
        const fakeUrl = `https://example.com/storage/${bucket}/${fileName}`;
        return fakeUrl;
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from(bucket)
        .getPublicUrl(fileName);

      return urlData.publicUrl;
    } catch (err) {
      console.error('Error uploading file:', err);
      setError('Failed to upload file');
      
      // For demo purposes, return a fake URL
      const fakeUrl = `https://example.com/storage/${bucket}/${fileName}`;
      return fakeUrl;
    } finally {
      setLoading(false);
    }
  };

  // Patch notes management
  const getPatchNotes = async (): Promise<PatchNote[]> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('patch_notes')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Failed to fetch patch notes from Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_patch_notes');
        if (stored) {
          return JSON.parse(stored);
        }
        
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching patch notes:', error);
      
      // Fallback to localStorage
      const stored = localStorage.getItem('prodomo_patch_notes');
      if (stored) {
        return JSON.parse(stored);
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createPatchNote = async (noteData: Omit<PatchNote, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('patch_notes')
        .insert([noteData]);

      if (error) {
        console.error('Error creating patch note in Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_patch_notes');
        const notes = stored ? JSON.parse(stored) : [];
        const newNote = {
          ...noteData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        notes.push(newNote);
        localStorage.setItem('prodomo_patch_notes', JSON.stringify(notes));
        
        return true;
      }
      
      return true;
    } catch (err) {
      console.error('Error creating patch note:', err);
      setError('Failed to create patch note');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updatePatchNote = async (noteId: string, updates: Partial<PatchNote>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('patch_notes')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', noteId);

      if (error) {
        console.error('Error updating patch note in Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_patch_notes');
        if (stored) {
          const notes = JSON.parse(stored);
          const noteIndex = notes.findIndex((n: PatchNote) => n.id === noteId);
          
          if (noteIndex !== -1) {
            notes[noteIndex] = { ...notes[noteIndex], ...updates, updated_at: new Date().toISOString() };
            localStorage.setItem('prodomo_patch_notes', JSON.stringify(notes));
            return true;
          }
        }
        
        setError('Failed to update patch note');
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error updating patch note:', err);
      setError('Failed to update patch note');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deletePatchNote = async (noteId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('patch_notes')
        .delete()
        .eq('id', noteId);

      if (error) {
        console.error('Error deleting patch note from Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_patch_notes');
        if (stored) {
          const notes = JSON.parse(stored);
          const filteredNotes = notes.filter((n: PatchNote) => n.id !== noteId);
          localStorage.setItem('prodomo_patch_notes', JSON.stringify(filteredNotes));
          return true;
        }
        
        setError('Failed to delete patch note');
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting patch note:', err);
      setError('Failed to delete patch note');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Activity logging
  const logActivity = async (activityData: Omit<ActivityLog, 'id' | 'created_at'>): Promise<boolean> => {
    try {
      // First check if the user exists in the database
      if (activityData.user_id) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('id', activityData.user_id);
        
        if (userError || !userData || userData.length === 0) {
          console.error('User does not exist in database, cannot log activity:', activityData.user_id);
          
          // Fallback to localStorage only
          const stored = localStorage.getItem('prodomo_activity_logs');
          const logs = stored ? JSON.parse(stored) : [];
          const newLog = {
            ...activityData,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString()
          };
          logs.push(newLog);
          localStorage.setItem('prodomo_activity_logs', JSON.stringify(logs));
          
          return true;
        }
      }
      
      // User exists, proceed with Supabase insert
      const { error } = await supabase
        .from('activity_logs')
        .insert([activityData]);

      if (error) {
        console.error('Error logging activity to Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_activity_logs');
        const logs = stored ? JSON.parse(stored) : [];
        const newLog = {
          ...activityData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        };
        logs.push(newLog);
        localStorage.setItem('prodomo_activity_logs', JSON.stringify(logs));
      }
      
      return true;
    } catch (err) {
      console.error('Error logging activity:', err);
      
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem('prodomo_activity_logs');
        const logs = stored ? JSON.parse(stored) : [];
        const newLog = {
          ...activityData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        };
        logs.push(newLog);
        localStorage.setItem('prodomo_activity_logs', JSON.stringify(logs));
      } catch (localError) {
        console.error('Failed to log activity to localStorage:', localError);
      }
      
      return false;
    }
  };

  const getActivityLogs = async (limit: number = 100): Promise<ActivityLog[]> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('activity_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Failed to fetch activity logs from Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_activity_logs');
        if (stored) {
          const logs = JSON.parse(stored);
          return logs.slice(0, limit);
        }
        
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      
      // Fallback to localStorage
      const stored = localStorage.getItem('prodomo_activity_logs');
      if (stored) {
        const logs = JSON.parse(stored);
        return logs.slice(0, limit);
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Download logging
  const logDownload = async (downloadData: Omit<DownloadLog, 'id' | 'created_at'>): Promise<boolean> => {
    try {
      // First check if the user exists in the database
      if (downloadData.user_id) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('id', downloadData.user_id);
        
        if (userError || !userData || userData.length === 0) {
          console.error('User does not exist in database, cannot log download:', downloadData.user_id);
          
          // Fallback to localStorage only
          const stored = localStorage.getItem('prodomo_download_logs');
          const logs = stored ? JSON.parse(stored) : [];
          const newLog = {
            ...downloadData,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString()
          };
          logs.push(newLog);
          localStorage.setItem('prodomo_download_logs', JSON.stringify(logs));
          
          // Update user's total_downloads in localStorage
          if (downloadData.user_id) {
            const usersJson = localStorage.getItem('prodomo_users');
            if (usersJson) {
              const users = JSON.parse(usersJson);
              const userIndex = users.findIndex((u: User) => u.id === downloadData.user_id);
              if (userIndex !== -1) {
                users[userIndex].total_downloads = (users[userIndex].total_downloads || 0) + 1;
                localStorage.setItem('prodomo_users', JSON.stringify(users));
                
                // Update current user if it's the same user
                const currentUser = localStorage.getItem('prodomo_current_user');
                if (currentUser) {
                  const parsedUser = JSON.parse(currentUser);
                  if (parsedUser.id === downloadData.user_id) {
                    parsedUser.total_downloads = (parsedUser.total_downloads || 0) + 1;
                    localStorage.setItem('prodomo_current_user', JSON.stringify(parsedUser));
                  }
                }
              }
            }
          }
          
          return true;
        }
      }
      
      // User exists, proceed with Supabase insert
      const { error } = await supabase
        .from('download_logs')
        .insert([downloadData]);

      if (error) {
        console.error('Error logging download to Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_download_logs');
        const logs = stored ? JSON.parse(stored) : [];
        const newLog = {
          ...downloadData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        };
        logs.push(newLog);
        localStorage.setItem('prodomo_download_logs', JSON.stringify(logs));
      }
      
      // Update user's total_downloads
      try {
        if (downloadData.user_id) {
          // Try Supabase first
          const { data: userData, error: userError } = await supabase
            .from('users')
            .select('total_downloads')
            .eq('id', downloadData.user_id);
            
          if (!userError && userData && userData.length > 0) {
            const newTotal = (userData[0].total_downloads || 0) + 1;
            await supabase
              .from('users')
              .update({ total_downloads: newTotal })
              .eq('id', downloadData.user_id);
          } else {
            // Fallback to localStorage
            const usersJson = localStorage.getItem('prodomo_users');
            if (usersJson) {
              const users = JSON.parse(usersJson);
              const userIndex = users.findIndex((u: User) => u.id === downloadData.user_id);
              if (userIndex !== -1) {
                users[userIndex].total_downloads = (users[userIndex].total_downloads || 0) + 1;
                localStorage.setItem('prodomo_users', JSON.stringify(users));
                
                // Update current user if it's the same user
                const currentUser = localStorage.getItem('prodomo_current_user');
                if (currentUser) {
                  const parsedUser = JSON.parse(currentUser);
                  if (parsedUser.id === downloadData.user_id) {
                    parsedUser.total_downloads = (parsedUser.total_downloads || 0) + 1;
                    localStorage.setItem('prodomo_current_user', JSON.stringify(parsedUser));
                  }
                }
              }
            }
          }
        }
      } catch (updateError) {
        console.error('Failed to update user download count:', updateError);
      }
      
      return true;
    } catch (err) {
      console.error('Error logging download:', err);
      
      // Fallback to localStorage
      try {
        const stored = localStorage.getItem('prodomo_download_logs');
        const logs = stored ? JSON.parse(stored) : [];
        const newLog = {
          ...downloadData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString()
        };
        logs.push(newLog);
        localStorage.setItem('prodomo_download_logs', JSON.stringify(logs));
        
        // Update user's total_downloads in localStorage
        if (downloadData.user_id) {
          const usersJson = localStorage.getItem('prodomo_users');
          if (usersJson) {
            const users = JSON.parse(usersJson);
            const userIndex = users.findIndex((u: User) => u.id === downloadData.user_id);
            if (userIndex !== -1) {
              users[userIndex].total_downloads = (users[userIndex].total_downloads || 0) + 1;
              localStorage.setItem('prodomo_users', JSON.stringify(users));
              
              // Update current user if it's the same user
              const currentUser = localStorage.getItem('prodomo_current_user');
              if (currentUser) {
                const parsedUser = JSON.parse(currentUser);
                if (parsedUser.id === downloadData.user_id) {
                  parsedUser.total_downloads = (parsedUser.total_downloads || 0) + 1;
                  localStorage.setItem('prodomo_current_user', JSON.stringify(parsedUser));
                }
              }
            }
          }
        }
      } catch (localError) {
        console.error('Failed to log download to localStorage:', localError);
      }
      
      return false;
    }
  };

  const getDownloadLogs = async (limit: number = 100): Promise<DownloadLog[]> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('download_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(limit);
      
      if (error) {
        console.error('Failed to fetch download logs from Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_download_logs');
        if (stored) {
          const logs = JSON.parse(stored);
          return logs.slice(0, limit);
        }
        
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching download logs:', error);
      
      // Fallback to localStorage
      const stored = localStorage.getItem('prodomo_download_logs');
      if (stored) {
        const logs = JSON.parse(stored);
        return logs.slice(0, limit);
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Documentation management
  const getDocumentation = async (): Promise<Documentation[]> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('documentation')
        .select('*')
        .order('order_index', { ascending: true });
      
      if (error) {
        console.error('Failed to fetch documentation from Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_documentation');
        if (stored) {
          return JSON.parse(stored);
        }
        
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching documentation:', error);
      
      // Fallback to localStorage
      const stored = localStorage.getItem('prodomo_documentation');
      if (stored) {
        return JSON.parse(stored);
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createDocumentation = async (docData: Omit<Documentation, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('documentation')
        .insert([docData]);

      if (error) {
        console.error('Error creating documentation in Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_documentation');
        const docs = stored ? JSON.parse(stored) : [];
        const newDoc = {
          ...docData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        docs.push(newDoc);
        localStorage.setItem('prodomo_documentation', JSON.stringify(docs));
        
        return true;
      }
      
      return true;
    } catch (err) {
      console.error('Error creating documentation:', err);
      setError('Failed to create documentation');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateDocumentation = async (docId: string, updates: Partial<Documentation>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('documentation')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', docId);

      if (error) {
        console.error('Error updating documentation in Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_documentation');
        if (stored) {
          const docs = JSON.parse(stored);
          const docIndex = docs.findIndex((d: Documentation) => d.id === docId);
          
          if (docIndex !== -1) {
            docs[docIndex] = { ...docs[docIndex], ...updates, updated_at: new Date().toISOString() };
            localStorage.setItem('prodomo_documentation', JSON.stringify(docs));
            return true;
          }
        }
        
        setError('Failed to update documentation');
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error updating documentation:', err);
      setError('Failed to update documentation');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteDocumentation = async (docId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('documentation')
        .delete()
        .eq('id', docId);

      if (error) {
        console.error('Error deleting documentation from Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_documentation');
        if (stored) {
          const docs = JSON.parse(stored);
          const filteredDocs = docs.filter((d: Documentation) => d.id !== docId);
          localStorage.setItem('prodomo_documentation', JSON.stringify(filteredDocs));
          return true;
        }
        
        setError('Failed to delete documentation');
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting documentation:', err);
      setError('Failed to delete documentation');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Bug reports management
  const getBugReports = async (): Promise<BugReport[]> => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('bug_reports')
        .select('*')
        .order('created_at', { ascending: false });
      
      if (error) {
        console.error('Failed to fetch bug reports from Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_bug_reports');
        if (stored) {
          return JSON.parse(stored);
        }
        
        return [];
      }
      
      return data || [];
    } catch (error) {
      console.error('Error fetching bug reports:', error);
      
      // Fallback to localStorage
      const stored = localStorage.getItem('prodomo_bug_reports');
      if (stored) {
        return JSON.parse(stored);
      }
      
      return [];
    } finally {
      setLoading(false);
    }
  };

  const createBugReport = async (bugData: Omit<BugReport, 'id' | 'created_at' | 'updated_at'>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      // First check if the user exists in the database
      if (bugData.reporter_id) {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id')
          .eq('id', bugData.reporter_id);
        
        if (userError || !userData || userData.length === 0) {
          console.error('User does not exist in database, cannot create bug report:', bugData.reporter_id);
          
          // Fallback to localStorage only
          const stored = localStorage.getItem('prodomo_bug_reports');
          const reports = stored ? JSON.parse(stored) : [];
          const newReport = {
            ...bugData,
            id: crypto.randomUUID(),
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          };
          reports.push(newReport);
          localStorage.setItem('prodomo_bug_reports', JSON.stringify(reports));
          
          return true;
        }
      }
      
      // Make sure the field names match the database column names
      const formattedData = {
        title: bugData.title,
        description: bugData.description,
        severity: bugData.severity,
        category: bugData.category,
        status: bugData.status,
        reporter_id: bugData.reporter_id,
        reporter_name: bugData.reporter_name,
        steps: bugData.steps,
        expected_behavior: bugData.expected_behavior,
        actual_behavior: bugData.actual_behavior,
        environment: bugData.environment,
        attachments: bugData.attachments,
        comments: bugData.comments || []
      };

      const { error } = await supabase
        .from('bug_reports')
        .insert([formattedData]);

      if (error) {
        console.error('Error creating bug report in Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_bug_reports');
        const reports = stored ? JSON.parse(stored) : [];
        const newReport = {
          ...formattedData,
          id: crypto.randomUUID(),
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        reports.push(newReport);
        localStorage.setItem('prodomo_bug_reports', JSON.stringify(reports));
        
        return true;
      }
      
      return true;
    } catch (err) {
      console.error('Error creating bug report:', err);
      setError('Failed to create bug report');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const updateBugReport = async (bugId: string, updates: Partial<BugReport>): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('bug_reports')
        .update({ ...updates, updated_at: new Date().toISOString() })
        .eq('id', bugId);

      if (error) {
        console.error('Error updating bug report in Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_bug_reports');
        if (stored) {
          const reports = JSON.parse(stored);
          const reportIndex = reports.findIndex((r: BugReport) => r.id === bugId);
          
          if (reportIndex !== -1) {
            reports[reportIndex] = { ...reports[reportIndex], ...updates, updated_at: new Date().toISOString() };
            localStorage.setItem('prodomo_bug_reports', JSON.stringify(reports));
            return true;
          }
        }
        
        setError('Failed to update bug report');
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error updating bug report:', err);
      setError('Failed to update bug report');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteBugReport = async (bugId: string): Promise<boolean> => {
    setLoading(true);
    setError(null);

    try {
      const { error } = await supabase
        .from('bug_reports')
        .delete()
        .eq('id', bugId);

      if (error) {
        console.error('Error deleting bug report from Supabase:', error);
        
        // Fallback to localStorage
        const stored = localStorage.getItem('prodomo_bug_reports');
        if (stored) {
          const reports = JSON.parse(stored);
          const filteredReports = reports.filter((r: BugReport) => r.id !== bugId);
          localStorage.setItem('prodomo_bug_reports', JSON.stringify(filteredReports));
          return true;
        }
        
        setError('Failed to delete bug report');
        return false;
      }
      
      return true;
    } catch (err) {
      console.error('Error deleting bug report:', err);
      setError('Failed to delete bug report');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // System metrics
  const getSystemMetrics = async (metricType?: string, days: number = 30): Promise<SystemMetric[]> => {
    try {
      setLoading(true);
      let query = supabase
        .from('system_metrics')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(days);
      
      if (metricType) {
        query = query.eq('metric_type', metricType);
      }

      const { data, error } = await query;
      
      if (error) {
        console.error('Failed to fetch system metrics from Supabase:', error);
        // Return mock metrics if no data available
        return generateMockMetrics(metricType, days);
      }
      
      if (data && data.length > 0) {
        return data;
      } else {
        // Return mock metrics if no data available
        return generateMockMetrics(metricType, days);
      }
    } catch (error) {
      console.error('Error fetching system metrics:', error);
      // Return mock metrics
      return generateMockMetrics(metricType, days);
    } finally {
      setLoading(false);
    }
  };

  // Generate mock metrics for demo purposes
  const generateMockMetrics = (metricType?: string, days: number = 30): SystemMetric[] => {
    const metrics: SystemMetric[] = [];
    const types = metricType ? [metricType] : ['downloads', 'users', 'storage', 'bandwidth'];
    
    for (const type of types) {
      for (let i = 0; i < days; i++) {
        const date = new Date();
        date.setDate(date.getDate() - i);
        
        let value: number;
        switch (type) {
          case 'downloads':
            value = 1000 + Math.floor(Math.random() * 1000);
            break;
          case 'users':
            value = 40 + Math.floor(Math.random() * 20);
            break;
          case 'storage':
            value = 1500 + Math.floor(Math.random() * 1000);
            break;
          case 'bandwidth':
            value = 800 + Math.floor(Math.random() * 500);
            break;
          default:
            value = Math.floor(Math.random() * 1000);
        }
        
        metrics.push({
          id: crypto.randomUUID(),
          metric_type: type as 'downloads' | 'users' | 'storage' | 'bandwidth',
          value,
          date: date.toISOString().split('T')[0],
          created_at: date.toISOString()
        });
      }
    }
    
    return metrics;
  };

  // File requirements management
  const getFileRequirements = (): FileRequirement[] => {
    // This would ideally come from Supabase, but for demo purposes we'll use hardcoded values
    return [
      { id: '1', label: 'Operating System', value: 'FreeBSD 12.0+' },
      { id: '2', label: 'Memory', value: '4 GB RAM' },
      { id: '3', label: 'Storage', value: '10 GB available space' },
      { id: '4', label: 'Network', value: 'Broadband connection' },
      { id: '5', label: 'Processor', value: 'x64 compatible' }
    ];
  };

  const updateFileRequirements = (requirements: FileRequirement[]): boolean => {
    // This would ideally update Supabase, but for demo purposes we'll just return true
    return true;
  };

  return {
    loading,
    error,
    setError,
    dbInitialized,
    initializeCleanData,
    
    // User management
    getUsers,
    updateUser,
    updateUserGrade,
    updateUserNotes,
    blockUser,
    unblockUser,
    createUser,
    deleteUser,
    getUserPassword,
    
    // File management
    getServerFiles,
    createServerFile,
    updateServerFile,
    deleteServerFile,
    uploadFile,
    
    // Patch notes
    getPatchNotes,
    createPatchNote,
    updatePatchNote,
    deletePatchNote,
    
    // Logging
    logActivity,
    getActivityLogs,
    logDownload,
    getDownloadLogs,
    
    // Documentation
    getDocumentation,
    createDocumentation,
    updateDocumentation,
    deleteDocumentation,
    
    // Bug reports
    getBugReports,
    createBugReport,
    updateBugReport,
    deleteBugReport,
    
    // System metrics
    getSystemMetrics,
    
    // File requirements
    getFileRequirements,
    updateFileRequirements
  };
};