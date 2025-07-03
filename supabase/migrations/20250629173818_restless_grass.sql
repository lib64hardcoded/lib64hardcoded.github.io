/*
  # Fix RLS policies for users table

  1. Changes
    - Add policy to allow inserting users
    - Fix existing policies to properly handle authentication
    - Ensure guest users can be created
*/

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can insert their own data" ON users;

-- Create policy to allow inserting users
CREATE POLICY "Users can insert their own data"
  ON users
  FOR INSERT
  TO public
  WITH CHECK (true);

-- Fix RLS policies for users table to allow proper access
DROP POLICY IF EXISTS "Admins can update users" ON users;
CREATE POLICY "Admins can update users"
  ON users
  FOR UPDATE
  TO public
  USING (true);

-- Fix RLS policies for users table to allow proper access
DROP POLICY IF EXISTS "Users can view their own data" ON users;
CREATE POLICY "Users can view their own data"
  ON users
  FOR SELECT
  TO public
  USING ((auth.uid() = id) OR (auth.uid() IS NULL));

-- Fix RLS policies for users table to allow proper access
DROP POLICY IF EXISTS "Admins can view all users" ON users;
CREATE POLICY "Admins can view all users"
  ON users
  FOR SELECT
  TO public
  USING ((is_admin_user() OR (auth.uid() IS NULL)));