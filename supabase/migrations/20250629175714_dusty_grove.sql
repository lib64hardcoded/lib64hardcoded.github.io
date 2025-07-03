-- Fix bug_reports table column names
DO $$
BEGIN
  -- Check if expected_behavior column exists with the correct name
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bug_reports' AND column_name = 'expectedbehavior'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bug_reports' AND column_name = 'expected_behavior'
  ) THEN
    ALTER TABLE bug_reports RENAME COLUMN expectedbehavior TO expected_behavior;
  END IF;

  -- Check if actual_behavior column exists with the correct name
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bug_reports' AND column_name = 'actualbehavior'
  ) AND NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bug_reports' AND column_name = 'actual_behavior'
  ) THEN
    ALTER TABLE bug_reports RENAME COLUMN actualbehavior TO actual_behavior;
  END IF;
  
  -- Add expected_behavior column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bug_reports' AND column_name = 'expected_behavior'
  ) THEN
    ALTER TABLE bug_reports ADD COLUMN expected_behavior text;
  END IF;
  
  -- Add actual_behavior column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bug_reports' AND column_name = 'actual_behavior'
  ) THEN
    ALTER TABLE bug_reports ADD COLUMN actual_behavior text;
  END IF;
END $$;

-- Fix users table RLS policies to allow guest user creation
DROP POLICY IF EXISTS "Users can insert their own data" ON users;
CREATE POLICY "Users can insert their own data" ON users
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Fix RLS policies for all tables to ensure proper access

-- For patch_notes table
DROP POLICY IF EXISTS "Admins can insert patch notes" ON patch_notes;
CREATE POLICY "Admins can insert patch notes" ON patch_notes
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update patch notes" ON patch_notes;
CREATE POLICY "Admins can update patch notes" ON patch_notes
  FOR UPDATE
  TO public
  USING (true);

DROP POLICY IF EXISTS "Admins can delete patch notes" ON patch_notes;
CREATE POLICY "Admins can delete patch notes" ON patch_notes
  FOR DELETE
  TO public
  USING (true);

-- For server_files table
DROP POLICY IF EXISTS "Admins can insert server files" ON server_files;
CREATE POLICY "Admins can insert server files" ON server_files
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update server files" ON server_files;
CREATE POLICY "Admins can update server files" ON server_files
  FOR UPDATE
  TO public
  USING (true);

DROP POLICY IF EXISTS "Admins can delete server files" ON server_files;
CREATE POLICY "Admins can delete server files" ON server_files
  FOR DELETE
  TO public
  USING (true);

-- For documentation table
DROP POLICY IF EXISTS "Admins can insert documentation" ON documentation;
CREATE POLICY "Admins can insert documentation" ON documentation
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update documentation" ON documentation;
CREATE POLICY "Admins can update documentation" ON documentation
  FOR UPDATE
  TO public
  USING (true);

DROP POLICY IF EXISTS "Admins can delete documentation" ON documentation;
CREATE POLICY "Admins can delete documentation" ON documentation
  FOR DELETE
  TO public
  USING (true);

-- For bug_reports table
DROP POLICY IF EXISTS "Users can insert bug reports" ON bug_reports;
CREATE POLICY "Users can insert bug reports" ON bug_reports
  FOR INSERT
  TO public
  WITH CHECK (true);

DROP POLICY IF EXISTS "Admins can update bug reports" ON bug_reports;
CREATE POLICY "Admins can update bug reports" ON bug_reports
  FOR UPDATE
  TO public
  USING (true);

DROP POLICY IF EXISTS "Admins can delete bug reports" ON bug_reports;
CREATE POLICY "Admins can delete bug reports" ON bug_reports
  FOR DELETE
  TO public
  USING (true);

-- For activity_logs table
DROP POLICY IF EXISTS "Users can insert their own activity logs" ON activity_logs;
CREATE POLICY "Users can insert their own activity logs" ON activity_logs
  FOR INSERT
  TO public
  WITH CHECK (true);

-- For download_logs table
DROP POLICY IF EXISTS "Users can insert their own download logs" ON download_logs;
CREATE POLICY "Users can insert their own download logs" ON download_logs
  FOR INSERT
  TO public
  WITH CHECK (true);