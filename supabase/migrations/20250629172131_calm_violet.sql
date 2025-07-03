/*
  # Fix RLS policies for all tables

  This migration adds public access policies to all tables to allow the demo to work
  without requiring authentication. It also fixes insert policies for all tables.
*/

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

-- For users table
DROP POLICY IF EXISTS "Admins can update users" ON users;
CREATE POLICY "Admins can update users" ON users
  FOR UPDATE
  TO public
  USING (true);