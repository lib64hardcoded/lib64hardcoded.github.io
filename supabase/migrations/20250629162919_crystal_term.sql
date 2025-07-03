-- This migration fixes authentication and database access issues

-- Add public access policies for demo purposes
-- These policies allow access without authentication for demo purposes

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

-- Insert demo users if they don't already exist
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

-- Create helper function for updating timestamps
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create update triggers for tables
DROP TRIGGER IF EXISTS update_users_updated_at ON users;
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_server_files_updated_at ON server_files;
CREATE TRIGGER update_server_files_updated_at
BEFORE UPDATE ON server_files
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_patch_notes_updated_at ON patch_notes;
CREATE TRIGGER update_patch_notes_updated_at
BEFORE UPDATE ON patch_notes
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_documentation_updated_at ON documentation;
CREATE TRIGGER update_documentation_updated_at
BEFORE UPDATE ON documentation
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

DROP TRIGGER IF EXISTS update_bug_reports_updated_at ON bug_reports;
CREATE TRIGGER update_bug_reports_updated_at
BEFORE UPDATE ON bug_reports
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();