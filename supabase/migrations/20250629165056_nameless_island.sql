/*
  # Create public policies for demo access

  This migration adds public access policies to all tables to allow the demo to work
  without requiring authentication. In a production environment, you would use
  proper authentication and more restrictive policies.
*/

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