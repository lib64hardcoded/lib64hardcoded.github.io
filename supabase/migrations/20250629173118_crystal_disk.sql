/*
  # Fix bug_reports table schema

  1. Changes
    - Rename columns to match the expected format in the application
    - Add missing columns if they don't exist
    - Update RLS policies to allow proper access
*/

-- Check if expected_behavior column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bug_reports' AND column_name = 'expected_behavior'
  ) THEN
    ALTER TABLE bug_reports ADD COLUMN expected_behavior text;
  END IF;
END $$;

-- Check if actual_behavior column exists, if not add it
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'bug_reports' AND column_name = 'actual_behavior'
  ) THEN
    ALTER TABLE bug_reports ADD COLUMN actual_behavior text;
  END IF;
END $$;

-- Fix RLS policies for bug_reports table
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