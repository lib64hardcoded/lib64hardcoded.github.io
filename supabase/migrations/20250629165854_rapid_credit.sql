-- This migration creates public policies for all tables to allow the demo to work without authentication issues

-- For users table
DROP POLICY IF EXISTS "Allow public access for demo" ON users;
CREATE POLICY "Allow public access for demo" ON users
  FOR SELECT
  USING (true);

-- For activity_logs table
DROP POLICY IF EXISTS "Allow public access for demo" ON activity_logs;
CREATE POLICY "Allow public access for demo" ON activity_logs
  FOR SELECT
  USING (true);

-- For download_logs table
DROP POLICY IF EXISTS "Allow public access for demo" ON download_logs;
CREATE POLICY "Allow public access for demo" ON download_logs
  FOR SELECT
  USING (true);

-- For patch_notes table
DROP POLICY IF EXISTS "Allow public access for demo" ON patch_notes;
CREATE POLICY "Allow public access for demo" ON patch_notes
  FOR SELECT
  USING (true);

-- For server_files table
DROP POLICY IF EXISTS "Allow public access for demo" ON server_files;
CREATE POLICY "Allow public access for demo" ON server_files
  FOR SELECT
  USING (true);

-- For documentation table
DROP POLICY IF EXISTS "Allow public access for demo" ON documentation;
CREATE POLICY "Allow public access for demo" ON documentation
  FOR SELECT
  USING (true);

-- For bug_reports table
DROP POLICY IF EXISTS "Allow public access for demo" ON bug_reports;
CREATE POLICY "Allow public access for demo" ON bug_reports
  FOR SELECT
  USING (true);

-- For system_metrics table
DROP POLICY IF EXISTS "Allow public access for demo" ON system_metrics;
CREATE POLICY "Allow public access for demo" ON system_metrics
  FOR SELECT
  USING (true);

-- Fix insert policies for activity logs
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON activity_logs;
CREATE POLICY "Users can insert their own activity logs" ON activity_logs
  FOR INSERT
  WITH CHECK (true);

-- Fix insert policies for download logs
DROP POLICY IF EXISTS "Users can insert their own download logs" ON download_logs;
CREATE POLICY "Users can insert their own download logs" ON download_logs
  FOR INSERT
  WITH CHECK (true);

-- Fix insert policies for bug reports
DROP POLICY IF EXISTS "Users can insert bug reports" ON bug_reports;
CREATE POLICY "Users can insert bug reports" ON bug_reports
  FOR INSERT
  WITH CHECK (true);

-- Create demo users for authentication
INSERT INTO auth.users (id, email, email_confirmed_at, created_at, updated_at)
VALUES 
  ('11111111-1111-1111-1111-111111111111', 'admin@prodomo.local', now(), now(), now()),
  ('22222222-2222-2222-2222-222222222222', 'v4@prodomo.local', now(), now(), now()),
  ('33333333-3333-3333-3333-333333333333', 'v5@prodomo.local', now(), now(), now())
ON CONFLICT (id) DO NOTHING;

-- Insert demo users into users table
INSERT INTO users (id, name, email, grade, join_date, last_active, total_downloads, is_guest, is_blocked, admin_notes)
VALUES 
  (
    '11111111-1111-1111-1111-111111111111',
    'Admin User',
    'admin@prodomo.local',
    'Admin',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    0,
    false,
    false,
    'System administrator account'
  ),
  (
    '22222222-2222-2222-2222-222222222222',
    'V4 User',
    'v4@prodomo.local',
    'V4',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    5,
    false,
    false,
    'Standard V4 user account'
  ),
  (
    '33333333-3333-3333-3333-333333333333',
    'V5 User',
    'v5@prodomo.local',
    'V5',
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP,
    12,
    false,
    false,
    'Advanced V5 user account'
  )
ON CONFLICT (id) DO NOTHING;