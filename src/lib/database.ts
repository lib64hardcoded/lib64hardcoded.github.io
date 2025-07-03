import mysql from 'mysql2/promise';

// Database configuration
const DB_CONFIG = {
  host: import.meta.env.VITE_DB_HOST || 'localhost',
  port: parseInt(import.meta.env.VITE_DB_PORT || '3306'),
  user: import.meta.env.VITE_DB_USER || 'root',
  password: import.meta.env.VITE_DB_PASSWORD || '',
  database: import.meta.env.VITE_DB_NAME || 'prodomo_dashboard',
  charset: 'utf8mb4',
  timezone: '+00:00'
};

// Connection pool
let pool: mysql.Pool | null = null;

// Initialize database connection
export const initializeDatabase = async (): Promise<boolean> => {
  try {
    // Check if we have database configuration
    const hasDBConfig = import.meta.env.VITE_DB_HOST && 
                       import.meta.env.VITE_DB_HOST !== 'localhost' ||
                       import.meta.env.VITE_DB_USER !== 'root';

    if (!hasDBConfig) {
      console.log('No database configuration found, using localStorage');
      return false;
    }

    pool = mysql.createPool({
      ...DB_CONFIG,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      acquireTimeout: 60000,
      timeout: 60000
    });

    // Test connection
    const connection = await pool.getConnection();
    await connection.ping();
    connection.release();

    console.log('✅ Database connection established');
    return true;
  } catch (error) {
    console.error('❌ Database connection failed:', error);
    pool = null;
    return false;
  }
};

// Check if database is available
export const isDatabaseAvailable = (): boolean => {
  return pool !== null;
};

// Get database connection
export const getConnection = async (): Promise<mysql.PoolConnection | null> => {
  if (!pool) return null;
  
  try {
    return await pool.getConnection();
  } catch (error) {
    console.error('Failed to get database connection:', error);
    return null;
  }
};

// Execute query with error handling
export const executeQuery = async (
  query: string, 
  params: any[] = []
): Promise<{ success: boolean; data?: any; error?: string }> => {
  if (!pool) {
    return { success: false, error: 'Database not available' };
  }

  let connection: mysql.PoolConnection | null = null;
  
  try {
    connection = await pool.getConnection();
    const [results] = await connection.execute(query, params);
    return { success: true, data: results };
  } catch (error) {
    console.error('Database query error:', error);
    return { 
      success: false, 
      error: error instanceof Error ? error.message : 'Database error' 
    };
  } finally {
    if (connection) {
      connection.release();
    }
  }
};

// Hash password (simple implementation - use bcrypt in production)
export const hashPassword = (password: string): string => {
  // In production, use bcrypt or similar
  return require('crypto').createHash('sha256').update(password).digest('hex');
};

// Verify password
export const verifyPassword = (password: string, hash: string): boolean => {
  return hashPassword(password) === hash;
};

// Generate UUID
export const generateUUID = (): string => {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
};

// Close database connection
export const closeDatabase = async (): Promise<void> => {
  if (pool) {
    await pool.end();
    pool = null;
    console.log('Database connection closed');
  }
};

// Database types
export interface User {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  grade: 'Guest' | 'V4' | 'V5' | 'Admin';
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
  min_grade: 'Guest' | 'V4' | 'V5' | 'Admin';
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
    content: string;
    created_at: string;
  }>;
  created_at: string;
  updated_at: string;
}