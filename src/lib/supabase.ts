import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

console.log('Supabase URL:', supabaseUrl);
console.log('Supabase Key exists:', !!supabaseAnonKey);

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false
  }
});

// Check if we're using Supabase
export const isUsingSupabase = () => true;

// Initialize database with sample data
export const initializeDatabase = async () => {
  try {
    console.log('Checking Supabase database...');
    
    // Check if users table exists and has data
    const { data: existingUsers, error: userError } = await supabase
      .from('users')
      .select('id')
      .limit(1);

    if (userError) {
      console.error('Error checking users table:', userError);
      return false;
    }

    // If we have users, database is already initialized
    if (existingUsers && existingUsers.length > 0) {
      console.log('Database already has data');
      return true;
    }

    console.log('Database needs initialization, creating sample data...');

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

    const { error: insertError } = await supabase
      .from('users')
      .insert(defaultUsers);

    if (insertError) {
      console.error('Error inserting default users:', insertError);
      return false;
    }

    console.log('✅ Database initialized with default users');
    return true;

  } catch (error) {
    console.error('Failed to initialize database:', error);
    return false;
  }
};

// Database types
export interface User {
  id: string;
  name: string;
  email: string;
  grade: 'Guest' | 'V4' | 'V5' | 'Support' | 'Admin';
  join_date: string;
  last_active: string;
  total_downloads: number;
  is_guest?: boolean;
  guest_expires_at?: string;
  is_blocked?: boolean;
  blocked_until?: string;
  admin_notes?: string;
  created_at: string;
  updated_at: string;
}

export interface ServerFile {
  id: string;
  name: string;
  version: string;
  description: string;
  file_url: string;
  file_size: number;
  file_type: 'server' | 'plugin' | 'archive' | 'documentation';
  min_grade: 'Guest' | 'V4' | 'V5' | 'Support' | 'Admin';
  status: 'active' | 'deprecated' | 'beta';
  download_count: number;
  changelog: string[];
  created_by: string;
  created_at: string;
  updated_at: string;
}

export interface PatchNote {
  id: string;
  version: string;
  title: string;
  content: string;
  status: 'draft' | 'published';
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export interface DownloadLog {
  id: string;
  user_id: string;
  user_name: string;
  file_id: string;
  file_name: string;
  file_version: string;
  ip_address: string;
  user_agent: string;
  created_at: string;
}

export interface ActivityLog {
  id: string;
  user_id: string;
  user_name: string;
  action: string;
  details: string;
  ip_address: string;
  created_at: string;
}

export interface SystemMetric {
  id: string;
  metric_type: 'downloads' | 'users' | 'storage' | 'bandwidth';
  value: number;
  date: string;
  created_at: string;
}

export interface Documentation {
  id: string;
  title: string;
  slug: string;
  content: string;
  category: 'info' | 'pricing' | 'about' | 'tos' | 'changelog' | 'partners' | 'features' | 'installation' | 'api' | 'troubleshooting';
  version_type: 'v4' | 'v5' | 'general';
  status: 'draft' | 'published';
  order_index: number;
  meta_description?: string;
  tags: string[];
  images: string[];
  author_id: string;
  author_name: string;
  created_at: string;
  updated_at: string;
}

export interface BugReport {
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